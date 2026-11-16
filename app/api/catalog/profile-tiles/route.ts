import { loadProfileSavedTiles } from "../../../../lib/api/profile-gallery-server";
import { nodeRequestOrigin } from "../../../../lib/auth/node-request-origin.mjs";

// Only public tile fields; never accepts an identity, upstream URL, note or draft reference.
// No-store also keeps the submitted selection out of a shared HTTP cache.
export async function POST(request: Request) {
  request = nodeRequestOrigin(request);
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  const reject = (status: number) => Response.json({ error: "Invalid tile request" }, { status, headers });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reject(403);
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? "")) return reject(415);
  let value: unknown;
  try {
    const text = await request.text();
    if (text.length > 64 * 1024) return reject(413);
    value = JSON.parse(text);
  } catch { return reject(400); }
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== 1) return reject(400);
  const slugs = (value as { slugs?: unknown }).slugs;
  if (!Array.isArray(slugs) || slugs.length > 500 || slugs.some(slug => typeof slug !== "string" || !/^[a-z0-9][a-z0-9-]{0,119}$/.test(slug))) return reject(400);
  if (!slugs.length) return Response.json({ status: "ok", recipes: [] }, { headers });
  const result = await loadProfileSavedTiles([...new Set(slugs)]);
  return Response.json(result, { status: result.status === "error" ? 503 : 200, headers });
}
