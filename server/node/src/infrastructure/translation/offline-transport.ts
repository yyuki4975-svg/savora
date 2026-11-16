/** Offline diagnostics never include error messages, URLs, headers, bodies or credentials. */
export function safeTransportError(error: unknown): { errorType: string; networkCode?: string } {
  const value = error as { name?: unknown; cause?: { code?: unknown } } | null;
  const names = ["TypeError", "TimeoutError", "AbortError", "SyntaxError"];
  const codes = ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_SOCKET", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT"];
  const errorType = typeof value?.name === "string" && names.includes(value.name) ? value.name : "UnknownError";
  const code = value?.cause?.code;
  return { errorType, ...(typeof code === "string" && codes.includes(code) ? { networkCode: code } : {}) };
}

type Diagnostic = { endpoint: "key" | "generation"; attempt: number; elapsedMs: number; httpStatus?: number; errorType?: string; networkCode?: string; retrying: boolean;
  retryAfterSeconds?: number; providerErrorType?: string; limitSource?: string; limitReason?: string;
  requestQuotaMentioned?: boolean; tokenQuotaMentioned?: boolean; dailyQuotaMentioned?: boolean; creditQuotaMentioned?: boolean };
/** Inspect a bounded error clone, returning only allowlisted categories/booleans.
 * No raw messages, provider metadata, response headers or secret echoes are logged. */
async function rateLimitDiagnostic(response: Response): Promise<Partial<Diagnostic>> {
  if (response.status !== 429 && response.status !== 402) return {};
  const retry = response.headers.get("Retry-After");
  const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : NaN;
  const result: Partial<Diagnostic> = Number.isFinite(seconds) && seconds <= 86400 ? { retryAfterSeconds: seconds } : {};
  const reader = response.clone().body?.getReader();
  if (!reader) return result;
  try {
    const parts: Uint8Array[] = []; let size = 0;
    for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length;
      if (size > 8192) { void reader.cancel().catch(() => {}); return result; } parts.push(part.value); }
    const error = JSON.parse(Buffer.concat(parts).toString("utf8"))?.error;
    const type = error?.metadata?.error_type;
    if (["rate_limit_exceeded", "provider_overloaded", "insufficient_credits"].includes(type)) result.providerErrorType = type;
    // Only official machine-readable classifications; never log remedy_hint/raw metadata.
    // Source: https://openrouter.ai/docs/api_reference/limits#in-flight-spending-budget
    const limitSource = error?.metadata?.limit_source;
    const limitReason = error?.metadata?.reason;
    if (["openrouter_in_flight_budget", "openrouter_key_limit", "openrouter_credits"].includes(limitSource)) result.limitSource = limitSource;
    if (["in_flight_budget_exhausted", "weight_exceeds_budget"].includes(limitReason)) result.limitReason = limitReason;
    const message = [error?.message, error?.metadata?.raw].filter(value => typeof value === "string").join(" ");
    result.requestQuotaMentioned = /requests? per|requests?\/min|requests? limit|\brpm\b/i.test(message);
    result.tokenQuotaMentioned = /tokens? per|tokens?\/min|tokens? limit|\btpm\b/i.test(message);
    result.dailyQuotaMentioned = /per day|daily|requests?\/day|\brpd\b/i.test(message);
    result.creditQuotaMentioned = /credits?|balance|spending|budget/i.test(message);
  } catch { /* Non-JSON/malformed diagnostics cannot change the original response. */ }
  return result;
}
/** Only GET /key is retried (max three attempts). Paid POST is never replayed.
 * Source: https://openrouter.ai/docs/api_reference/errors-and-debugging#retry-after-header
 */
export function withReadOnlyBudgetRetries(transport: typeof fetch, log: (event: Diagnostic) => void,
  pause: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))): typeof fetch {
  return async (input, init) => {
    const readOnly = String(input) === "https://openrouter.ai/api/v1/key" && (!init?.method || init.method === "GET");
    const endpoint = readOnly ? "key" : "generation";
    for (let attempt = 1; ; attempt++) {
      const started = Date.now();
      let response: Response;
      try { response = await transport(input, init); }
      catch (error) {
        const safe = safeTransportError(error);
        const retrying = readOnly && attempt < 3 && ["TypeError", "TimeoutError", "AbortError"].includes(safe.errorType);
        log({ endpoint, attempt, elapsedMs: Date.now() - started, ...safe, retrying });
        if (!retrying) throw error;
        // A fresh deadline is required: the previous AbortSignal might already be aborted.
        await pause(attempt * 2000);
        init = { ...init, signal: AbortSignal.timeout(30000) };
        continue;
      }
      const seconds = Number(response.headers.get("Retry-After"));
      const retrying = readOnly && attempt < 3 && [429, 502, 503, 504].includes(response.status) && !(Number.isFinite(seconds) && seconds > 30);
      if (!response.ok) log({ endpoint, attempt, elapsedMs: Date.now() - started, httpStatus: response.status, retrying, ...await rateLimitDiagnostic(response) });
      if (!retrying) return response;
      // Do not retry earlier than a longer provider backoff; leave a checkpoint instead.
      await response.body?.cancel();
      await pause(Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : attempt * 2000);
      init = { ...init, signal: AbortSignal.timeout(30000) };
    }
  };
}
