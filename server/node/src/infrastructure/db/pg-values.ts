// Conversions from PostgreSQL wire text to the representation the C# API serialises.

// With the session TimeZone forced to UTC, timestamptz text looks like
// "2026-09-14 16:38:16.123456+00" (fraction optional, 1-6 digits).
const TIMESTAMPTZ_TEXT = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:\+00(?::?00)?|Z)$/;

/**
 * System.Text.Json writes a DateTimeOffset read by Npgsql from timestamptz as
 * "yyyy-MM-ddTHH:mm:ss[.fffffff]+00:00" with trailing fractional zeros removed.
 */
export function toContractTimestamp(value: string): string {
  const match = TIMESTAMPTZ_TEXT.exec(value);
  if (!match) {
    throw new Error(`Unexpected timestamptz text '${value}'. Is the session TimeZone UTC?`);
  }
  const fraction = (match[3] ?? "").replace(/0+$/, "");
  return `${match[1]}T${match[2]}${fraction.length > 0 ? `.${fraction}` : ""}+00:00`;
}

export function toNullableContractTimestamp(value: string | null): string | null {
  return value === null ? null : toContractTimestamp(value);
}

/**
 * numeric(12,4) arrives as text. The C# API emits the decimal with its scale
 * (e.g. 1.5000); JSON consumers parse both to the same number.
 */
export function toNullableNumber(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Unexpected numeric text '${value}'.`);
  return parsed;
}
