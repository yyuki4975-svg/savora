// The subset of System.Uri the offline tools rely on: Uri.TryCreate(value, UriKind.Absolute)
// followed by a Scheme == "https" check, and then AbsoluteUri, Host, AbsolutePath, Query,
// Fragment and UserInfo. Only https URLs are modelled; anything else reports `https: false`,
// which is all the tools need to know (they reject every other scheme).
//
// Conformance: test/conformance/dotnet-uri.json (every URL-like string in the repository's
// packages plus crafted edge cases, answered by .NET 10). WHATWG URL parsing agrees with .NET
// on every real package URL but differs on edge cases (IDN hosts, stray '%', control
// characters, IPv4 forms, "https:host"), so this is a dedicated parser.
import { domainToASCII, domainToUnicode } from "node:url";

export interface HttpsUriFacts {
  readonly https: true;
  readonly absoluteUri: string;
  readonly host: string;
  readonly port: number;
  readonly absolutePath: string;
  readonly query: string;
  readonly fragment: string;
  readonly userInfo: string;
}

export type UriFacts = HttpsUriFacts | { readonly https: false };

const NOT_HTTPS: UriFacts = { https: false };
const UNRESERVED = /^[A-Za-z0-9\-._~]$/;
// Printable ASCII kept as-is in path, query and fragment ('%' is handled separately).
const KEPT = /^[A-Za-z0-9\-._~!$&'()*+,;=:@/?#[\]]$/;
const HEX2 = /^[0-9A-Fa-f]{2}$/;
const utf8 = new TextDecoder("utf-8", { fatal: true });

function percentEncode(text: string): string {
  return [...Buffer.from(text, "utf8")].map((byte) => `%${byte.toString(16).toUpperCase().padStart(2, "0")}`).join("");
}

/**
 * Escapes a path, query or fragment component as .NET's IRI-aware Uri does:
 * unreserved %XX escapes are decoded, other ASCII escapes are kept verbatim,
 * escapes forming valid UTF-8 are re-emitted in upper case, invalid ones are kept,
 * a '%' that does not start an escape becomes %25, and characters outside the
 * kept set (space, controls, "<>`{}|^ and non-ASCII) are UTF-8 percent-encoded.
 */
function escapeComponent(component: string): string {
  let result = "";
  let index = 0;
  while (index < component.length) {
    const character = component[index]!;
    if (character === "%") {
      const hex = component.slice(index + 1, index + 3);
      if (!HEX2.test(hex)) {
        result += "%25";
        index++;
        continue;
      }
      const byte = parseInt(hex, 16);
      if (byte < 0x80) {
        const decoded = String.fromCharCode(byte);
        result += UNRESERVED.test(decoded) ? decoded : component.slice(index, index + 3);
        index += 3;
        continue;
      }
      // A run of high-byte escapes: valid UTF-8 sequences are normalised, the rest kept.
      const run: Array<{ text: string; byte: number }> = [];
      let cursor = index;
      while (component[cursor] === "%" && HEX2.test(component.slice(cursor + 1, cursor + 3))) {
        const runByte = parseInt(component.slice(cursor + 1, cursor + 3), 16);
        if (runByte < 0x80) break;
        run.push({ text: component.slice(cursor, cursor + 3), byte: runByte });
        cursor += 3;
      }
      let position = 0;
      while (position < run.length) {
        const lead = run[position]!.byte;
        const length = lead >= 0xf0 && lead <= 0xf4 ? 4 : lead >= 0xe0 ? 3 : lead >= 0xc2 && lead <= 0xdf ? 2 : 0;
        let valid = false;
        if (length > 0 && position + length <= run.length) {
          try {
            utf8.decode(Uint8Array.from(run.slice(position, position + length).map((entry) => entry.byte)));
            valid = true;
          } catch {
            valid = false;
          }
        }
        if (valid) {
          result += run.slice(position, position + length).map((entry) => entry.text.toUpperCase()).join("");
          position += length;
        } else {
          result += run[position]!.text;
          position++;
        }
      }
      index = cursor;
      continue;
    }
    const codePoint = component.codePointAt(index)!;
    const whole = String.fromCodePoint(codePoint);
    result += codePoint < 0x80 && KEPT.test(whole) ? whole : percentEncode(whole);
    index += whole.length;
  }
  return result;
}

/** RFC 3986 remove_dot_segments on an already-escaped path. */
function removeDotSegments(path: string): string {
  const output: string[] = [];
  const segments = path.split("/");
  for (let index = 1; index < segments.length; index++) {
    const segment = segments[index]!;
    const last = index === segments.length - 1;
    if (segment === ".") {
      if (last) output.push("");
    } else if (segment === "..") {
      if (output.length > 0) output.pop();
      if (last) output.push("");
    } else {
      output.push(segment);
    }
  }
  return `/${output.join("/")}`;
}

/** inet_aton-style IPv4 (decimal, 0x hex, leading-0 octal; 1 to 4 parts) as IPAddress parsing accepts. */
function parseLenientIpv4(host: string): string | undefined {
  const parts = host.split(".");
  if (parts.length > 4 || parts.some((part) => part.length === 0)) return undefined;
  const values: number[] = [];
  for (const part of parts) {
    let value: number;
    if (/^0[xX][0-9a-fA-F]*$/.test(part)) value = part.length === 2 ? 0 : parseInt(part.slice(2), 16);
    else if (/^0[0-7]+$/.test(part)) value = parseInt(part, 8);
    else if (/^[0-9]+$/.test(part)) value = Number(part);
    else return undefined;
    values.push(value);
  }
  const limits = [0, 0xffffffff, 0xffffff, 0xffff, 0xff];
  for (let index = 0; index < values.length - 1; index++) if (values[index]! > 0xff) return undefined;
  if (values[values.length - 1]! > limits[values.length]!) return undefined;
  let address = 0;
  for (let index = 0; index < values.length - 1; index++) address += values[index]! * 2 ** (8 * (3 - index));
  address += values[values.length - 1]!;
  return [24, 16, 8, 0].map((shift) => Math.floor(address / 2 ** shift) % 256).join(".");
}

/** Canonical IPv6 text as .NET prints it (scope ID dropped, embedded IPv4 kept dotted). */
function canonicalIpv6(text: string): string | undefined {
  const withoutScope = text.replace(/%25.*$|%.*$/, "");
  let head = withoutScope;
  let ipv4Tail: string | undefined;
  const dotted = /^(.*:)(\d+\.\d+\.\d+\.\d+)$/.exec(withoutScope);
  if (dotted) {
    head = `${dotted[1]}0:0`;
    ipv4Tail = dotted[2];
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(ipv4Tail) || ipv4Tail.split(".").some((part) => Number(part) > 255)) return undefined;
  }
  const halves = head.split("::");
  if (halves.length > 2) return undefined;
  const parse = (part: string) => (part === "" ? [] : part.split(":"));
  const left = parse(halves[0]!);
  const right = halves.length === 2 ? parse(halves[1]!) : [];
  const groups = halves.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right] : left;
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-fA-F]{1,4}$/.test(group))) return undefined;
  const numbers = groups.map((group) => parseInt(group, 16));
  if (ipv4Tail !== undefined) {
    const prefix = compress(numbers.slice(0, 6).map((value) => value.toString(16)));
    return prefix.endsWith(":") ? `${prefix}${ipv4Tail}` : `${prefix}:${ipv4Tail}`;
  }
  return compress(numbers.map((value) => value.toString(16)));
}

function compress(groups: string[]): string {
  let bestStart = -1;
  let bestLength = 0;
  for (let start = 0; start < groups.length; start++) {
    let length = 0;
    while (start + length < groups.length && groups[start + length] === "0") length++;
    if (length > bestLength && length >= 2) {
      bestStart = start;
      bestLength = length;
    }
  }
  if (bestStart < 0) return groups.join(":");
  return `${groups.slice(0, bestStart).join(":")}::${groups.slice(bestStart + bestLength).join(":")}`;
}

/** Registered-name host rules: no empty labels, no space/control/'%'/'\\'; IDNs kept in Unicode form. */
function canonicalRegisteredName(host: string): string | undefined {
  if (host.length === 0) return undefined;
  if (/[\u0000- %\\<>"^`{|}\u007f]/.test(host)) return undefined;
  const labels = host.endsWith(".") ? host.slice(0, -1).split(".") : host.split(".");
  if (labels.some((label) => label.length === 0)) return undefined;
  if (/^[\u0000-\u007f]*$/.test(host)) return host.toLowerCase();
  const ascii = domainToASCII(host);
  if (ascii !== "" && ascii.split(".").some((label) => label.startsWith("xn--"))) {
    const unicode = domainToUnicode(ascii);
    return host.endsWith(".") && !unicode.endsWith(".") ? `${unicode}.` : unicode;
  }
  return host;
}

/** Uri.TryCreate(value, UriKind.Absolute, out uri) && uri.Scheme == "https", with the facts the tools read. */
export function httpsUriFacts(value: string | null | undefined): UriFacts {
  if (value == null) return NOT_HTTPS;
  // Uri trims ASCII white space only (not controls such as U+0000, nor NBSP, U+3000, NEL).
  const text = value.replace(/^[\t\n\v\f\r ]+|[\t\n\v\f\r ]+$/g, "");
  const scheme = /^https:\/\//i.exec(text);
  if (!scheme) return NOT_HTTPS;
  const rest = text.slice(scheme[0].length);

  const authorityEnd = rest.search(/[/?#]/);
  const authority = authorityEnd < 0 ? rest : rest.slice(0, authorityEnd);
  let remainder = authorityEnd < 0 ? "" : rest.slice(authorityEnd);
  if (authority.length === 0 || authority.includes("\\")) return NOT_HTTPS;

  const at = authority.lastIndexOf("@");
  const rawUserInfo = at >= 0 ? authority.slice(0, at) : undefined;
  const hostPort = at >= 0 ? authority.slice(at + 1) : authority;

  let hostText = hostPort;
  let portText: string | undefined;
  if (hostPort.startsWith("[")) {
    const close = hostPort.indexOf("]");
    if (close < 0) return NOT_HTTPS;
    hostText = hostPort.slice(0, close + 1);
    const after = hostPort.slice(close + 1);
    if (after.length > 0) {
      if (!after.startsWith(":")) return NOT_HTTPS;
      portText = after.slice(1);
    }
  } else {
    const colon = hostPort.lastIndexOf(":");
    if (colon >= 0) {
      hostText = hostPort.slice(0, colon);
      portText = hostPort.slice(colon + 1);
    }
  }

  let port = 443;
  if (portText !== undefined && portText.length > 0) {
    if (!/^[0-9]+$/.test(portText)) return NOT_HTTPS;
    port = Number(portText);
    if (port > 65535) return NOT_HTTPS;
  }

  let host: string | undefined;
  if (hostText.startsWith("[")) {
    const ipv6 = canonicalIpv6(hostText.slice(1, -1));
    host = ipv6 === undefined ? undefined : `[${ipv6}]`;
  } else {
    host = /^[0-9a-fA-FxX.]+$/.test(hostText) ? (parseLenientIpv4(hostText) ?? canonicalRegisteredName(hostText)) : canonicalRegisteredName(hostText);
  }
  if (host === undefined) return NOT_HTTPS;

  let fragment = "";
  const hash = remainder.indexOf("#");
  if (hash >= 0) {
    fragment = `#${escapeComponent(remainder.slice(hash + 1))}`;
    remainder = remainder.slice(0, hash);
  }
  let query = "";
  const question = remainder.indexOf("?");
  if (question >= 0) {
    query = `?${escapeComponent(remainder.slice(question + 1))}`;
    remainder = remainder.slice(0, question);
  }
  const rawPath = remainder.length === 0 ? "/" : remainder.replaceAll("\\", "/");
  const absolutePath = removeDotSegments(escapeComponent(rawPath));

  const userInfo = rawUserInfo === undefined ? "" : escapeComponent(rawUserInfo);
  const absoluteUri =
    `https://${rawUserInfo === undefined ? "" : `${userInfo}@`}${host}${port === 443 ? "" : `:${port}`}` +
    `${absolutePath}${query}${fragment}`;
  return { https: true, absoluteUri, host, port, absolutePath, query, fragment, userInfo };
}
