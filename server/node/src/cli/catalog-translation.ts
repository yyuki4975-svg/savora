import { Client } from "pg";
import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { databaseUrlFromEnvironment } from "../config";
import { migrationStatus } from "../infrastructure/db/migrations";
import { OpenRouterTranslator, translationConfig, translationModelFor } from "../infrastructure/translation/openrouter";
import { batchCatalogUnits, captureCatalog, localizedPayload, PROMPT_VERSION, recipeFields, sha256, TARGETS, unitHash } from "../infrastructure/translation/catalog-plan";
import { ProductError } from "../domain/product-error";
import { assertEditorialCoverage, catalogWorkerPhases, generationDraftState, isEditorialOnlyFinding, needsGenerationRepair, numericFactsMatch, validateEditorialCorrections } from "../infrastructure/translation/editorial-review";
import { safeTransportError, withReadOnlyBudgetRetries } from "../infrastructure/translation/offline-transport";
import { romanceGenerationBatches, runRomanceGeneration } from "../infrastructure/translation/romance-generation";
import { ROMANCE_TARGETS } from "../infrastructure/translation/openrouter";
import { acceptanceDataMatches, assertRiskAcceptance, type RiskCertificate } from "../infrastructure/translation/risk-acceptance";
import { parallelBudgetTransport, runParallelGeneration } from "../infrastructure/translation/parallel-generation";

const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const lock = 202610060;
async function main() {
  const [mode = "status", ...flags] = process.argv.slice(2);
  if (!["plan", "run", "status", "report", "stage", "accept", "recover", "reaudit", "correct", "stop"].includes(mode) || flags.some(flag => !/^--(apply|sample|generate-only|group-romance|parallel-zh-romance|risk-reviewed|locale=(zh|ja|fr|it|es))$/.test(flag))) throw new Error("Invalid catalog translation command.");
  const riskReviewed = flags.includes("--risk-reviewed");
  if (riskReviewed && !["stage", "accept"].includes(mode)) throw new Error("Risk acceptance applies only to explicit local staging/acceptance.");
  const generateOnly = flags.includes("--generate-only");
  const groupRomance = flags.includes("--group-romance");
  const parallel = flags.includes("--parallel-zh-romance");
  if (parallel && (mode !== "run" || !generateOnly || groupRomance || flags.includes("--sample") || flags.some(flag => flag.startsWith("--locale=")))) throw new Error("Parallel Chinese/Romance generation requires run --generate-only without sample or locale flags.");
  if (generateOnly && mode !== "run") throw new Error("Generation-first applies only to the offline run command.");
  if (groupRomance && (mode !== "run" || !generateOnly || flags.some(flag => flag.startsWith("--locale=")))) throw new Error("Grouped Romance generation requires run --generate-only without --locale.");
  if (["run", "stage", "accept", "recover", "reaudit", "correct", "stop"].includes(mode) && !flags.includes("--apply")) throw new Error("Translation/data writes require --apply.");
  const config = translationConfig();
  const client = new Client({ connectionString: databaseUrlFromEnvironment(), connectionTimeoutMillis: 15000,
    application_name: "savora-catalog-translation", options: "-c TimeZone=UTC -c statement_timeout=30000" });
  let runId: string | undefined;
  await client.connect();
  try {
    if ((await migrationStatus(client)).pending.length) throw new Error("Apply reviewed migrations before catalog translation.");
    const catalog = await captureCatalog(client);
    if (mode === "plan") {
      console.log(JSON.stringify({ recipes: catalog.recipes.length, unitsPerLocale: catalog.units.length, sourceChars: catalog.chars,
        targets: TARGETS, sourceSha256: catalog.hash, batchesPerLocale: batchCatalogUnits(catalog.units).length,
        chineseGenerationBatches: batchCatalogUnits(catalog.units, 2000, 24).length,
        jointRomanceGenerationBatches: romanceGenerationBatches(catalog.units,
          catalog.units.flatMap(unit => ROMANCE_TARGETS.map(locale => ({ hash: unit.hash, locale })))).length })); return;
    }
    if (mode === "status") {
      console.log(JSON.stringify({ sourceSha256: catalog.hash,
        runs: (await client.query("SELECT id,state,source_sha256,updated_at FROM translation_runs ORDER BY created_at DESC LIMIT 3")).rows,
        units: (await client.query("SELECT locale,state,count(*)::int count,sum(reported_cost_usd)::text cost,sum(total_tokens)::text tokens FROM translation_units WHERE source_sha256=ANY($1::text[]) GROUP BY locale,state ORDER BY locale,state", [catalog.units.map(unit => unit.hash)])).rows,
        recipes: (await client.query("SELECT locale,state,count(*)::int count FROM recipe_localizations GROUP BY locale,state ORDER BY locale,state")).rows })); return;
    }
    if (mode === "report") {
      const run = (await client.query("SELECT id,state FROM translation_runs WHERE source_sha256=$1 ORDER BY created_at DESC LIMIT 1", [catalog.hash])).rows[0];
      if (!run) throw new Error("No catalog translation run exists.");
      const selected = flags.find(flag => flag.startsWith("--locale="))?.slice(9);
      const rows = (await client.query(`SELECT locale,source_sha256 hash,kind,source_text source,translated_text translation,state,review,attempts
        FROM translation_units WHERE source_sha256=ANY($1::text[]) AND ($2::text IS NULL OR locale=$2) ORDER BY locale,kind,source_sha256`,
        [catalog.units.map(unit => unit.hash), selected ?? null])).rows;
      const directory = path.resolve(".run/catalog-translation", run.id); mkdirSync(directory, { recursive: true });
      const report = { runId: run.id, state: run.state, sourceSha256: catalog.hash, generatedAt: new Date().toISOString(),
        flagged: rows.filter(row => ["NeedsChanges", "Failed"].includes(row.state)),
        mechanicalFindings: rows.filter(row => row.state === "Reviewed" && !numericFactsMatch(row.source, row.translation)),
        reviewedSamples: TARGETS.flatMap(locale => [...new Set(rows.map(row => row.kind))].flatMap(kind =>
          rows.filter(row => row.locale === locale && row.kind === kind && row.state === "Reviewed").slice(0, 6))),
        units: rows };
      const file = path.join(directory, `review-report${selected ? "-" + selected : ""}.json`);
      writeFileSync(file, JSON.stringify(report, null, 2));
      console.log(JSON.stringify({ runId: run.id, report: file, flagged: report.flagged.length, mechanicalFindings: report.mechanicalFindings.length, samples: report.reviewedSamples.length,
        scope: "Public catalog text only; no private product data, credentials or reasoning." })); return;
    }
    if (mode === "stop") {
      const result = await client.query("UPDATE translation_runs SET state='Stopped',updated_at=now() WHERE source_sha256=$1 AND state='Running'", [catalog.hash]);
      console.log(JSON.stringify({ stopRequested: true, runs: result.rowCount })); return;
    }
    if (!(await client.query("SELECT pg_try_advisory_lock($1) AS locked", [lock])).rows[0].locked) throw new Error("Another catalog translator is active.");
    const previous = (await client.query("SELECT id,state,manifest FROM translation_runs WHERE source_sha256=$1 ORDER BY created_at DESC LIMIT 1", [catalog.hash])).rows[0];
    if (["run", "recover", "reaudit", "correct", "stage"].includes(mode) && previous?.state === "Accepted") {
      throw new Error("Accepted translations require a new reviewed revision, not in-place edits.");
    }
    runId = previous?.id ?? randomUUID();
    if (!previous) {
      if (mode !== "run") throw new Error("Start a translation run before staging or accepting.");
      await client.query("INSERT INTO translation_runs(id,source_sha256,manifest,budget_usd) VALUES($1,$2,$3,$4)",
        [runId, catalog.hash, JSON.stringify(catalog), config?.budgetUsd ?? 10]);
    }
    if (mode === "recover") {
      // Explicit operator decision after examining provider evidence, never an automatic paid retry.
      const result = await client.query(`UPDATE translation_units SET state='NeedsChanges',translated_text=COALESCE(translated_text,source_text),
        review='{"reason":"Previous generation failed validation or delivery; no usable draft was retained."}'::jsonb,updated_at=now()
        WHERE state='Failed' AND attempts<2 AND source_sha256=ANY($1::text[]) RETURNING source_sha256`, [catalog.units.map(unit => unit.hash)]);
      console.log(JSON.stringify({ runId, explicitRecoveryUnits: result.rowCount, paidRequests: 0 })); return;
    }
    if (mode === "reaudit") {
      // Reuse valid paid drafts when ONLY the audit response was malformed/truncated.
      const result = await client.query(`UPDATE translation_units SET state='Generated',updated_at=now()
        WHERE state IN ('Reviewed','NeedsChanges') AND translated_text<>source_text
        AND ((review->>'reason'='Semantic audit output invalid; editorial review required.' AND COALESCE(review->>'method','')<>'model-semantic-audit-v4-source-anchor') OR review->>'method'='model-semantic-audit-v1')
        AND source_sha256=ANY($1::text[])`, [catalog.units.map(unit => unit.hash)]);
      console.log(JSON.stringify({ runId, draftsRequeuedForAudit: result.rowCount, paidRequests: 0 })); return;
    }
    if (mode === "correct") {
      if ((await client.query("SELECT state FROM translation_runs WHERE id=$1", [runId])).rows[0].state === "Accepted") throw new Error("Accepted localizations require a new editorial revision, not in-place edits.");
      const file = path.resolve(".run/catalog-translation", runId!, "editorial-corrections.json");
      if (Buffer.byteLength(readFileSync(file)) > 2 * 1024 * 1024) throw new Error("Oversized editorial correction file.");
      const corrections = validateEditorialCorrections(JSON.parse(readFileSync(file, "utf8")));
      const known = new Set(catalog.units.map(unit => unit.hash));
      await client.query("BEGIN");
      try {
        for (const item of corrections) {
          if (!known.has(item.hash)) throw new Error("Correction is outside current public source snapshot.");
          const result = await client.query(`UPDATE translation_units SET translated_text=$3,state='Reviewed',
            review=jsonb_build_object('method','Codex-editorial','reason',$4::text,'previousTranslation',translated_text,'previousReview',review),updated_at=now()
            WHERE locale=$1 AND source_sha256=$2 AND source_text=$5 AND state IN ('Generated','NeedsChanges','Reviewed')`,
            [item.locale, item.hash, item.text, item.reason, item.source]);
          if (result.rowCount !== 1) throw new Error("Correction source/state is stale.");
        }
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; }
      console.log(JSON.stringify({ runId, editorialCorrections: corrections.length, paidRequests: 0 })); return;
    }
    // Both operations fail before writes unless all five targets have actual source-bound editorial review.
    const editorialUnits = ["stage", "accept"].includes(mode) ? (await client.query(
      "SELECT locale,source_sha256,source_text,translated_text,state,review FROM translation_units WHERE source_sha256=ANY($1::text[])",
      [catalog.units.map(unit => unit.hash)])).rows : [];
    let certificate: RiskCertificate | undefined;
    if (["stage", "accept"].includes(mode)) {
      if ((await captureCatalog(client)).hash !== catalog.hash) throw new Error("Catalog changed while acquiring the acceptance lock.");
      if (riskReviewed) {
        const file = path.resolve(".run/catalog-translation", runId!, "risk-acceptance.json");
        const bytes = readFileSync(file);
        if (bytes.length > 1024 * 1024) throw new Error("Oversized risk certificate.");
        const candidate: unknown = JSON.parse(bytes.toString("utf8"));
        assertRiskAcceptance(catalog.units, editorialUnits, catalog.hash, candidate, process.env.SAVORA_ENVIRONMENT ?? "Production", databaseUrlFromEnvironment());
        certificate = candidate;
        if (mode === "accept" && !acceptanceDataMatches(previous.manifest.acceptance, certificate)) throw new Error("Restage after changing the risk certificate.");
      } else assertEditorialCoverage(catalog.units, editorialUnits);
    }
    if (mode === "accept") {
      // Explicit offline editorial gate. Never a web endpoint or automatic model approval.
      const staged = (await client.query("SELECT * FROM recipe_localizations WHERE run_id=$1 AND state='Staged'", [runId])).rows;
      if (staged.length !== catalog.recipes.length * TARGETS.length) throw new Error("Full-catalog editorial acceptance requires complete reviewed coverage.");
      const units = editorialUnits;
      const reviewed = new Map(TARGETS.map(locale => [locale as string, new Map<string,string>(units.filter(unit => unit.locale === locale).map(unit => [unit.source_sha256, unit.translated_text]))]));
      await client.query("BEGIN");
      try {
        for (const row of staged) {
          const source = catalog.recipes.find(recipe => recipe.versionId === row.recipe_version_id);
          if (!source || row.source_sha256 !== sha256(source)) throw new Error("Stale recipe localization.");
          const payload = row.payload;
          // A correction after staging must never publish an older draft accidentally.
          if (!acceptanceDataMatches(payload, localizedPayload(source, reviewed.get(row.locale)!))) throw new Error("Restage corrected translations before acceptance.");
          if (payload.title.length > 240 || payload.summary.length > 2000 || (payload.culturalNote?.length ?? 0) > 8000) throw new Error("Translated metadata exceeds accepted catalog bounds.");
          await client.query(`INSERT INTO recipe_translations(id,recipe_version_id,locale,title,summary,cultural_note,is_machine_translated)
            VALUES($1,$2,$3,$4,$5,$6,true) ON CONFLICT(recipe_version_id,locale) DO NOTHING`,
            [randomUUID(), row.recipe_version_id, row.locale, payload.title, payload.summary, payload.culturalNote]);
        }
        for (const locale of TARGETS) {
          const names = (await client.query("SELECT source_text,translated_text FROM translation_units WHERE locale=$1 AND kind='place' AND state=ANY($3::text[]) AND source_sha256=ANY($2::text[])", [locale, catalog.units.map(unit => unit.hash), riskReviewed ? ["Reviewed", "Generated"] : ["Reviewed"]])).rows;
          for (const name of names) {
            if (name.translated_text.length > 240) throw new Error("Localized place name exceeds catalog bounds.");
            await client.query(`INSERT INTO place_names(id,place_id,locale,name)
              SELECT gen_random_uuid(),place_id,$1,$2 FROM place_names WHERE locale='en' AND name=$3
              ON CONFLICT(place_id,locale) DO NOTHING`, [locale, name.translated_text, name.source_text]);
          }
        }
        await client.query("UPDATE recipe_localizations SET state='Accepted',reviewed_by=$2,reviewed_at=now() WHERE run_id=$1 AND state='Staged'", [runId, riskReviewed ? "Codex-risk-based" : "Codex"]);
        await client.query("UPDATE translation_runs SET state='Accepted',updated_at=now() WHERE id=$1", [runId]);
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; }
      console.log(JSON.stringify({ runId, acceptedRecipeLocales: staged.length })); return;
    }
    if (mode === "stage") {
      let staged = 0;
      await client.query("BEGIN");
      try {
      for (const locale of TARGETS) {
        const rows = editorialUnits.filter(row => row.locale === locale);
        const translated = new Map<string, string>(rows.map(row => [row.source_sha256, row.translated_text]));
        for (const recipe of catalog.recipes) {
          if (recipeFields(recipe).some(field => field.text?.trim() && /\p{L}/u.test(field.text) && !translated.has(unitHash(field.kind, field.text, field.recipeContext)))) continue;
          const payload = localizedPayload(recipe, translated);
          await client.query(`INSERT INTO recipe_localizations(recipe_version_id,locale,run_id,source_sha256,payload) VALUES($1,$2,$3,$4,$5)
            ON CONFLICT(recipe_version_id,locale) DO UPDATE SET run_id=EXCLUDED.run_id,source_sha256=EXCLUDED.source_sha256,payload=EXCLUDED.payload
            WHERE recipe_localizations.state='Staged'`, [recipe.versionId, locale, runId, sha256(recipe), JSON.stringify(payload)]); staged++;
        }
      }
      await client.query("UPDATE translation_runs SET state=$2,updated_at=now() WHERE id=$1", [runId, staged === catalog.recipes.length * TARGETS.length ? "ReviewReady" : "Stopped"]);
      if (certificate) await client.query("UPDATE translation_runs SET manifest=jsonb_set(manifest,'{acceptance}',$2::jsonb) WHERE id=$1", [runId, JSON.stringify(certificate)]);
      await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; }
      console.log(JSON.stringify({ runId, stagedRecipeLocales: staged, expected: catalog.recipes.length * TARGETS.length })); return;
    }
    if (!config) throw new Error("Translation key is not configured.");
    for (const locale of TARGETS) {
      // Set-based, idempotent preparation; no public English rows are touched.
      for (let offset = 0; offset < catalog.units.length; offset += 500) {
        await client.query(`INSERT INTO translation_units(source_sha256,locale,kind,source_text,model,prompt_version)
          SELECT x.hash,$2,x.kind,x.source,$3,$4 FROM jsonb_to_recordset($1::jsonb) AS x(hash text,kind text,source text)
          ON CONFLICT(source_sha256,locale) DO NOTHING`, [JSON.stringify(catalog.units.slice(offset, offset + 500)), locale, translationModelFor(locale, config), PROMPT_VERSION]);
      }
    }
    // Refresh only the derived unit manifest; the canonical English snapshot hash is unchanged.
    await client.query("UPDATE translation_runs SET state='Running',manifest=$2,budget_usd=$3,updated_at=now() WHERE id=$1", [runId, JSON.stringify(catalog), config.budgetUsd]);
    const contexts = new Map(catalog.units.map(unit => [unit.hash, unit.recipeContext]));
    let nextRequest = 0, generations = 0;
    const evidenceDir = path.resolve(".run/catalog-translation", runId!);
    mkdirSync(evidenceDir, { recursive: true });
    const diagnostic = (event: object) => {
      const entry = { runId, at: new Date().toISOString(), ...event };
      appendFileSync(path.join(evidenceDir, "worker-events.jsonl"), JSON.stringify(entry) + "\n");
      console.error(JSON.stringify(entry));
    };
    diagnostic({ event: "worker-started", workflow: parallel ? "parallel-zh-romance-generation-first" : groupRomance ? "romance-generation-first" : generateOnly ? "generation-first-human-review" : "generation-and-model-audit", chineseModel: translationModelFor("zh", config), paidPostRetries: 0, budgetGetMaxAttempts: 3, maxInFlight: parallel ? 2 : 1 });
    // One offline lane. Qwen 3.8 <=2/min after recurring 429; explicitly selected 3.7 <=12/min.
    // Gemini retains its previously bounded <=30/minute rate. No extra requests.
    // Browser abuse limits stay unchanged. No automatic paid POST replay.
    // Paid-model limits: https://openrouter.ai/docs/api_reference/limits
    // With one request in flight, the existing $0.10 headroom exceeds its token-price ceiling.
    let requestInterval = 30000;
    const limit = async () => { const start = Math.max(nextRequest, Date.now()); nextRequest = start + requestInterval;
      if (start > Date.now()) await pause(start - Date.now()); };
    const localeFlag = flags.find(flag => flag.startsWith("--locale="))?.slice(9);
    const baseTransport = parallel ? parallelBudgetTransport(config.budgetUsd) : fetch;
    if (groupRomance) {
      requestInterval = 2000;
      await runRomanceGeneration(client, config, runId!, catalog.units, evidenceDir, flags.includes("--sample"), limit);
    }
    const runSingleLocales = async () => {
    for (const locale of TARGETS.filter(locale => parallel ? locale === "zh" : !groupRomance && (!localeFlag || locale === localeFlag))) {
      requestInterval = locale === "zh" ? translationModelFor(locale, config) === "qwen/qwen3.7-flash" ? 5000 : 30000 : 2000;
      // Generated units are audited first when resuming; never regenerate completed paid drafts.
      for (const phase of catalogWorkerPhases(generateOnly)) {
        type Unit = { hash: string; kind: string; source: string; model: string; translated: string | null; review: { reason?: string } | null; recipeContext?: string };
        const savedUnits: Unit[] = (await client.query(
          "SELECT source_sha256 AS hash,kind,source_text AS source,model,translated_text AS translated,review FROM translation_units WHERE locale=$1 AND state=$2 AND (attempts<2 OR state='Generated') AND source_sha256=ANY($3::text[]) ORDER BY source_sha256", [locale, phase, catalog.units.map(unit => unit.hash)])).rows;
        savedUnits.forEach(unit => { unit.recipeContext = contexts.get(unit.hash); });
        // Invalid audit anchors/shape require editorial inspection, not another paid generation.
        const units = phase === "NeedsChanges" ? savedUnits.filter(unit => generateOnly ? needsGenerationRepair(unit) : !isEditorialOnlyFinding(unit.review)) : savedUnits;
        if (units.length < savedUnits.length) diagnostic({ event: "editorial-only-drafts-preserved", locale,
          units: savedUnits.length - units.length, paidRequests: 0 });
        const processBatch = async (batch: Unit[]) => {
    let batchCost = 0, batchTokens = 0;
    const invalidTexts = new Set<string>();
    const hashes = batch.map(unit => unit.hash), texts = batch.map(unit => unit.source);
    const activeBatch = { locale, phase, hashes, texts };
    const budgetTransport = withReadOnlyBudgetRetries(baseTransport, event => diagnostic({ event: "transport-failure", locale, phase, unitHashes: hashes, ...event }));
    const transport: typeof fetch = async (input, init) => {
      const response = await budgetTransport(input, init);
      if (String(input).endsWith("/chat/completions") && !response.ok) {
        console.error(JSON.stringify({ providerHttpStatus: response.status, generationRejected: true }));
      }
      if (String(input).endsWith("/chat/completions") && response.ok) {
        const reader = response.clone().body!.getReader(); const parts: Uint8Array[] = []; let size = 0;
        for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length;
          if (size > 128 * 1024) { await reader.cancel(); throw new Error("Oversized provider response."); } parts.push(part.value); }
        const metadata = JSON.parse(Buffer.concat(parts).toString("utf8"));
        if (!Number.isFinite(metadata.usage?.cost) || metadata.usage.cost < 0 || !Number.isInteger(metadata.usage?.total_tokens)) throw new Error("Missing provider usage accounting.");
        batchCost += metadata.usage.cost; batchTokens += metadata.usage.total_tokens; generations++;
        const choice = metadata.choices?.[0];
        writeFileSync(path.join(evidenceDir, `${randomUUID()}.json`), JSON.stringify({ model: metadata.model,
          usage: metadata.usage, finishReason: choice?.finish_reason, content: choice?.message?.content, batch: activeBatch }, null, 2), { flag: "wx" });
        console.log(JSON.stringify({ generation: generations, model: metadata.model, finishReason: choice?.finish_reason,
          completionTokens: metadata.usage.completion_tokens, reasoningTokens: metadata.usage.completion_tokens_details?.reasoning_tokens }));
      }
      return response;
    };
    // A short Qwen reasoning budget prevents the omissions observed in non-thinking bulk JSON output.
    const translationOptions = { chineseReasoning: true, timeoutMs: 90000, fieldKinds: batch.map(unit => unit.kind), recipeContext: batch[0]?.recipeContext,
      onInvalidItem: (source: string) => invalidTexts.add(source) };
    const translator = new OpenRouterTranslator(config, transport, limit, Date.now, translationOptions);
          const request = { texts, source: "en", target: locale };
          let translated = batch.map(unit => unit.translated!);
          try {
            if (phase !== "Generated") {
              // A crash after sending must not silently pay for the same batch twice.
              await client.query("UPDATE translation_units SET state='Failed',attempts=attempts+1,updated_at=now() WHERE locale=$1 AND source_sha256=ANY($2::text[])", [locale, hashes]);
              const batchTranslator = phase === "NeedsChanges" ? new OpenRouterTranslator(config, transport, limit, Date.now, {
                ...translationOptions, chineseReasoning: true, repairContext: batch.map(unit => ({ source: unit.source, translation: unit.translated ?? unit.source,
                  reason: unit.review?.reason ?? "Previous validation failed." })),
              }) : translator;
              try { translated = (await batchTranslator.translate(request)).translations; }
              catch (error) {
                if (!(error instanceof ProductError) || error.code !== "InvalidTranslationOutput") throw error;
                await client.query(`UPDATE translation_units SET state='NeedsChanges',translated_text=source_text,
                  review='{"reason":"Provider response failed whole-batch validation; original retained for bounded correction."}'::jsonb,updated_at=now()
                  WHERE locale=$1 AND source_sha256=ANY($2::text[])`, [locale, hashes]);
                console.log(JSON.stringify({ runId, locale, rejectedBatch: batch.length, unsafeOutputNotPublished: true }));
                return;
              }
              // Preserve provenance of existing drafts. Only a successful new generation changes model.
              await client.query(`UPDATE translation_units u SET translated_text=x.text,state='Generated',model=$3::text,
                review=jsonb_build_object('generationModel',$3::text,'previousGenerationModel',
                  CASE WHEN translated_text IS NOT NULL AND translated_text<>source_text THEN model ELSE NULL END),updated_at=now()
                FROM jsonb_to_recordset($2::jsonb) AS x(hash text,text text) WHERE u.locale=$1 AND u.source_sha256=x.hash`,
                [locale, JSON.stringify(batch.map((unit,index) => ({ hash: unit.hash, text: translated[index] }))), translationModelFor(locale, config)]);
            }
            if (generateOnly) {
              // Deterministic validation still runs in translate(); no semantic approval is inferred.
              // Reuse every safe draft for the owner's subsequent human editorial pass.
              await client.query(`UPDATE translation_units u SET state=x.state,review=u.review || x.review,updated_at=now()
                FROM jsonb_to_recordset($2::jsonb) AS x(hash text,state text,review jsonb) WHERE u.locale=$1 AND u.source_sha256=x.hash`,
                [locale, JSON.stringify(batch.map(unit => ({ hash: unit.hash, state: generationDraftState(invalidTexts.has(unit.source)),
                  review: { method: "generation-only-awaiting-editorial", editorialRequired: true, fieldContext: unit.kind,
                    ...(unit.recipeContext ? { recipeContext: unit.recipeContext } : {}),
                    reason: invalidTexts.has(unit.source) ? "Mechanical validation rejected the model output; original retained, correction required." : null } }))) ]);
              console.log(JSON.stringify({ runId, locale, phase, units: batch.length, mechanicalIssues: invalidTexts.size,
                modelAuditRequests: 0, editorialRequired: true, batchCostUsd: batchCost, tokens: batchTokens, generations, at: new Date().toISOString() }));
              return;
            }
            let issues: Array<{ index: number; reason: string }>;
            try { issues = await new OpenRouterTranslator(config, transport, limit, Date.now, { chineseReasoning: true, timeoutMs: 90000,
              fieldKinds: translationOptions.fieldKinds, recipeContext: translationOptions.recipeContext }).review(request, translated); }
            catch (error) {
              // Invalid semantic-audit output must not approve the batch or discard paid translations.
              if (!(error instanceof ProductError) || error.code !== "InvalidTranslationOutput") throw error;
              issues = batch.map((_, index) => ({ index, reason: "Semantic audit output invalid; editorial review required." }));
            }
            for (const [index, source] of texts.entries()) {
              if (invalidTexts.has(source) && !issues.some(issue => issue.index === index)) issues.push({ index,
                reason: "Mechanical validation rejected the model output; original retained, correction required." });
            }
            await client.query(`UPDATE translation_units u SET state=x.state,review=x.review,updated_at=now()
              FROM jsonb_to_recordset($2::jsonb) AS x(hash text,state text,review jsonb) WHERE u.locale=$1 AND u.source_sha256=x.hash`,
              [locale, JSON.stringify(batch.map((unit,index) => {
                const issue = issues.find(issue => issue.index === index);
                return { hash: unit.hash, state: issue ? "NeedsChanges" : "Reviewed", review: { method: "model-semantic-audit-v4-source-anchor", fieldContext: unit.kind,
                  generationModel: phase === "Generated" ? unit.model : translationModelFor(locale, config), auditModel: translationModelFor(locale, config),
                  ...(phase !== "Generated" && unit.translated && unit.translated !== unit.source && unit.model !== translationModelFor(locale, config)
                    ? { previousGenerationModel: unit.model } : {}),
                  ...(unit.recipeContext ? { recipeContext: unit.recipeContext } : {}), reason: issue?.reason ?? null } };
              }))]);
            console.log(JSON.stringify({ runId, locale, phase, units: batch.length, issues: issues.length,
              batchCostUsd: batchCost, tokens: batchTokens, generations, at: new Date().toISOString() }));
          } finally {
            // Keep exact provider usage on one unit rather than rounding/dividing it away.
            if (batchCost || batchTokens) await client.query(`UPDATE translation_units SET reported_cost_usd=reported_cost_usd+$3,
              total_tokens=total_tokens+$4,updated_at=now() WHERE locale=$1 AND source_sha256=$2`, [locale, hashes[0], batchCost, batchTokens]);
            await client.query("UPDATE translation_runs SET updated_at=now() WHERE id=$1", [runId]);
          }
        };
        // Smaller Qwen batches prevent omissions and source/index drift found in live evidence.
        const batches = locale === "zh" ? batchCatalogUnits(units, phase === "Generated" ? 1600 : 2000, phase === "Generated" ? 16 : 24)
          : batchCatalogUnits(units, phase === "NeedsChanges" ? 2000 : 5000);
        for (let index = 0; index < batches.length; index++) {
          if ((await client.query("SELECT state FROM translation_runs WHERE id=$1", [runId])).rows[0].state !== "Running") {
            console.log(JSON.stringify({ runId, stoppedAtCheckpoint: true })); return;
          }
          const results = await Promise.allSettled(batches.slice(index, index + 1).map(processBatch));
          const failure = results.find(result => result.status === "rejected");
          if (failure?.status === "rejected") throw failure.reason;
          if (flags.includes("--sample")) { console.log(JSON.stringify({ sampleComplete: true, runId }));
            await client.query("UPDATE translation_runs SET state='Stopped',updated_at=now() WHERE id=$1", [runId]); return; }
        }
      }
    }
    };
    if (parallel) {
      let romanceNext = 0;
      const romanceLimit = async () => { const start = Math.max(romanceNext, Date.now()); romanceNext = start + 2000;
        if (start > Date.now()) await pause(start - Date.now()); };
      // Both lanes use atomic, non-transactional checkpoint statements on this one locked client.
      // Drain in-flight work on failure before ending the client or releasing the catalog lock.
      await runParallelGeneration([
        runSingleLocales,
        () => runRomanceGeneration(client, config, runId!, catalog.units, evidenceDir, false, romanceLimit, baseTransport),
      ], async () => { await client.query("UPDATE translation_runs SET state='Stopped',updated_at=now() WHERE id=$1", [runId]); });
    } else await runSingleLocales();
    await client.query("UPDATE translation_runs SET state='Stopped',updated_at=now() WHERE id=$1", [runId]);
    console.log(JSON.stringify({ runId, ...(groupRomance && flags.includes("--sample") ? { sampleComplete: true } : { generationPassComplete: true }),
      workflow: parallel ? "parallel-zh-romance-generation-first" : groupRomance ? "romance-generation-first" : generateOnly ? "generation-first-human-review" : "generation-and-model-audit",
      next: "Inspect remaining states and complete actual editorial review before staging/acceptance; completion of a pass is not full translation coverage." }));
  } catch (error) {
    if (runId) await client.query("UPDATE translation_runs SET state='Stopped',updated_at=now() WHERE id=$1 AND state<>'Accepted'", [runId]).catch(() => {});
    const code = error instanceof ProductError ? error.code : "CatalogTranslationStopped";
    // Only fixed application diagnostics are exposed, never SQL/provider messages or connection strings.
    const safeDiagnostic = error instanceof Error && /^(Risk-based local acceptance certificate is|Restage after changing|Restage corrected translations|Stale recipe localization\.|Translated metadata exceeds|Full-catalog (editorial acceptance|acceptance)|Catalog changed while|Localized place name exceeds)/.test(error.message)
      ? error.message : undefined;
    const event = { runId, at: new Date().toISOString(), event: "worker-stopped", code, ...safeTransportError(error), diagnostic: safeDiagnostic, preserved: true };
    if (runId) {
      const directory = path.resolve(".run/catalog-translation", runId); mkdirSync(directory, { recursive: true });
      appendFileSync(path.join(directory, "worker-events.jsonl"), JSON.stringify(event) + "\n");
    }
    console.error(JSON.stringify(event)); process.exitCode = 1;
  } finally { await client.query("SELECT pg_advisory_unlock($1)", [lock]).catch(() => {}); await client.end(); }
}
main().catch(() => { console.error("Catalog translation could not initialize; no secrets were logged."); process.exitCode = 1; });
