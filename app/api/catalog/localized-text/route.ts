// BFF only. Reviewed catalog translations (recipe titles and summaries), never a model call: safe for public pages
// whose other text comes from the local website copy.
import { catalogTextTranslations, isCatalogTextLocale } from "../../../../lib/api/localized-catalog-text";
import { nodeRequestOrigin } from "../../../../lib/auth/node-request-origin.mjs";

export async function POST(request: Request) {
  request = nodeRequestOrigin(request);
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  const reject = (status: number, code: string) => Response.json({ error: "Unavailable", code }, { status, headers });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reject(403, "InvalidOrigin");
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? "")) return reject(415, "JsonRequired");
  let payload: { texts?: unknown; target?: unknown };
  try {
    const body = await request.text();
    if (body.length > 48 * 1024) return reject(413, "BodyTooLarge");
    payload = JSON.parse(body) as typeof payload;
  } catch { return reject(400, "InvalidJson"); }
  const { texts, target } = payload;
  if (!Array.isArray(texts) || texts.length > 200 || texts.some(text => typeof text !== "string" || text.length > 3000) || !isCatalogTextLocale(target)) {
    return reject(400, "InvalidRequest");
  }
  const catalog = await catalogTextTranslations(target).catch(() => null);
  if (!catalog) return reject(503, "CatalogUnavailable");
  return Response.json({ translations: (texts as string[]).map(text => catalog.get(text.trim()) ?? text) }, { headers });
}
