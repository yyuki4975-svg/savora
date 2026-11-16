// Query binding and validation ported from Savora.Api.Endpoints.CatalogEndpoints.
import type { Request } from "express";
import { LOCALE_PATTERN, SLUG_PATTERN, isNullOrWhiteSpace, requireLocale } from "../domain/text";

/**
 * ASP.NET reads query keys case-insensitively and binds a repeated key to
 * StringValues.ToString(), which comma-joins the values and skips empty ones
 * (`limit=&limit=2` binds "2"). Returns undefined when the key is absent.
 */
export function readQueryValue(req: Request, name: string): string | undefined {
  const url = req.originalUrl ?? req.url;
  const start = url.indexOf("?");
  if (start < 0) return undefined;

  const wanted = name.toLowerCase();
  const values: string[] = [];
  for (const [key, value] of new URLSearchParams(url.slice(start + 1))) {
    if (key.toLowerCase() === wanted) values.push(value);
  }
  return values.length === 0 ? undefined : values.filter((value) => value !== "").join(",");
}

export type NullableIntBinding = { ok: true; value: number | undefined } | { ok: false };

// int.TryParse(NumberStyles.Integer, InvariantCulture): optional surrounding
// whitespace (U+0009-U+000D, U+0020) and an optional leading sign.
const INT32_TEXT = /^[\t\n\v\f\r ]*([+-]?)(\d+)[\t\n\v\f\r ]*$/;

export function bindNullableInt32(raw: string | undefined): NullableIntBinding {
  // A present key with an empty value (`limit=`, `limit`) is a binding failure, not null.
  if (raw === undefined) return { ok: true, value: undefined };
  const match = INT32_TEXT.exec(raw);
  if (!match) return { ok: false };
  const value = Number(`${match[1]}${match[2]}`);
  if (!Number.isSafeInteger(value) || value < -2147483648 || value > 2147483647) return { ok: false };
  return { ok: true, value: value === 0 ? 0 : value };
}

export interface CatalogValidationInput {
  locale: string | undefined;
  query: string | undefined;
  limit: number | undefined;
  requireSlug: boolean;
  slug: string | undefined;
  maximumLimit?: number;
}

/** Mirrors CatalogEndpoints.Validate, including error-key order and messages. */
export function validateCatalogRequest(input: CatalogValidationInput): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const maximumLimit = input.maximumLimit ?? 50;

  if (!isNullOrWhiteSpace(input.locale) && (input.locale!.length > 16 || !LOCALE_PATTERN.test(input.locale!))) {
    errors.locale = ["Locale must be a short BCP 47 tag such as en, zh, or pt-BR."];
  }

  if (input.query !== undefined && input.query.length > 100) {
    errors.query = ["Search query must not exceed 100 characters."];
  }

  if (input.limit !== undefined && (input.limit < 1 || input.limit > maximumLimit)) {
    errors.limit = [`Limit must be between 1 and ${maximumLimit}.`];
  }

  if (
    input.requireSlug &&
    (isNullOrWhiteSpace(input.slug) || input.slug!.length > 120 || !SLUG_PATTERN.test(input.slug!))
  ) {
    errors.slug = ["Slug must contain lowercase ASCII letters, numbers, and single hyphens only."];
  }

  return errors;
}

export function hasErrors(errors: Record<string, string[]>): boolean {
  return Object.keys(errors).length > 0;
}

/** CatalogEndpoints.NormalizeLocale. */
export function normalizeLocale(locale: string | undefined): string {
  return isNullOrWhiteSpace(locale) ? "en" : requireLocale(locale);
}
