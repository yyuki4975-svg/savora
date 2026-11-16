// System.Guid: the "D" text form System.Text.Json reads, Guid.Empty and Guid.CreateVersion7().
import { randomBytes } from "node:crypto";

export const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

const GUID_D = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Utf8Parser.TryParse(out Guid, 'D') as used by System.Text.Json; returns the lowercase form. */
export function parseGuidD(text: string): string | undefined {
  return GUID_D.test(text) ? text.toLowerCase() : undefined;
}

/**
 * Guid.CreateVersion7(): 48-bit Unix millisecond timestamp, version 7, RFC 9562 variant,
 * random remainder. Rendered in the lowercase "D" form PostgreSQL and .NET use.
 */
export function createVersion7(now: number = Date.now()): string {
  const bytes = randomBytes(16);
  const timestamp = BigInt(now);
  for (let index = 0; index < 6; index++) {
    bytes[index] = Number((timestamp >> BigInt(8 * (5 - index))) & 0xffn);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
