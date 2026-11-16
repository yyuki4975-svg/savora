// A strict JSON reader and schema binder that reproduces what the C# tools get from
// System.Text.Json with JsonSerializerDefaults.Web and UnmappedMemberHandling.Disallow:
// positional records bound member by member, missing members defaulted, the last
// duplicate winning, numbers readable from strings, unknown members rejected, and
// conversion errors reported as "The JSON value could not be converted to {type}.
// Path: {path} | LineNumber: {line} | BytePositionInLine: {position}.".
// Conformance: test/conformance/dotnet-stj.json and dotnet-stj-records.jsonl.
import { compareOrdinalIgnoreCase } from "../../domain/catalog";
import { invalidOperation, jsonException } from "../../domain/dotnet/errors";
import { type DotnetDecimal, parseDotnetDecimal } from "../../domain/dotnet/decimal";
import { EMPTY_GUID, parseGuidD } from "../../domain/dotnet/guid";
import { DEFAULT_INSTANT, type Instant, parseIsoInstant } from "../../domain/dotnet/instant";

// ---------------------------------------------------------------- schema

export type Schema =
  | { kind: "int" }
  | { kind: "int?" }
  | { kind: "decimal" }
  | { kind: "decimal?" }
  | { kind: "double?" }
  | { kind: "bool" }
  | { kind: "guid" }
  | { kind: "dto" }
  | { kind: "dto?" }
  | { kind: "string" }
  | { kind: "list"; item: Schema; dotnetName: string }
  | RecordSchema;

export interface RecordSchema {
  kind: "record";
  /** The .NET full type name used in error messages. */
  dotnetName: string;
  /** [PascalCase member name, JSON (camelCase) name, schema, optional-parameter default] in constructor order. */
  members: ReadonlyArray<readonly [string, string, Schema, Bound?]>;
}

export interface StjOptions {
  caseInsensitive: boolean;
  /** JsonUnmappedMemberHandling.Skip (the default outside the Web profile); otherwise Disallow. */
  skipUnmapped?: boolean;
  /** JsonNumberHandling.Strict: numbers cannot be read from JSON strings (default options). */
  strictNumbers?: boolean;
}

export const int = { kind: "int" } as const;
export const nullableInt = { kind: "int?" } as const;
export const decimal = { kind: "decimal" } as const;
export const nullableDecimal = { kind: "decimal?" } as const;
export const nullableDouble = { kind: "double?" } as const;
export const bool = { kind: "bool" } as const;
export const guid = { kind: "guid" } as const;
export const dto = { kind: "dto" } as const;
export const nullableDto = { kind: "dto?" } as const;
export const string = { kind: "string" } as const;

export function list(item: Schema): Schema {
  return { kind: "list", item, dotnetName: `System.Collections.Generic.IReadOnlyList\`1[${typeName(item)}]` };
}

export function record(dotnetName: string, members: ReadonlyArray<readonly [string, Schema, Bound?]>): RecordSchema {
  return {
    kind: "record",
    dotnetName,
    members: members.map(([name, schema, fallback]) => [name, name[0]!.toLowerCase() + name.slice(1), schema, fallback] as const),
  };
}

function typeName(schema: Schema): string {
  switch (schema.kind) {
    case "int": return "System.Int32";
    case "int?": return "System.Nullable`1[System.Int32]";
    case "decimal": return "System.Decimal";
    case "decimal?": return "System.Nullable`1[System.Decimal]";
    case "double?": return "System.Nullable`1[System.Double]";
    case "bool": return "System.Boolean";
    case "guid": return "System.Guid";
    case "dto": return "System.DateTimeOffset";
    case "dto?": return "System.Nullable`1[System.DateTimeOffset]";
    case "string": return "System.String";
    case "list": return schema.dotnetName;
    case "record": return schema.dotnetName;
  }
}

/** Bound values: records become PascalCase objects, like the C# records. */
export type Bound = number | string | boolean | null | DotnetDecimal | Instant | Bound[] | { [member: string]: Bound };

function defaultValue(schema: Schema): Bound {
  switch (schema.kind) {
    case "int": return 0;
    case "bool": return false;
    case "guid": return EMPTY_GUID;
    case "dto": return DEFAULT_INSTANT;
    case "decimal": return { coefficient: 0n, scale: 0, negative: false };
    default: return null;
  }
}

// ---------------------------------------------------------------- reader

class JsonReaderError extends Error {
  /** JSON path of the innermost value being read when the error occurred. */
  path?: string;
}

const VALUE_START = new Set([0x22, 0x7b, 0x5b, 0x74, 0x66, 0x6e, 0x2d, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39]);

const utf8 = new TextDecoder("utf-8", { fatal: true });

class Reader {
  index = 0;
  line = 0;
  lineStart = 0;

  constructor(readonly bytes: Uint8Array) {}

  position(): string {
    return `LineNumber: ${this.line} | BytePositionInLine: ${this.index - this.lineStart}`;
  }

  peek(): number {
    return this.index < this.bytes.length ? this.bytes[this.index]! : -1;
  }

  skipWhitespace(): void {
    while (this.index < this.bytes.length) {
      const byte = this.bytes[this.index]!;
      if (byte === 0x20 || byte === 0x09 || byte === 0x0d) this.index++;
      else if (byte === 0x0a) {
        this.index++;
        this.line++;
        this.lineStart = this.index;
      } else break;
    }
  }

  describe(byte: number): string {
    return byte >= 0x20 && byte < 0x7f ? `'${String.fromCharCode(byte)}'` : `'0x${byte.toString(16).toUpperCase().padStart(2, "0")}'`;
  }

  fail(message: string): never {
    throw new JsonReaderError(message);
  }

  expectValueStart(): number {
    this.skipWhitespace();
    const byte = this.peek();
    if (byte === -1) this.fail("Expected depth to be zero at the end of the JSON payload. There is an open JSON object or array that should be closed.");
    return byte;
  }

  readLiteral(literal: string): void {
    for (let offset = 0; offset < literal.length; offset++) {
      if (this.bytes[this.index + offset] !== literal.charCodeAt(offset)) {
        this.fail(`'${literal}' is an invalid JSON literal. Expected the literal '${literal}'.`);
      }
    }
    this.index += literal.length;
  }

  readNumber(): string {
    const start = this.index;
    const rest = new TextDecoder("latin1").decode(this.bytes.subarray(start, Math.min(this.bytes.length, start + 1024)));
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(rest);
    if (!match || match[0].length === 0) this.fail(`${this.describe(this.peek())} is an invalid start of a value.`);
    const next = rest.charCodeAt(match[0].length);
    if (next >= 0x30 && next <= 0x39) this.fail("Invalid leading zero before '" + String.fromCharCode(next) + "'.");
    this.index += match[0].length;
    return match[0];
  }

  readString(): string {
    // Opening quote already verified by the caller.
    this.index++;
    let result = "";
    let chunkStart = this.index;
    const flush = (end: number) => {
      if (end > chunkStart) {
        try {
          result += utf8.decode(this.bytes.subarray(chunkStart, end));
        } catch {
          this.fail("Cannot transcode invalid UTF-8 JSON text to UTF-16 string.");
        }
      }
    };
    while (true) {
      if (this.index >= this.bytes.length) this.fail("Expected end of string, but instead reached end of data.");
      const byte = this.bytes[this.index]!;
      if (byte === 0x22) {
        flush(this.index);
        this.index++;
        break;
      }
      if (byte < 0x20) this.fail(`${this.describe(byte)} is invalid within a JSON string. The string should be correctly escaped.`);
      if (byte !== 0x5c) {
        this.index++;
        continue;
      }
      flush(this.index);
      const escape = this.bytes[this.index + 1];
      const simple: Record<number, string> = { 0x22: '"', 0x5c: "\\", 0x2f: "/", 0x62: "\b", 0x66: "\f", 0x6e: "\n", 0x72: "\r", 0x74: "\t" };
      if (escape !== undefined && simple[escape] !== undefined) {
        result += simple[escape];
        this.index += 2;
      } else if (escape === 0x75) {
        const code = this.readHex4(this.index + 2);
        this.index += 6;
        if (code >= 0xd800 && code <= 0xdbff) {
          if (this.bytes[this.index] !== 0x5c || this.bytes[this.index + 1] !== 0x75) this.fail("Cannot read invalid UTF-16 JSON text as string. Invalid surrogate value.");
          const low = this.readHex4(this.index + 2);
          if (low < 0xdc00 || low > 0xdfff) this.fail("Cannot read invalid UTF-16 JSON text as string. Invalid surrogate value.");
          this.index += 6;
          result += String.fromCharCode(code, low);
        } else if (code >= 0xdc00 && code <= 0xdfff) {
          this.fail("Cannot read invalid UTF-16 JSON text as string. Invalid surrogate value.");
        } else {
          result += String.fromCharCode(code);
        }
      } else {
        this.fail(`${this.describe(escape ?? 0)} is not a valid escapable character within a JSON string. The string should be correctly escaped.`);
      }
      chunkStart = this.index;
    }
    return result;
  }

  private readHex4(at: number): number {
    const text = String.fromCharCode(...this.bytes.subarray(at, at + 4));
    if (!/^[0-9a-fA-F]{4}$/.test(text)) this.fail("'\\u' must be followed by four hexadecimal digits within a JSON string.");
    return parseInt(text, 16);
  }

  /** Skips any JSON value (used for values bound to nothing). */
  skipValue(): void {
    const byte = this.expectValueStart();
    if (byte === 0x7b) {
      this.index++;
      this.readMembers(() => this.skipValue());
    } else if (byte === 0x5b) {
      this.index++;
      this.readItems(() => this.skipValue());
    } else this.readScalar();
  }

  readScalar(): { kind: "string"; value: string } | { kind: "number"; text: string } | { kind: "true" | "false" | "null" } {
    const byte = this.expectValueStart();
    if (byte === 0x22) return { kind: "string", value: this.readString() };
    if (byte === 0x74) { this.readLiteral("true"); return { kind: "true" }; }
    if (byte === 0x66) { this.readLiteral("false"); return { kind: "false" }; }
    if (byte === 0x6e) { this.readLiteral("null"); return { kind: "null" }; }
    if (byte === 0x2d || (byte >= 0x30 && byte <= 0x39)) return { kind: "number", text: this.readNumber() };
    return this.fail(`${this.describe(byte)} is an invalid start of a value.`);
  }

  /** Reads "name": value pairs after "{", calling onMember for each name. */
  readMembers(onMember: (name: string) => void): void {
    this.skipWhitespace();
    if (this.peek() === 0x7d) {
      this.index++;
      return;
    }
    while (true) {
      this.skipWhitespace();
      if (this.peek() !== 0x22) {
        if (this.peek() === 0x7d) this.fail("The JSON object contains a trailing comma at the end which is not supported in this mode. Change the reader options.");
        // With comments disallowed, System.Text.Json reports a comment here as text after a value.
        if (this.peek() === 0x2f) this.fail("'/' is invalid after a value. Expected either ',', '}', or ']'.");
        this.fail(`${this.describe(this.peek())} is an invalid start of a property name. Expected a '"'.`);
      }
      const name = this.readString();
      this.skipWhitespace();
      if (this.peek() !== 0x3a) this.fail(`${this.describe(this.peek())} is invalid after a property name. Expected a ':'.`);
      this.index++;
      onMember(name);
      this.skipWhitespace();
      const next = this.peek();
      if (next === 0x2c) {
        this.index++;
        continue;
      }
      if (next === 0x7d) {
        this.index++;
        return;
      }
      if (next === -1) this.fail("Expected depth to be zero at the end of the JSON payload. There is an open JSON object or array that should be closed.");
      this.fail(`${this.describe(next)} is invalid after a value. Expected either ',', '}', or ']'.`);
    }
  }

  /** Reads array items after "[". */
  readItems(onItem: (index: number) => void): void {
    this.skipWhitespace();
    if (this.peek() === 0x5d) {
      this.index++;
      return;
    }
    for (let itemIndex = 0; ; itemIndex++) {
      this.skipWhitespace();
      if (this.peek() === 0x5d) this.fail("The JSON array contains a trailing comma at the end which is not supported in this mode. Change the reader options.");
      onItem(itemIndex);
      this.skipWhitespace();
      const next = this.peek();
      if (next === 0x2c) {
        this.index++;
        continue;
      }
      if (next === 0x5d) {
        this.index++;
        return;
      }
      if (next === -1) this.fail("Expected depth to be zero at the end of the JSON payload. There is an open JSON object or array that should be closed.");
      this.fail(`${this.describe(next)} is invalid after a value. Expected either ',', '}', or ']'.`);
    }
  }
}

// ---------------------------------------------------------------- binder

class ConversionError extends Error {
  constructor(readonly dotnetType: string) {
    super(dotnetType);
  }
}

const QUOTED_INT = /^[+-]?[0-9]+$/;
const QUOTED_REAL = /^[+-]?(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/;

function readInt32(text: string): number | undefined {
  const value = BigInt(text);
  if (value < -2147483648n || value > 2147483647n) return undefined;
  const number = Number(value);
  return number === 0 ? 0 : number;
}

function segment(name: string): string {
  return /^[A-Za-z0-9_$]+$/.test(name) ? `.${name}` : `['${name}']`;
}

class Binder {
  constructor(
    private readonly reader: Reader,
    private readonly options: StjOptions,
  ) {}

  /** Binds one value; `owner` is the .NET type named if the value cannot be converted. */
  bind(schema: Schema, path: string, owner: string): Bound {
    try {
      return this.bindValue(schema, path, owner);
    } catch (error) {
      if (error instanceof JsonReaderError && error.path === undefined) error.path = path;
      throw error;
    }
  }

  private bindValue(schema: Schema, path: string, owner: string): Bound {
    const reader = this.reader;
    const start = reader.expectValueStart();
    if (!VALUE_START.has(start)) reader.fail(`${reader.describe(start)} is an invalid start of a value.`);
    const fail = (): never => {
      throw Object.assign(new ConversionError(owner), { path, position: reader.position() });
    };

    if (schema.kind === "record" || schema.kind === "list") {
      const byte = reader.expectValueStart();
      if (byte === 0x6e) {
        reader.readLiteral("null");
        return null;
      }
      if (schema.kind === "record") {
        if (byte !== 0x7b) {
          reader.index++;
          fail();
        }
        reader.index++;
        return this.bindRecord(schema, path);
      }
      if (byte !== 0x5b) {
        if (byte === 0x7b) reader.index++;
        else reader.readScalar();
        fail();
      }
      reader.index++;
      const items: Bound[] = [];
      reader.readItems((itemIndex) => {
        items.push(this.bind(schema.item, `${path}[${itemIndex}]`, typeName(schema.item)));
      });
      return items;
    }

    const byte = reader.expectValueStart();
    if (byte === 0x7b || byte === 0x5b) {
      reader.index++;
      fail();
    }
    const token = reader.readScalar();
    switch (schema.kind) {
      case "string":
        if (token.kind === "null") return null;
        return token.kind === "string" ? token.value : fail();
      case "bool":
        return token.kind === "true" ? true : token.kind === "false" ? false : fail();
      case "int":
      case "int?": {
        if (this.options.strictNumbers && (token.kind === "string" || (token.kind === "null" && schema.kind === "int"))) {
          throw invalidOperation(`Cannot get the value of a token type '${token.kind === "null" ? "Null" : "String"}' as a number.`);
        }
        if (token.kind === "null") return schema.kind === "int?" ? null : fail();
        if (token.kind === "number") return /^-?[0-9]+$/.test(token.text) ? (readInt32(token.text) ?? fail()) : fail();
        if (token.kind === "string" && !this.options.strictNumbers && QUOTED_INT.test(token.value)) return readInt32(token.value) ?? fail();
        return fail();
      }
      case "decimal":
      case "decimal?": {
        if (this.options.strictNumbers && (token.kind === "string" || (token.kind === "null" && schema.kind === "decimal"))) {
          throw invalidOperation(`Cannot get the value of a token type '${token.kind === "null" ? "Null" : "String"}' as a number.`);
        }
        if (token.kind === "null") return schema.kind === "decimal?" ? null : fail();
        const text =
          token.kind === "number"
            ? token.text
            : token.kind === "string" && !this.options.strictNumbers && QUOTED_REAL.test(token.value)
              ? token.value
              : undefined;
        return (text === undefined ? undefined : parseDotnetDecimal(text)) ?? fail();
      }
      case "double?": {
        if (token.kind === "null") return null;
        if (token.kind === "number") return Number(token.text);
        if (token.kind !== "string" || this.options.strictNumbers) return fail();
        if (token.value === "NaN") return Number.NaN;
        if (token.value === "Infinity") return Number.POSITIVE_INFINITY;
        if (token.value === "-Infinity") return Number.NEGATIVE_INFINITY;
        if (!QUOTED_REAL.test(token.value)) return fail();
        // Unlike a number token, a quoted value that overflows to infinity is rejected.
        const value = Number(token.value);
        return Number.isFinite(value) ? value : fail();
      }
      case "guid":
        return token.kind === "string" ? (parseGuidD(token.value) ?? fail()) : fail();
      case "dto":
      case "dto?":
        if (token.kind === "null") return schema.kind === "dto?" ? null : fail();
        return token.kind === "string" ? (parseIsoInstant(token.value) ?? fail()) : fail();
    }
  }

  private bindRecord(schema: RecordSchema, path: string): { [member: string]: Bound } {
    const values = new Map<string, Bound>();
    this.reader.readMembers((name) => {
      const member = schema.members.find(([, jsonName]) =>
        this.options.caseInsensitive ? compareOrdinalIgnoreCase(jsonName, name) === 0 : jsonName === name,
      );
      if (member === undefined && this.options.skipUnmapped) {
        this.reader.skipValue();
        return;
      }
      if (member === undefined) {
        throw jsonException(
          `The JSON property '${name}' could not be mapped to any .NET member contained in type '${schema.dotnetName}'.`,
        );
      }
      values.set(member[0], this.bind(member[2], `${path}${segment(name)}`, schema.dotnetName));
    });
    const result: { [member: string]: Bound } = {};
    for (const [pascalName, , memberSchema, fallback] of schema.members) {
      result[pascalName] = values.has(pascalName) ? values.get(pascalName)! : fallback !== undefined ? fallback : defaultValue(memberSchema);
    }
    return result;
  }
}

/**
 * JsonSerializer.Deserialize<T>(utf8Bytes, options). Returns null for a top-level JSON null.
 * Throws a DotnetException of type System.Text.Json.JsonException on any failure.
 */
export function deserialize(bytes: Uint8Array, schema: RecordSchema, options: StjOptions): { [member: string]: Bound } | null {
  const reader = new Reader(bytes);
  const binder = new Binder(reader, options);
  try {
    const value = binder.bind(schema, "$", schema.dotnetName);
    reader.skipWhitespace();
    if (reader.index < bytes.length) {
      reader.fail(`${reader.describe(reader.peek())} is invalid after a single JSON value. Expected end of data.`);
    }
    return value as { [member: string]: Bound } | null;
  } catch (error) {
    if (error instanceof ConversionError) {
      const details = error as ConversionError & { path: string; position: string };
      throw jsonException(`The JSON value could not be converted to ${error.dotnetType}. Path: ${details.path} | ${details.position}.`);
    }
    if (error instanceof JsonReaderError) {
      // Syntax errors come from Utf8JsonReader itself; unlike binding errors,
      // its .NET message has a byte location without a JSON Path segment.
      throw jsonException(`${error.message} ${reader.position()}.`);
    }
    throw error;
  }
}

/** Binds a single scalar or list value (conformance testing of the scalar rules). */
export function deserializeValue(bytes: Uint8Array, schema: Schema): Bound {
  const reader = new Reader(bytes);
  const binder = new Binder(reader, { caseInsensitive: true });
  try {
    const value = binder.bind(schema, "$", typeName(schema));
    reader.skipWhitespace();
    if (reader.index < bytes.length) reader.fail("Expected end of data.");
    return value;
  } catch (error) {
    if (error instanceof ConversionError || error instanceof JsonReaderError) throw jsonException(error.message);
    throw error;
  }
}
