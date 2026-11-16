// System.DateTimeOffset with full tick (100 ns) precision, as System.Text.Json reads it
// and as Npgsql writes it to timestamptz. JavaScript Date has only millisecond precision,
// so values are kept as UTC ticks. Conformance: test/conformance/dotnet-stj.json ("dto").

export interface Instant {
  /** 100-ns ticks since 0001-01-01T00:00:00Z. */
  readonly utcTicks: bigint;
  /** Offset from UTC in minutes, as parsed. Equality and ordering ignore it, as in .NET. */
  readonly offsetMinutes: number;
}

const TICKS_PER_SECOND = 10_000_000n;
const TICKS_PER_MINUTE = 60n * TICKS_PER_SECOND;
const TICKS_PER_DAY = 86_400n * TICKS_PER_SECOND;
export const UNIX_EPOCH_TICKS = 621_355_968_000_000_000n;
const POSTGRES_EPOCH_TICKS = 630_822_816_000_000_000n; // 2000-01-01T00:00:00Z
const MAX_TICKS = 3_155_378_975_999_999_999n;

/** default(DateTimeOffset) == DateTimeOffset.MinValue. */
export const DEFAULT_INSTANT: Instant = { utcTicks: 0n, offsetMinutes: 0 };

export function isDefaultInstant(value: Instant): boolean {
  return value.utcTicks === 0n;
}

export function compareInstants(left: Instant, right: Instant): number {
  return left.utcTicks < right.utcTicks ? -1 : left.utcTicks > right.utcTicks ? 1 : 0;
}

export function instantsEqual(left: Instant, right: Instant): boolean {
  return left.utcTicks === right.utcTicks;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const DAYS_BEFORE_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

function daysInMonth(year: number, month: number): number {
  return DAYS_BEFORE_MONTH[month]! - DAYS_BEFORE_MONTH[month - 1]! + (month === 2 && isLeapYear(year) ? 1 : 0);
}

/** DateTime.DateToTicks. */
function dateToTicks(year: number, month: number, day: number): bigint {
  const y = year - 1;
  const days =
    y * 365 + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) +
    DAYS_BEFORE_MONTH[month - 1]! + (month > 2 && isLeapYear(year) ? 1 : 0) + day - 1;
  return BigInt(days) * TICKS_PER_DAY;
}

// JsonReaderHelper.TryParseAsISO (the "ISO 8601-1:2019 extended profile" System.Text.Json accepts).
const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{0,16}))?)?(Z|[+-]\d{2}(?::\d{2})?)?)?$/;

/**
 * Parses the text of a JSON string the way System.Text.Json reads DateTimeOffset.
 * A value without an offset is local time. .NET applies the Windows time-zone rules,
 * this uses the platform (ICU) rules; they agree except for historical rule changes.
 */
export function parseIsoInstant(text: string): Instant | undefined {
  const match = ISO.exec(text);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = match[4] === undefined ? 0 : Number(match[4]);
  const minute = match[5] === undefined ? 0 : Number(match[5]);
  const second = match[6] === undefined ? 0 : Number(match[6]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return undefined;
  if (hour > 23 || minute > 59 || second > 59) return undefined;

  const fraction = (match[7] ?? "").slice(0, 7).padEnd(7, "0");
  const localTicks =
    dateToTicks(year, month, day) +
    BigInt(hour * 3600 + minute * 60 + second) * TICKS_PER_SECOND +
    BigInt(fraction);

  let offsetMinutes: number;
  const designator = match[8];
  if (designator === undefined) {
    const local = new Date(0);
    local.setFullYear(year, month - 1, day);
    local.setHours(hour, minute, second, 0);
    offsetMinutes = -local.getTimezoneOffset();
  } else if (designator === "Z") {
    offsetMinutes = 0;
  } else {
    const sign = designator[0] === "-" ? -1 : 1;
    const offsetHours = Number(designator.slice(1, 3));
    const offsetMins = designator.length > 3 ? Number(designator.slice(4, 6)) : 0;
    if (offsetMins > 59) return undefined;
    offsetMinutes = sign * (offsetHours * 60 + offsetMins);
    if (Math.abs(offsetMinutes) > 14 * 60) return undefined;
  }

  const utcTicks = localTicks - BigInt(offsetMinutes) * TICKS_PER_MINUTE;
  if (utcTicks < 0n || utcTicks > MAX_TICKS) return undefined;
  return { utcTicks, offsetMinutes };
}

/** DateTimeOffset.UtcNow (millisecond resolution is enough for audit times). */
export function utcNow(): Instant {
  return { utcTicks: BigInt(Date.now()) * 10_000n + UNIX_EPOCH_TICKS, offsetMinutes: 0 };
}

/**
 * The timestamptz value Npgsql writes for a DateTimeOffset: microseconds since
 * 2000-01-01 UTC, truncated toward zero from ticks. Returned as PostgreSQL text.
 */
export function toPostgresTimestamptz(value: Instant): string {
  const microsecondsSincePostgresEpoch = (value.utcTicks - POSTGRES_EPOCH_TICKS) / 10n; // BigInt division truncates
  const ticks = POSTGRES_EPOCH_TICKS + microsecondsSincePostgresEpoch * 10n;
  const days = ticks / TICKS_PER_DAY;
  const timeOfDay = ticks % TICKS_PER_DAY;
  const { year, month, day } = civilFromDays(Number(days));
  const totalSeconds = Number(timeOfDay / TICKS_PER_SECOND);
  const micro = Number((timeOfDay % TICKS_PER_SECOND) / 10n);
  const pad = (number: number, width: number) => String(number).padStart(width, "0");
  return (
    `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)} ` +
    `${pad(Math.floor(totalSeconds / 3600), 2)}:${pad(Math.floor(totalSeconds / 60) % 60, 2)}:${pad(totalSeconds % 60, 2)}` +
    `.${pad(micro, 6)}+00`
  );
}

/** Days since 0001-01-01 to a proleptic Gregorian date. */
function civilFromDays(days: number): { year: number; month: number; day: number } {
  let remaining = days;
  const y400 = Math.floor(remaining / 146097);
  remaining -= y400 * 146097;
  let y100 = Math.floor(remaining / 36524);
  if (y100 === 4) y100 = 3;
  remaining -= y100 * 36524;
  const y4 = Math.floor(remaining / 1461);
  remaining -= y4 * 1461;
  let y1 = Math.floor(remaining / 365);
  if (y1 === 4) y1 = 3;
  remaining -= y1 * 365;
  const year = y400 * 400 + y100 * 100 + y4 * 4 + y1 + 1;
  let month = 1;
  while (remaining >= daysInMonth(year, month)) {
    remaining -= daysInMonth(year, month);
    month++;
  }
  return { year, month, day: remaining + 1 };
}

/** Parses PostgreSQL timestamptz text in a UTC session (e.g. "2026-09-14 16:38:16.123456+00"). */
export function fromPostgresTimestamptz(text: string): Instant {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?\+00(?::?00)?$/.exec(text);
  if (!match) throw new Error(`Unexpected timestamptz text '${text}'. Is the session TimeZone UTC?`);
  const ticks =
    dateToTicks(Number(match[1]), Number(match[2]), Number(match[3])) +
    BigInt(Number(match[4]) * 3600 + Number(match[5]) * 60 + Number(match[6])) * TICKS_PER_SECOND +
    BigInt((match[7] ?? "").padEnd(7, "0"));
  return { utcTicks: ticks, offsetMinutes: 0 };
}

/** The oracle's normalized form: "{UtcTicks}|{offset minutes}". */
export function instantKey(value: Instant): string {
  return `${value.utcTicks}|${value.offsetMinutes}`;
}
