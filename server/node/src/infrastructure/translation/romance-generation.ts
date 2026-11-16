import type { Client } from "pg";
import { appendFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { ProductError } from "../../domain/product-error";
import { batchCatalogUnits, type TextUnit } from "./catalog-plan";
import { generationDraftState, needsGenerationRepair } from "./editorial-review";
import { OpenRouterTranslator, ROMANCE_TARGETS, ROMANCE_MAX_CHARS, ROMANCE_MAX_ITEMS, TRANSLATION_MODEL, type RomanceTarget, type TranslationConfig } from "./openrouter";
import { withReadOnlyBudgetRetries } from "./offline-transport";

interface SavedUnit { hash: string; locale: RomanceTarget; source: string; translated: string | null; review: { reason?: string } | null }
export interface RomanceBatchUnit extends TextUnit { targets: RomanceTarget[] }

/** Partition by the exact MISSING target set: never pay to overwrite an existing draft. */
export function romanceGenerationBatches(units: TextUnit[], needed: Array<{ hash: string; locale: RomanceTarget }>): RomanceBatchUnit[][] {
  const targets = new Map<string, Set<RomanceTarget>>();
  for (const item of needed) {
    const set = targets.get(item.hash) ?? new Set<RomanceTarget>(); set.add(item.locale); targets.set(item.hash, set);
  }
  const groups = new Map<string, RomanceBatchUnit[]>();
  for (const unit of units) {
    const locales = ROMANCE_TARGETS.filter(locale => targets.get(unit.hash)?.has(locale));
    if (!locales.length) continue;
    const key = locales.join(","), group = groups.get(key) ?? [];
    group.push({ ...unit, targets: locales }); groups.set(key, group);
  }
  return [...groups.values()].flatMap(group => batchCatalogUnits(group, ROMANCE_MAX_CHARS, ROMANCE_MAX_ITEMS));
}

/** Called only by the offline CLI while it owns the existing PostgreSQL advisory lock. */
export async function runRomanceGeneration(client: Client, config: TranslationConfig, runId: string,
  units: TextUnit[], evidenceDir: string, sample: boolean, limit: () => Promise<void>, baseTransport: typeof fetch = fetch): Promise<void> {
  const diagnostic = (event: object) => {
    const entry = { runId, at: new Date().toISOString(), ...event };
    appendFileSync(path.join(evidenceDir, "worker-events.jsonl"), JSON.stringify(entry) + "\n"); console.error(JSON.stringify(entry));
  };
  let generations = 0;
  for (const phase of ["Pending", "NeedsChanges"] as const) {
    const saved: SavedUnit[] = (await client.query(`SELECT source_sha256 hash,locale,source_text source,translated_text translated,review
      FROM translation_units WHERE locale=ANY($1::text[]) AND state=$2 AND attempts<2 AND source_sha256=ANY($3::text[])`,
      [ROMANCE_TARGETS, phase, units.map(unit => unit.hash)])).rows;
    const needed = phase === "NeedsChanges" ? saved.filter(needsGenerationRepair) : saved;
    if (needed.length < saved.length) diagnostic({ event: "editorial-only-drafts-preserved", locales: ROMANCE_TARGETS,
      units: saved.length - needed.length, paidRequests: 0 });
    for (const batch of romanceGenerationBatches(units, needed)) {
      if ((await client.query("SELECT state FROM translation_runs WHERE id=$1", [runId])).rows[0].state !== "Running") {
        diagnostic({ stoppedAtCheckpoint: true }); return;
      }
      const hashes = batch.map(unit => unit.hash), texts = batch.map(unit => unit.source), locales = batch[0]!.targets;
      let batchCost = 0, batchTokens = 0;
      const budgetTransport = withReadOnlyBudgetRetries(baseTransport, event => diagnostic({ event: "transport-failure",
        locales, phase, unitHashes: hashes, ...event }));
      const transport: typeof fetch = async (input, init) => {
        const response = await budgetTransport(input, init);
        if (String(input).endsWith("/chat/completions")) {
          if (!response.ok) diagnostic({ event: "generation-rejected", providerHttpStatus: response.status, locales, phase, unitHashes: hashes });
          else {
            const reader = response.clone().body!.getReader(), parts: Uint8Array[] = []; let size = 0;
            for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length;
              if (size > 128 * 1024) { await reader.cancel(); throw new Error("Oversized provider response."); } parts.push(part.value); }
            const metadata = JSON.parse(Buffer.concat(parts).toString("utf8"));
            if (!Number.isFinite(metadata.usage?.cost) || metadata.usage.cost < 0 || !Number.isInteger(metadata.usage?.total_tokens)) throw new Error("Missing provider usage accounting.");
            batchCost += metadata.usage.cost; batchTokens += metadata.usage.total_tokens; generations++;
            const choice = metadata.choices?.[0];
            writeFileSync(path.join(evidenceDir, `${randomUUID()}.json`), JSON.stringify({ model: metadata.model, usage: metadata.usage,
              finishReason: choice?.finish_reason, content: choice?.message?.content,
              batch: { workflow: "romance-generation-first", locales, phase, hashes, texts } }, null, 2), { flag: "wx" });
          }
        }
        return response;
      };
      try {
        // A single parameterized update records all intended locale/hash pairs before the paid POST.
        const started = await client.query(`UPDATE translation_units SET state='Failed',attempts=attempts+1,updated_at=now()
          WHERE locale=ANY($1::text[]) AND source_sha256=ANY($2::text[]) AND state=$3 AND attempts<2 RETURNING locale,source_sha256`,
          [locales, hashes, phase]);
        if (started.rowCount !== locales.length * batch.length) throw new Error("Grouped translation checkpoint is stale.");
        const translator = new OpenRouterTranslator(config, transport, limit, Date.now, { timeoutMs: 90000,
          onInvalidItem: () => {}, fieldKinds: batch.map(unit => unit.kind), recipeContext: batch[0]!.recipeContext });
        let result: Awaited<ReturnType<OpenRouterTranslator["translateRomance"]>>;
        try { result = await translator.translateRomance(texts, locales); }
        catch (error) {
          if (!(error instanceof ProductError) || error.code !== "InvalidTranslationOutput") throw error;
          await client.query(`UPDATE translation_units SET state='NeedsChanges',translated_text=COALESCE(translated_text,source_text),
            review=COALESCE(review,'{}'::jsonb) || '{"reason":"Provider response failed whole-batch validation; original retained for bounded correction."}'::jsonb,
            updated_at=now() WHERE locale=ANY($1::text[]) AND source_sha256=ANY($2::text[]) AND state='Failed'`, [locales, hashes]);
          diagnostic({ rejectedBatch: batch.length, locales, unsafeOutputNotPublished: true });
          if (sample) { diagnostic({ sampleComplete: true, requiresCorrection: true }); return; }
          continue;
        }
        const rejected = new Set(result.invalid.map(item => `${item.index}:${item.locale}`));
        const rows = batch.flatMap((unit, index) => locales.map(locale => ({ hash: unit.hash, locale,
          text: result.translations[index]![locale]!, state: generationDraftState(rejected.has(`${index}:${locale}`)),
          review: { method: "generation-only-awaiting-editorial", workflow: "romance-generation-first", editorialRequired: true,
            fieldContext: unit.kind, ...(unit.recipeContext ? { recipeContext: unit.recipeContext } : {}),
            reason: rejected.has(`${index}:${locale}`) ? "Mechanical validation rejected the model output; original retained, correction required." : null } })));
        // One SQL statement is atomic across the three target checkpoint sets.
        const applied = await client.query(`UPDATE translation_units u SET translated_text=x.text,state=x.state,model=$2::text,
          review=COALESCE(u.review,'{}'::jsonb) || x.review || jsonb_build_object('generationModel',$2::text,
            'previousGenerationModel',CASE WHEN u.translated_text IS NOT NULL AND u.translated_text<>u.source_text THEN u.model ELSE NULL END),updated_at=now()
          FROM jsonb_to_recordset($1::jsonb) AS x(hash text,locale text,text text,state text,review jsonb)
          WHERE u.source_sha256=x.hash AND u.locale=x.locale AND u.state='Failed'`, [JSON.stringify(rows), TRANSLATION_MODEL]);
        if (applied.rowCount !== rows.length) throw new Error("Grouped translation checkpoint could not be saved.");
        diagnostic({ event: "grouped-generation-saved", locales, phase, units: batch.length, localeUnits: rows.length,
          mechanicalIssues: result.invalid.length, modelAuditRequests: 0, editorialRequired: true, batchCostUsd: batchCost,
          tokens: batchTokens, generations });
        if (sample) { diagnostic({ sampleComplete: true }); return; }
      } finally {
        // One paid response is charged exactly ONCE, never once per target language.
        if (batchCost || batchTokens) await client.query(`UPDATE translation_units SET reported_cost_usd=reported_cost_usd+$3,
          total_tokens=total_tokens+$4,updated_at=now() WHERE locale=$1 AND source_sha256=$2`, [locales[0], hashes[0], batchCost, batchTokens]);
        await client.query("UPDATE translation_runs SET updated_at=now() WHERE id=$1", [runId]);
      }
    }
  }
}
