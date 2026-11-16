import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { CATALOG_QUERIES, type CatalogQueries } from "../application/catalog/catalog-queries";
import { APP_CONFIG, type AppConfig } from "../config";
import { dotnetTrim } from "../domain/text";
import {
  bindNullableInt32,
  hasErrors,
  normalizeLocale,
  readQueryValue,
  validateCatalogRequest,
} from "./catalog-request";
import { writeBindingFailure, writeEmpty, writeJson, writeValidationProblem } from "./http-results";

/** Public catalog routes: the Stage A port of Savora.Api.Endpoints.CatalogEndpoints. */
@Controller("v1")
export class CatalogController {
  constructor(
    @Inject(CATALOG_QUERIES) private readonly catalog: CatalogQueries,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get("recipes")
  async listRecipes(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.list(req, res, 24, 50, (locale, query, limit) => this.catalog.listRecipes(locale, query, limit));
  }

  @Get("discovery/recipes")
  async listDiscoveryRecipes(@Req() req: Request, @Res() res: Response): Promise<void> {
    const offset = bindNullableInt32(readQueryValue(req, "offset"));
    if (!offset.ok) return writeBindingFailure(res, this.config.environment);
    if (offset.value !== undefined && offset.value !== null && (offset.value < 0 || offset.value > 10000)) {
      return writeValidationProblem(res, { offset: ["Offset must be between 0 and 10000."] });
    }
    await this.list(req, res, 1000, 1000, (locale, query, limit) =>
      this.catalog.listDiscoveryRecipes(locale, query, limit, offset.value ?? 0),
    );
  }

  @Get("recipes/:slug")
  async getRecipe(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.detail(req, res, (slug, locale) => this.catalog.getRecipe(slug, locale));
  }

  @Get("places/:slug")
  async getPlace(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.detail(req, res, (slug, locale) => this.catalog.getPlace(slug, locale));
  }

  private async list(
    req: Request,
    res: Response,
    defaultLimit: number,
    maximumLimit: number,
    load: (locale: string, query: string | undefined, limit: number) => Promise<unknown>,
  ): Promise<void> {
    const locale = readQueryValue(req, "locale");
    const query = readQueryValue(req, "query");
    const limit = bindNullableInt32(readQueryValue(req, "limit"));
    if (!limit.ok) return writeBindingFailure(res, this.config.environment);

    const errors = validateCatalogRequest({
      locale,
      query,
      limit: limit.value,
      requireSlug: false,
      slug: undefined,
      maximumLimit,
    });
    if (hasErrors(errors)) return writeValidationProblem(res, errors);

    const result = await load(
      normalizeLocale(locale),
      query === undefined ? undefined : dotnetTrim(query),
      limit.value ?? defaultLimit,
    );
    writeJson(res, 200, result);
  }

  private async detail(
    req: Request,
    res: Response,
    load: (slug: string, locale: string) => Promise<unknown | null>,
  ): Promise<void> {
    const slug = String(req.params.slug ?? "");
    const locale = readQueryValue(req, "locale");

    const errors = validateCatalogRequest({ locale, query: undefined, limit: undefined, requireSlug: true, slug });
    if (hasErrors(errors)) return writeValidationProblem(res, errors);

    const result = await load(slug, normalizeLocale(locale));
    if (result === null) return writeEmpty(res, 404);
    writeJson(res, 200, result);
  }
}
