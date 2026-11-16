// System.Decimal as produced by .NET number parsing (Utf8Parser / Number.TryNumberToDecimal),
// kept exact as text so that PostgreSQL receives the same value Npgsql would send.
// Conformance: test/conformance/dotnet-stj.json ("decimal?" cases).

export interface DotnetDecimal {
  /** Unsigned 96-bit coefficient. */
  readonly coefficient: bigint;
  /** 0..28 digits after the decimal point. */
  readonly scale: number;
  readonly negative: boolean;
}

const DECIMAL_PRECISION = 29;
const U64 = (1n << 64n) - 1n;
const U32 = (1n << 32n) - 1n;

interface NumberBuffer {
  digits: string;
  scale: number;
  negative: boolean;
  hasNonZeroTail: boolean;
}

/**
 * Builds the NumberBuffer Utf8Parser hands to Number.TryNumberToDecimal: up to 30
 * significant digits (leading zeros dropped, trailing zeros kept), the decimal-point
 * position, and HasNonZeroTail, which Utf8Parser sets for any non-zero digit from the
 * 30th onwards, the 30th included. So a tie in 30th position rounds up, while a tie in
 * 29th position or earlier rounds half to even (test/conformance/dotnet-decimal.json).
 */
function toNumberBuffer(text: string): NumberBuffer | undefined {
  const match = /^([+-]?)([0-9]*)(?:\.([0-9]*))?(?:[eE]([+-]?[0-9]+))?$/.exec(text);
  if (!match) return undefined;
  const integer = match[2] ?? "";
  const fraction = match[3] ?? "";
  if (integer.length + fraction.length === 0) return undefined;

  let digits = "";
  let scale = 0;
  let nonZeroSeen = false;
  let significant = 0;
  let hasNonZeroTail = false;
  const push = (character: string, beforePoint: boolean) => {
    if (character !== "0" || nonZeroSeen) {
      significant++;
      if (significant <= DECIMAL_PRECISION + 1) digits += character;
      if (significant > DECIMAL_PRECISION && character !== "0") hasNonZeroTail = true;
      if (beforePoint) scale++;
      nonZeroSeen = true;
    } else if (!beforePoint) {
      scale--;
    }
  };
  for (const character of integer) push(character, true);
  for (const character of fraction) push(character, false);

  if (match[4] !== undefined) {
    const exponent = BigInt(match[4]);
    const adjusted = BigInt(scale) + exponent;
    // Utf8Parser saturates absurd exponents; anything this large overflows or underflows anyway.
    scale = adjusted > 100000n ? 100000 : adjusted < -100000n ? -100000 : Number(adjusted);
  }
  if (!nonZeroSeen) digits = "";
  return { digits, scale, negative: match[1] === "-", hasNonZeroTail };
}

/** Number.TryNumberToDecimal, ported with explicit 64/32-bit wrap-around. */
function numberToDecimal(number: NumberBuffer): DotnetDecimal | undefined {
  const digits = number.digits;
  let index = 0;
  const at = (position: number) => (position < digits.length ? digits.charCodeAt(position) : 0);
  let e = number.scale;
  let c = at(index);

  if (c === 0) {
    return { coefficient: 0n, scale: Math.min(Math.max(-e, 0), 28), negative: number.negative };
  }
  if (e > DECIMAL_PRECISION) return undefined;

  let low64 = 0n;
  while (e > -28) {
    e--;
    low64 = (low64 * 10n + BigInt(c - 48)) & U64;
    c = at(++index);
    if (low64 >= U64 / 10n) break;
    if (c === 0) {
      while (e > 0) {
        e--;
        low64 = (low64 * 10n) & U64;
        if (low64 >= U64 / 10n) break;
      }
      break;
    }
  }

  let high = 0n;
  while (
    (e > 0 || (c !== 0 && e > -28)) &&
    (high < U32 / 10n ||
      (high === U32 / 10n && (low64 < 0x9999999999999999n || (low64 === 0x9999999999999999n && c <= 53))))
  ) {
    const tmpLow = (low64 & U32) * 10n;
    const tmp64 = (low64 >> 32n) * 10n + (tmpLow >> 32n);
    low64 = ((tmpLow & U32) + (tmp64 << 32n)) & U64;
    high = ((tmp64 >> 32n) + high * 10n) & U32;
    if (c !== 0) {
      const digit = BigInt(c - 48);
      low64 = (low64 + digit) & U64;
      if (low64 < digit) high = (high + 1n) & U32;
      c = at(++index);
    }
    e--;
  }

  let round = c >= 53;
  if (round && c === 53 && (low64 & 1n) === 0n) {
    c = at(++index);
    let hasZeroTail = !number.hasNonZeroTail;
    while (c !== 0 && hasZeroTail) {
      hasZeroTail = hasZeroTail && c === 48;
      c = at(++index);
    }
    if (hasZeroTail) round = false;
  }
  if (round) {
    low64 = (low64 + 1n) & U64;
    if (low64 === 0n) {
      high = (high + 1n) & U32;
      if (high === 0n) {
        low64 = 0x999999999999999an;
        high = U32 / 10n;
        e++;
      }
    }
  }

  if (e > 0) return undefined;
  if (e <= -DECIMAL_PRECISION) return { coefficient: 0n, scale: DECIMAL_PRECISION - 1, negative: number.negative };
  return { coefficient: (high << 64n) | low64, scale: -e, negative: number.negative };
}

/** Parses validated numeric text (JSON token or quoted form) the way .NET builds a decimal. */
export function parseDotnetDecimal(text: string): DotnetDecimal | undefined {
  const buffer = toNumberBuffer(text);
  return buffer === undefined ? undefined : numberToDecimal(buffer);
}

/** decimal.ToString(CultureInfo.InvariantCulture): keeps the scale; negative zero prints as "0". */
export function formatDotnetDecimal(value: DotnetDecimal): string {
  const digits = value.coefficient.toString().padStart(value.scale + 1, "0");
  const integer = digits.slice(0, digits.length - value.scale);
  const fraction = digits.slice(digits.length - value.scale);
  const body = value.scale > 0 ? `${integer}.${fraction}` : integer;
  return value.negative && value.coefficient !== 0n ? `-${body}` : body;
}

/** decimal comparison with zero: negative zero is not negative. */
export function isNegativeDecimal(value: DotnetDecimal): boolean {
  return value.negative && value.coefficient !== 0n;
}
