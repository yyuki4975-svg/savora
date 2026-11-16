// BFF only. The OpenRouter key is loaded exclusively by the Node API.
import { catalogTextTranslations, isCatalogTextLocale } from "../../../lib/api/localized-catalog-text";
import { nodeRequestOrigin } from "../../../lib/auth/node-request-origin.mjs";

// After an upstream failure, skip it for a while; reviewed catalog text is still served meanwhile.
let upstreamBlockedUntil = 0;

export async function POST(request: Request) {
  request = nodeRequestOrigin(request);
  let phase = "body";
  let known: Array<string | undefined> | null = null;
  let requestTexts: string[] = [];
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  const merge = (upstream: string[]) => {
    if (!known) return upstream;
    let next = 0;
    return known.map((text, index) => text ?? upstream[next++] ?? requestTexts[index]);
  };
  const reject = (status: number, code: string) => Response.json({ error: "Translation unavailable", code }, { status, headers });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reject(403, "InvalidOrigin");
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? "")) return reject(415, "JsonRequired");
  try {
    const reader = request.body?.getReader();
    if (!reader) return reject(400, "InvalidJson");
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.length;
      if (size > 48 * 1024) { await reader.cancel(); return reject(413, "BodyTooLarge"); }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let payload: unknown;
    try { payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { return reject(400, "InvalidJson"); }
    // Recipe titles/summaries come from the reviewed catalog translations first; only the rest goes upstream.
    const request_ = payload as { texts?: unknown; target?: unknown; source?: unknown };
    if (Array.isArray(request_.texts)) requestTexts = request_.texts as string[];
    if (Array.isArray(request_.texts) && request_.texts.every(text => typeof text === "string") && isCatalogTextLocale(request_.target)
      && (request_.source === undefined || request_.source === "en")) {
      const catalog = await catalogTextTranslations(request_.target).catch(() => null);
      if (catalog) {
        known = (request_.texts as string[]).map(text => catalog.get(text.trim()) ?? undefined);
        if (known.every(text => text !== undefined)) return Response.json({ translations: known, cached: true }, { headers });
        payload = { ...request_, texts: (request_.texts as string[]).filter((_, index) => known![index] === undefined) };
      }
    }
    // Unresolved text could not be translated right now: answer with what is known, never with an error that
    // would make the browser stop asking for the reviewed recipe names in later batches.
    const partial = (blockFor: number) => {
      if (blockFor) upstreamBlockedUntil = Date.now() + blockFor;
      return Response.json({ translations: merge([]), cached: true, partial: true }, { headers });
    };
    if (known && Date.now() < upstreamBlockedUntil) return partial(0);
    phase = "configuration";
    const base = new URL(process.env.SAVORA_API_BASE_URL || "http://localhost:5094");
    // Initial integration is a local pilot; do not expose a paid cloud endpoint.
    if (base.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname) || base.username || base.password) return known ? partial(300000) : reject(503, "TranslationPilotOnly");
    phase = "upstream";
    const response = await fetch(new URL("/v1/translate", base), {
      method: "POST", headers: { "Content-Type": "application/json", "X-Savora-Request": "1" },
      // Manual redirect is supported across workerd versions; never follow a redirect off loopback.
      // https://developers.cloudflare.com/workers/runtime-apis/request/
      body: JSON.stringify(payload), redirect: "manual", signal: AbortSignal.timeout(55000),
    });
    if (response.status >= 300 && response.status < 400) return known ? partial(300000) : reject(502, "InvalidTranslationRedirect");
    phase = "response";
    const result = await response.json() as { translations?: unknown; cached?: unknown; code?: unknown };
    // With reviewed catalog text for part of the batch, an unavailable upstream must not discard it.
    if (!response.ok && known) return partial(response.status === 429 ? 30000 : 300000);
    if (!response.ok) return reject([400, 402, 403, 413, 415, 422, 429, 502, 503].includes(response.status) ? response.status : 502,
      typeof result.code === "string" && /^[a-zA-Z_]{1,64}$/.test(result.code) ? result.code : "TranslationUnavailable");
    if (!Array.isArray(result.translations) || result.translations.some(text => typeof text !== "string")) return known ? partial(300000) : reject(502, "InvalidTranslationOutput");
    return Response.json({ translations: merge(result.translations as string[]), cached: result.cached === true }, { headers });
  } catch {
    // Bounded phase labels only: never log submitted text, provider errors or credentials.
    console.warn(`[Savora translation] Local BFF failed during ${phase}.`);
    if (known) return Response.json({ translations: merge([]), cached: true, partial: true }, { headers });
    return reject(503, phase === "upstream" ? "LocalTransportUnavailable" : phase === "response" ? "LocalResponseUnavailable" : "TranslationUnavailable");
  }
}
