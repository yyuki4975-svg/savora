import { isIP } from "node:net";
import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { OPERATOR_CATALOG_QUERIES, type OperatorCatalogQueries } from "../application/catalog/operator-queries";
import { APP_CONFIG, type AppConfig } from "../config";
import { LOCALE_PATTERN, SLUG_PATTERN, containsControlCharacters, dotnetTrim, isNullOrWhiteSpace } from "../domain/text";
import { bindNullableInt32, hasErrors, normalizeLocale, readQueryValue } from "./catalog-request";
import { writeBindingFailure, writeEmpty, writeJson, writeValidationProblem } from "./http-results";

/**
 * IPAddress.IsLoopback on HttpContext.Connection.RemoteIpAddress: the socket peer, never a
 * forwarded header (the C# API has no ForwardedHeaders middleware). 127.0.0.0/8, ::1 and
 * IPv4-mapped loopback addresses qualify.
 */
export function isLoopbackAddress(address: string | undefined): boolean {
  if (address === undefined) return false;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  const candidate = mapped ? mapped[1]! : address;
  if (isIP(candidate) === 4) return candidate.startsWith("127.");
  // Node reports the compressed form; the full form is accepted for completeness.
  return candidate === "::1" || candidate === "0:0:0:0:0:0:0:1";
}

export interface OperatorValidationInput {
  locale: string | undefined;
  query: string | undefined;
  provider: string | undefined;
  page: number | undefined;
  pageSize: number | undefined;
  requireSlug: boolean;
  slug: string | undefined;
}

/** Mirrors OperatorCatalogEndpoints.Validate, including error-key order and messages. */
export function validateOperatorRequest(input: OperatorValidationInput): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  if (!isNullOrWhiteSpace(input.locale) && (input.locale!.length > 16 || !LOCALE_PATTERN.test(input.locale!))) {
    errors.locale = ["Locale must be a short BCP 47 tag such as en, zh, or pt-BR."];
  }

  if ((input.query !== undefined && input.query.length > 100) || containsControlCharacters(input.query)) {
    errors.query = ["Search query must not exceed 100 characters or contain control characters."];
  }

  if ((input.provider !== undefined && input.provider.length > 120) || containsControlCharacters(input.provider)) {
    errors.provider = ["Provider must not exceed 120 characters or contain control characters."];
  }

  if (input.page !== undefined && (input.page < 1 || input.page > 100000)) {
    errors.page = ["Page must be between 1 and 100000."];
  }

  if (input.pageSize !== undefined && (input.pageSize < 1 || input.pageSize > 100)) {
    errors.pageSize = ["Page size must be between 1 and 100."];
  }

  if (
    input.requireSlug &&
    (isNullOrWhiteSpace(input.slug) || input.slug!.length > 120 || !SLUG_PATTERN.test(input.slug!))
  ) {
    errors.slug = ["Slug must contain lowercase ASCII letters, numbers, and single hyphens only."];
  }

  return errors;
}

/** OperatorCatalogEndpoints.NormalizeOptional. */
function normalizeOptional(value: string | undefined): string | undefined {
  return isNullOrWhiteSpace(value) ? undefined : dotnetTrim(value!);
}

function setPrivateReviewHeaders(res: Response): void {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
}

/**
 * Development-only Draft review routes: the Stage B port of Savora.Api.Endpoints.OperatorCatalogEndpoints.
 * Registered only when the environment is Development, as MapOperatorCatalogEndpoints is.
 */
@Controller("v1/operator")
export class OperatorController {
  constructor(
    @Inject(OPERATOR_CATALOG_QUERIES) private readonly catalog: OperatorCatalogQueries,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get("recipes")
  async listDraftRecipes(@Req() req: Request, @Res() res: Response): Promise<void> {
    // Parameter binding runs before the handler body, so a binding failure precedes the loopback check.
    const locale = readQueryValue(req, "locale");
    const query = readQueryValue(req, "query");
    const provider = readQueryValue(req, "provider");
    const page = bindNullableInt32(readQueryValue(req, "page"));
    const pageSize = bindNullableInt32(readQueryValue(req, "pageSize"));
    if (!page.ok || !pageSize.ok) return writeBindingFailure(res, this.config.environment);

    if (!isLoopbackAddress(req.socket.remoteAddress)) return writeEmpty(res, 404);

    setPrivateReviewHeaders(res);
    const errors = validateOperatorRequest({
      locale,
      query,
      provider,
      page: page.value,
      pageSize: pageSize.value,
      requireSlug: false,
      slug: undefined,
    });
    if (hasErrors(errors)) return writeValidationProblem(res, errors);

    const result = await this.catalog.listDraftRecipes(
      normalizeLocale(locale),
      normalizeOptional(query),
      normalizeOptional(provider),
      page.value ?? 1,
      pageSize.value ?? 50,
    );
    writeJson(res, 200, result);
  }

  @Get("recipes/:slug")
  async getDraftRecipe(@Req() req: Request, @Res() res: Response): Promise<void> {
    const slug = String(req.params.slug ?? "");
    const locale = readQueryValue(req, "locale");

    if (!isLoopbackAddress(req.socket.remoteAddress)) return writeEmpty(res, 404);

    setPrivateReviewHeaders(res);
    const errors = validateOperatorRequest({
      locale,
      query: undefined,
      provider: undefined,
      page: undefined,
      pageSize: undefined,
      requireSlug: true,
      slug,
    });
    if (hasErrors(errors)) return writeValidationProblem(res, errors);

    const result = await this.catalog.getDraftRecipe(slug, normalizeLocale(locale));
    if (result === null) return writeEmpty(res, 404);
    writeJson(res, 200, result);
  }
}
