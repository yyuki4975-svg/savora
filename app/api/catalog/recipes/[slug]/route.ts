import { getRecipe, isCatalogApiEnabled } from "../../../../../lib/api/savora-client";

// Public first-party read only. No operator data, request-controlled upstream or provider credentials.
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/route
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  const { slug } = await params, locale = new URL(request.url).searchParams.get("locale") ?? "en";
  if (slug.length > 240 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !["en", "zh", "ja", "fr", "it", "es"].includes(locale)) {
    return Response.json({ error: "Invalid catalog request" }, { status: 422, headers });
  }
  if (!isCatalogApiEnabled()) return Response.json({ error: "Catalog unavailable" }, { status: 503, headers });
  const result = await getRecipe(slug, locale);
  return result.status === "ok" ? Response.json(result.data, { headers }) :
    Response.json({ error: result.status === "not-found" ? "Recipe not found" : "Catalog unavailable" }, { status: result.status === "not-found" ? 404 : 503, headers });
}
