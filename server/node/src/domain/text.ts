// Ports Savora.Domain.Common.DomainText, the API-boundary patterns and the .NET
// string primitives they depend on (Trim, IsNullOrWhiteSpace, ToLower/UpperInvariant).
// test/conformance/dotnet-text.json holds the .NET 10 answers for every BMP code unit.
import { argumentException, argumentOutOfRangeException, throwIfNullOrWhiteSpace } from "./dotnet/errors";

// .NET's `$` anchor also matches immediately before a final "\n", so the
// C# patterns accept e.g. "en\n". The optional "\n?" keeps that behaviour.
export const LOCALE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z]{2})?\n?$/;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\n?$/;

// char.IsWhiteSpace / string.Trim use Unicode White_Space. JavaScript's trim
// uses WhiteSpace + LineTerminator: the same set except that .NET includes
// U+0085 (NEL) and excludes U+FEFF (BOM).
const NEL = "\u0085";
const BOM = "\uFEFF";

export function dotnetTrim(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && isDotnetWhiteSpace(value[start]!)) start++;
  while (end > start && isDotnetWhiteSpace(value[end - 1]!)) end--;
  return value.slice(start, end);
}

export function isNullOrWhiteSpace(value: string | null | undefined): boolean {
  return value == null || dotnetTrim(value).length === 0;
}

function isDotnetWhiteSpace(character: string): boolean {
  return character === NEL || (character.trim() === "" && character !== BOM);
}

// .NET invariant casing is a 1:1 (simple) mapping. JavaScript's full mapping can expand
// (e.g. "İ".toLowerCase() is two code units), and a few code points differ because of
// Unicode version or title-case handling; those keep their own value in .NET.
const LOWER_IDENTITY = new Set([0x1c89, 0xa7cb, 0xa7cc, 0xa7ce, 0xa7d2, 0xa7d4, 0xa7da, 0xa7dc]);
const UPPER_IDENTITY = new Set([0x131, 0x19b, 0x264, 0x1c8a, 0xa7cd, 0xa7cf, 0xa7d3, 0xa7d5, 0xa7db]);
// Greek letters with ypogegrammeni/prosgegrammeni upper-case to their title-case forms in .NET.
const UPPER_SPECIAL: ReadonlyMap<number, number> = new Map([
  ...Array.from({ length: 8 }, (_, index) => [0x1f80 + index, 0x1f88 + index] as [number, number]),
  ...Array.from({ length: 8 }, (_, index) => [0x1f90 + index, 0x1f98 + index] as [number, number]),
  ...Array.from({ length: 8 }, (_, index) => [0x1fa0 + index, 0x1fa8 + index] as [number, number]),
  [0x1fb3, 0x1fbc],
  [0x1fc3, 0x1fcc],
  [0x1ff3, 0x1ffc],
]);

function mapInvariant(value: string, lower: boolean): string {
  let result = "";
  for (const character of value) {
    const code = character.codePointAt(0)!;
    if (code < 0x80) {
      result += lower
        ? code >= 0x41 && code <= 0x5a ? String.fromCharCode(code + 0x20) : character
        : code >= 0x61 && code <= 0x7a ? String.fromCharCode(code - 0x20) : character;
      continue;
    }
    if (lower ? LOWER_IDENTITY.has(code) : UPPER_IDENTITY.has(code)) {
      result += character;
      continue;
    }
    const special = lower ? undefined : UPPER_SPECIAL.get(code);
    if (special !== undefined) {
      result += String.fromCodePoint(special);
      continue;
    }
    const mapped = lower ? character.toLowerCase() : character.toUpperCase();
    result += [...mapped].length === 1 ? mapped : character;
  }
  return result;
}

/** string.ToLowerInvariant(). */
export function toLowerInvariant(value: string): string {
  return mapInvariant(value, true);
}

/** string.ToUpperInvariant(). */
export function toUpperInvariant(value: string): string {
  return mapInvariant(value, false);
}

/** DomainText.RequireText: non-blank, trimmed, at most maxLength UTF-16 code units. */
export function requireText(value: string | null | undefined, maxLength: number, parameterName: string): string {
  throwIfNullOrWhiteSpace(value, parameterName, isNullOrWhiteSpace);
  const normalized = dotnetTrim(value);
  if (normalized.length > maxLength) {
    throw argumentOutOfRangeException(parameterName, `${parameterName} must not exceed ${maxLength} characters.`);
  }
  return normalized;
}

// DomainText's own patterns are applied to trimmed text, so no trailing "\n" can reach them.
const DOMAIN_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOMAIN_LOCALE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z]{2})?$/;

/** DomainText.RequireSlug. */
export function requireSlug(value: string | null | undefined, parameterName = "slug"): string {
  const slug = toLowerInvariant(requireText(value, 120, parameterName));
  if (!DOMAIN_SLUG_PATTERN.test(slug)) {
    throw argumentException(
      "A slug must contain lowercase ASCII letters, numbers, and single hyphens only.",
      parameterName,
    );
  }
  return slug;
}

/** DomainText.RequireLocale: trims, validates and normalises casing (e.g. "PT-br" -> "pt-BR"). */
export function requireLocale(value: string | null | undefined, parameterName = "locale"): string {
  const locale = requireText(value, 16, parameterName);
  if (!DOMAIN_LOCALE_PATTERN.test(locale)) {
    throw argumentException("Locale must be a valid short BCP 47 language tag.", parameterName);
  }

  const parts = locale.split("-").filter((part) => part.length > 0);
  return parts.length === 1
    ? toLowerInvariant(parts[0]!)
    : `${toLowerInvariant(parts[0]!)}-${toUpperInvariant(parts[1]!)}`;
}

/** Any UTF-16 code unit for which char.IsControl is true (Unicode category Cc). */
export function containsControlCharacters(value: string | null | undefined): boolean {
  return value != null && /[\u0000-\u001f\u007f-\u009f]/.test(value);
}
