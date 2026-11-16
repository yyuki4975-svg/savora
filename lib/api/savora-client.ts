import "server-only";

import type { operations } from "./schema";

export type RecipeDetail = operations["GetRecipe"]["responses"][200]["content"]["application/json"];
export type RecipeList = operations["ListRecipes"]["responses"][200]["content"]["application/json"];
export type PlaceDetail = operations["GetPlace"]["responses"][200]["content"]["application/json"];
export type DraftRecipeDetail = operations["GetDraftRecipe"]["responses"][200]["content"]["application/json"];
export type DraftRecipeList = operations["ListDraftRecipes"]["responses"][200]["content"]["application/json"];
export type DiscoveryRecipeList = operations["ListDiscoveryRecipes"]["responses"][200]["content"]["application/json"];
export type DiscoveryRecipeSummary = DiscoveryRecipeList["items"][number];

export type CatalogResult<T> =
  | { status: "ok"; data: T }
  | { status: "not-found" }
  | { status: "error"; message: string };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const externalMealIdPattern = /^\d{1,12}$/;
const localePattern = /^[A-Za-z]{2,3}(?:-[A-Za-z]{2})?$/;
const unavailableMessage = "The canonical catalog is temporarily unavailable. Please try again shortly.";
const draftPageSize = 100;
const maxDraftPages = 10;

type JsonRecord = Record<string, unknown>;
type Validator<T> = (value: unknown) => value is T;

export function isCatalogApiEnabled() {
  const explicit = process.env.SAVORA_CATALOG_API_ENABLED?.trim().toLowerCase();
  if (explicit === "false") return false;
  return explicit === "true" || Boolean(process.env.SAVORA_API_BASE_URL?.trim());
}

export function isDraftCatalogEnabled() {
  return import.meta.env.DEV &&
    process.env.SAVORA_DRAFT_CATALOG_ENABLED?.trim().toLowerCase() === "true";
}

function getApiBaseUrl() {
  const configured = process.env.SAVORA_API_BASE_URL?.trim();
  if (!configured) throw new Error("SAVORA_API_BASE_URL is required when the catalog API feature is enabled.");

  const url = new URL(configured);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("SAVORA_API_BASE_URL must use HTTP or HTTPS.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("SAVORA_API_BASE_URL must not contain credentials, a query, or a fragment.");
  }
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
}

function getDraftApiBaseUrl() {
  const url = getApiBaseUrl();
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error("The Development Draft catalog must use a loopback API URL.");
  }
  return url;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isNumberLike(value: unknown): value is number | string {
  return (typeof value === "number" && Number.isFinite(value)) ||
    (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)));
}

function isNullableNumberLike(value: unknown): value is number | string | null {
  return value === null || isNumberLike(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isSafeHttpUrl(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isIngredient(value: unknown) {
  return isRecord(value) &&
    isNumberLike(value.position) &&
    isString(value.name) &&
    isNullableNumberLike(value.quantity) &&
    isNullableString(value.unit) &&
    isNullableString(value.preparationNote);
}

function isStep(value: unknown) {
  return isRecord(value) &&
    isNumberLike(value.position) &&
    isNullableString(value.title) &&
    isString(value.instruction) &&
    isNullableNumberLike(value.durationMinutes);
}

function isSource(value: unknown) {
  return isRecord(value) &&
    isSafeHttpUrl(value.sourceUrl) &&
    isString(value.sourceName) &&
    isString(value.licenseCode) &&
    isString(value.retrievedAt) &&
    isNullableString(value.externalId);
}

function isPlace(value: unknown) {
  return isRecord(value) &&
    isString(value.id) &&
    isString(value.slug) &&
    isString(value.type) &&
    isString(value.locale) &&
    isString(value.name) &&
    isNullableNumberLike(value.latitude) &&
    isNullableNumberLike(value.longitude) &&
    isNullableString(value.wikidataId);
}

function isRecipePlaceAssociation(value: unknown) {
  return isRecord(value) &&
    isPlace(value.place) &&
    ["Origin", "RegionalVariation", "Diaspora", "DiscoveryAnchor"].includes(
      isString(value.relationType) ? value.relationType : "",
    ) &&
    typeof value.isPrimary === "boolean";
}

function isRecipeSummary(value: unknown) {
  return isRecord(value) &&
    isString(value.id) &&
    isString(value.slug) &&
    isString(value.locale) &&
    isString(value.title) &&
    isString(value.summary) &&
    isNumberLike(value.servings) &&
    isNullableNumberLike(value.preparationMinutes) &&
    isNullableNumberLike(value.cookingMinutes) &&
    isNullableString(value.publishedAt);
}

function isOperatorMedia(value: unknown) {
  return isRecord(value) &&
    isString(value.id) &&
    isNumberLike(value.position) &&
    typeof value.isPrimary === "boolean" &&
    isString(value.provider) &&
    isString(value.externalId) &&
    isNullableString(value.storageKey) &&
    (value.sourceUrl === null || isSafeHttpUrl(value.sourceUrl)) &&
    isString(value.contentType) &&
    isString(value.altText) &&
    isString(value.creator) &&
    isString(value.licenseCode) &&
    isSafeHttpUrl(value.licenseUrl) &&
    isNullableNumberLike(value.width) &&
    isNullableNumberLike(value.height) &&
    isString(value.rightsStatus);
}

function isPublicMedia(value: unknown) {
  return isRecord(value) &&
    isNullableString(value.storageKey) &&
    (value.sourceUrl === null || isSafeHttpUrl(value.sourceUrl)) &&
    (value.storageKey !== null || value.sourceUrl !== null) &&
    isString(value.contentType) &&
    isString(value.altText) &&
    isString(value.creator) &&
    isString(value.licenseCode) &&
    isSafeHttpUrl(value.licenseUrl) &&
    isString(value.provider) &&
    isString(value.externalId) &&
    isNullableNumberLike(value.width) &&
    isNullableNumberLike(value.height);
}

function isDraftRecipeSummary(value: unknown) {
  return isRecord(value) &&
    isString(value.id) &&
    isString(value.slug) &&
    value.status === "Draft" &&
    isNullableNumberLike(value.latestVersion) &&
    isNullableString(value.originalLocale) &&
    isNullableString(value.locale) &&
    isNullableString(value.title) &&
    isNullableString(value.summary) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    isStringArray(value.providers) &&
    (value.primaryMedia === null || isOperatorMedia(value.primaryMedia)) &&
    isStringArray(value.issues);
}

const isRecipeDetail: Validator<RecipeDetail> = (value): value is RecipeDetail =>
  isRecord(value) &&
  isString(value.id) &&
  isString(value.slug) &&
  isString(value.locale) &&
  isString(value.title) &&
  isString(value.summary) &&
  isNullableString(value.culturalNote) &&
  isNumberLike(value.version) &&
  isNumberLike(value.servings) &&
  isNullableNumberLike(value.preparationMinutes) &&
  isNullableNumberLike(value.cookingMinutes) &&
  isNullableString(value.publishedAt) &&
  Array.isArray(value.ingredients) && value.ingredients.every(isIngredient) &&
  Array.isArray(value.steps) && value.steps.every(isStep) &&
  Array.isArray(value.sources) && value.sources.every(isSource) &&
  Array.isArray(value.places) && value.places.every(isRecipePlaceAssociation) &&
  (value.primaryMedia === null || isPublicMedia(value.primaryMedia));

const isRecipeList: Validator<RecipeList> = (value): value is RecipeList =>
  isRecord(value) && Array.isArray(value.items) && value.items.every(isRecipeSummary);

const isDiscoveryRecipeSummary = (value: unknown): value is DiscoveryRecipeSummary =>
  isRecord(value) &&
  isString(value.id) &&
  isString(value.slug) &&
  isString(value.locale) &&
  isString(value.title) &&
  isString(value.summary) &&
  isNullableString(value.culturalNote) &&
  isNullableNumberLike(value.preparationMinutes) &&
  isNullableNumberLike(value.cookingMinutes) &&
  isNullableString(value.publishedAt) &&
  isStringArray(value.ingredients) &&
  (value.source === null || isSource(value.source)) &&
  Array.isArray(value.places) && value.places.every(isRecipePlaceAssociation) &&
  (value.primaryMedia === null || isPublicMedia(value.primaryMedia));

const isDiscoveryRecipeList: Validator<DiscoveryRecipeList> = (value): value is DiscoveryRecipeList =>
  isRecord(value) && Array.isArray(value.items) && value.items.every(isDiscoveryRecipeSummary);

const isPlaceDetail: Validator<PlaceDetail> = (value): value is PlaceDetail => isPlace(value);

const isDraftRecipeList: Validator<DraftRecipeList> = (value): value is DraftRecipeList =>
  isRecord(value) &&
  isNumberLike(value.page) &&
  isNumberLike(value.pageSize) &&
  isNumberLike(value.totalItems) &&
  isNumberLike(value.totalPages) &&
  Array.isArray(value.items) && value.items.every(isDraftRecipeSummary);

const isDraftRecipeDetail: Validator<DraftRecipeDetail> = (value): value is DraftRecipeDetail =>
  isRecord(value) &&
  isString(value.id) &&
  isString(value.slug) &&
  value.status === "Draft" &&
  isNullableString(value.currentVersionId) &&
  isNullableNumberLike(value.latestVersion) &&
  isNullableString(value.originalLocale) &&
  isNullableString(value.locale) &&
  isNullableString(value.title) &&
  isNullableString(value.summary) &&
  isNullableString(value.culturalNote) &&
  isNullableNumberLike(value.servings) &&
  isNullableNumberLike(value.preparationMinutes) &&
  isNullableNumberLike(value.cookingMinutes) &&
  isString(value.createdAt) &&
  isString(value.updatedAt) &&
  isNullableString(value.publishedAt) &&
  Array.isArray(value.ingredients) && value.ingredients.every(isIngredient) &&
  Array.isArray(value.steps) && value.steps.every(isStep) &&
  Array.isArray(value.sources) && value.sources.every(isSource) &&
  Array.isArray(value.places) && value.places.every(isRecipePlaceAssociation) &&
  Array.isArray(value.media) && value.media.every(isOperatorMedia) &&
  isStringArray(value.issues);

async function requestCatalog<T>(
  path: string,
  locale: string,
  validator: Validator<T>,
  access: "public" | "development-draft" = "public",
): Promise<CatalogResult<T>> {
  try {
    const url = new URL(
      path.replace(/^\//, ""),
      access === "development-draft" ? getDraftApiBaseUrl() : getApiBaseUrl(),
    );
    url.searchParams.set("locale", locale);
    const response = access === "development-draft"
      ? await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      })
      : await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(5_000),
      });

    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) {
      console.error(`[Savora catalog] ${path} returned HTTP ${response.status}.`);
      return { status: "error", message: unavailableMessage };
    }

    const payload: unknown = await response.json();
    if (!validator(payload)) {
      console.error(`[Savora catalog] ${path} returned an invalid response shape.`);
      return { status: "error", message: unavailableMessage };
    }

    return { status: "ok", data: payload };
  } catch (error) {
    const reason = error instanceof Error ? error.name : "UnknownError";
    console.error(`[Savora catalog] ${path} request failed (${reason}).`);
    return { status: "error", message: unavailableMessage };
  }
}

function validLocale(locale: string) {
  return localePattern.test(locale);
}

export async function listRecipes(locale = "en", limit = 24): Promise<CatalogResult<RecipeList>> {
  if (!validLocale(locale) || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return { status: "error", message: unavailableMessage };
  }
  return requestCatalog(`/v1/recipes?limit=${limit}`, locale, isRecipeList);
}

export async function listDiscoveryRecipes(locale = "en"): Promise<CatalogResult<DiscoveryRecipeList>> {
  if (!validLocale(locale)) return { status: "error", message: unavailableMessage };
  const items: DiscoveryRecipeSummary[] = [];
  const identities = new Set<string>();
  // 1,000 records exceed Next's 2 MiB serialized fetch-cache limit. Smaller
  // public pages remain cacheable while preserving the API's existing limits.
  const pageSize = 500;
  for (let offset = 0; offset < 11000; offset += pageSize) {
    const page = await requestCatalog(`/v1/discovery/recipes?limit=${pageSize}${offset ? `&offset=${offset}` : ""}`, locale, isDiscoveryRecipeList);
    if (page.status !== "ok") return page;
    for (const item of page.data.items) {
      if (identities.has(item.slug)) return { status: "error", message: unavailableMessage };
      identities.add(item.slug); items.push(item);
    }
    if (page.data.items.length < pageSize) return { status: "ok", data: { items } };
  }
  return { status: "error", message: unavailableMessage };
}

export async function getRecipe(slug: string, locale = "en"): Promise<CatalogResult<RecipeDetail>> {
  if (!slugPattern.test(slug) || !validLocale(locale)) return { status: "not-found" };
  return requestCatalog(`/v1/recipes/${encodeURIComponent(slug)}`, locale, isRecipeDetail);
}

export async function getPlace(slug: string, locale = "en"): Promise<CatalogResult<PlaceDetail>> {
  if (!slugPattern.test(slug) || !validLocale(locale)) return { status: "not-found" };
  return requestCatalog(`/v1/places/${encodeURIComponent(slug)}`, locale, isPlaceDetail);
}

async function listDraftRecipePage(
  locale: string,
  provider: string,
  page: number,
): Promise<CatalogResult<DraftRecipeList>> {
  if (!isDraftCatalogEnabled() || !validLocale(locale) || provider !== "TheMealDB") {
    return { status: "error", message: unavailableMessage };
  }
  const path = `/v1/operator/recipes?provider=${encodeURIComponent(provider)}&page=${page}&pageSize=${draftPageSize}`;
  return requestCatalog(path, locale, isDraftRecipeList, "development-draft");
}

export async function listAllDraftRecipes(locale = "en"): Promise<CatalogResult<DraftRecipeList>> {
  const first = await listDraftRecipePage(locale, "TheMealDB", 1);
  if (first.status !== "ok") return first;

  const totalPages = Number(first.data.totalPages);
  const totalItems = Number(first.data.totalItems);
  if (!Number.isInteger(totalPages) || totalPages < 0 || totalPages > maxDraftPages ||
      !Number.isInteger(totalItems) || totalItems < 0 || totalItems > draftPageSize * maxDraftPages) {
    return { status: "error", message: unavailableMessage };
  }

  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
      listDraftRecipePage(locale, "TheMealDB", index + 2)),
  );
  if (remaining.some((result) => result.status !== "ok")) {
    return { status: "error", message: unavailableMessage };
  }

  const items = [
    ...first.data.items,
    ...remaining.flatMap((result) => result.status === "ok" ? result.data.items : []),
  ];
  const identities = new Set(items.map((item) => `${item.id}:${item.slug}`));
  if (items.length !== totalItems || identities.size !== items.length) {
    return { status: "error", message: unavailableMessage };
  }

  return { status: "ok", data: { ...first.data, page: 1, pageSize: draftPageSize, items } };
}

async function getDraftRecipe(slug: string, locale: string): Promise<CatalogResult<DraftRecipeDetail>> {
  if (!isDraftCatalogEnabled() || !slugPattern.test(slug) || !validLocale(locale)) {
    return { status: "not-found" };
  }
  return requestCatalog(
    `/v1/operator/recipes/${encodeURIComponent(slug)}`,
    locale,
    isDraftRecipeDetail,
    "development-draft",
  );
}

export async function getDraftRecipeByReference(
  reference: string,
  locale = "en",
): Promise<CatalogResult<DraftRecipeDetail>> {
  if (!isDraftCatalogEnabled() || !validLocale(locale)) return { status: "not-found" };
  if (slugPattern.test(reference) && reference.startsWith("themealdb-")) {
    return getDraftRecipe(reference, locale);
  }
  if (!externalMealIdPattern.test(reference)) return { status: "not-found" };

  const lookup = await requestCatalog(
    `/v1/operator/recipes?provider=TheMealDB&query=${encodeURIComponent(reference)}&page=1&pageSize=2`,
    locale,
    isDraftRecipeList,
    "development-draft",
  );
  if (lookup.status !== "ok") return lookup;
  const matches = lookup.data.items.filter((item) => item.slug.startsWith(`themealdb-${reference}-`));
  if (matches.length !== 1) return { status: "not-found" };
  return getDraftRecipe(matches[0].slug, locale);
}
