import { ProductError } from "../../domain/product-error";
import { CHINESE_BACKUP_MODEL, CHINESE_TRANSLATION_MODEL, TRANSLATION_MODEL } from "./openrouter";

/** One process owns the catalog lock; both lanes drain before that lock is released. */
export async function runParallelGeneration(lanes: Array<() => Promise<void>>, onFailure: () => Promise<void>): Promise<void> {
  const results = await Promise.allSettled(lanes.map(async lane => {
    try { await lane(); } catch (error) { await onFailure(); throw error; }
  }));
  const failure = results.find(result => result.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
}

/** Reserve both in-flight requests and locally settled usage against ONE ordinary key.
 * Provider charges settle on completion; a stale GET must not erase our reservation.
 * Source: https://openrouter.ai/docs/api_reference/limits#in-flight-spending-budget
 */
export function parallelBudgetTransport(budgetUsd: number, transport: typeof fetch = fetch, unresolvedReservationUsd = 0, persistedUsageFloorUsd = 0): typeof fetch {
  if (!Number.isFinite(budgetUsd) || budgetUsd <= 0 || budgetUsd > 19) throw new Error("Invalid shared translation budget.");
  if (!Number.isFinite(unresolvedReservationUsd) || unresolvedReservationUsd < 0 || unresolvedReservationUsd > budgetUsd) throw new Error("Invalid unresolved translation reservation.");
  if (!Number.isFinite(persistedUsageFloorUsd) || persistedUsageFloorUsd < 0 || persistedUsageFloorUsd > budgetUsd) throw new Error("Invalid persisted translation usage floor.");
  let baseline: number | undefined, remoteUsage = 0, remoteRemaining = 0, settled = 0, reserved = unresolvedReservationUsd;
  const reject = (code: string): never => { throw new ProductError(402, code, "Parallel translation stopped safely."); };
  const readBounded = async (response: Response) => {
    const reader = response.clone().body?.getReader(), parts: Uint8Array[] = []; let size = 0;
    if (!reader) return reject("InvalidParallelTranslationUsage");
    for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length;
      if (size > 128 * 1024) { await reader.cancel(); reject("InvalidParallelTranslationUsage"); } parts.push(part.value); }
    return JSON.parse(Buffer.concat(parts).toString("utf8"));
  };
  return async (input, init) => {
    const key = String(input) === "https://openrouter.ai/api/v1/key" && (!init?.method || init.method === "GET");
    if (key) {
      const response = await transport(input, init);
      if (response.ok) {
        const data = (await readBounded(response) as { data?: Record<string, unknown> }).data;
        if (!data || data.is_management_key !== false || data.limit_reset !== null || typeof data.limit !== "number" ||
          data.limit <= 0 || data.limit > budgetUsd || typeof data.usage !== "number" || !Number.isFinite(data.usage) || data.usage < 0 ||
          typeof data.limit_remaining !== "number" || !Number.isFinite(data.limit_remaining) || data.limit_remaining < 0) reject("TranslationBudgetNotConfigured");
        const usage = data!.usage as number;
        // A restart must retain known settled costs even if the provider's key
        // GET is temporarily stale. The caller supplies its durable run ledger;
        // never add it again after each GET (that would double-charge locally).
        baseline ??= Math.max(usage, persistedUsageFloorUsd);
        if (usage >= remoteUsage) { remoteUsage = usage; remoteRemaining = data!.limit_remaining as number; }
      }
      return response;
    }
    if (String(input) !== "https://openrouter.ai/api/v1/chat/completions" || init?.method !== "POST" || typeof init.body !== "string") reject("InvalidParallelTranslationRequest");
    const body = JSON.parse(init!.body as string);
    const chinese = [CHINESE_TRANSLATION_MODEL, CHINESE_BACKUP_MODEL].includes(body.model);
    if ((!chinese && body.model !== TRANSLATION_MODEL) || !Number.isInteger(body.max_tokens) || body.max_tokens <= 0 || body.max_tokens > 8192 ||
      body.provider?.allow_fallbacks !== false || !Array.isArray(body.messages) || Buffer.byteLength(init!.body as string) > 128 * 1024) reject("InvalidParallelTranslationRequest");
    const inputPrice = chinese ? body.model === CHINESE_BACKUP_MODEL ? 0.04 : 0.2 : 1.5;
    const outputPrice = chinese ? body.model === CHINESE_BACKUP_MODEL ? 0.15 : 0.6 : 7.5;
    for (const [name, maximum] of [["prompt", inputPrice], ["completion", outputPrice]] as const) {
      const price = body.provider?.max_price?.[name];
      if (typeof price !== "number" || !Number.isFinite(price) || price < 0 || price > maximum) reject("InvalidParallelTranslationRequest");
    }
    // UTF-8 bytes plus bounded message/special-token overhead is a deliberately generous input bound.
    const ceiling = ((Buffer.byteLength(init!.body as string) + 1024) * inputPrice + body.max_tokens * outputPrice) / 1_000_000;
    const ownUsage = (baseline ?? budgetUsd) + settled;
    const unreported = Math.max(0, ownUsage - remoteUsage);
    if (baseline === undefined || Math.min(budgetUsd - Math.max(remoteUsage, ownUsage), remoteRemaining - unreported) - reserved - ceiling < 0.10) reject("TranslationBudgetExhausted");
    reserved += ceiling; // Synchronous reservation, BEFORE either lane yields to its paid POST.
    const response = await transport(input, init); // Never retry a paid POST; uncertainty keeps its reservation.
    if (response.ok) {
      const cost = (await readBounded(response))?.usage?.cost;
      if (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0 || cost > ceiling) reject("InvalidParallelTranslationUsage");
      settled += cost; reserved -= ceiling;
    }
    return response;
  };
}
