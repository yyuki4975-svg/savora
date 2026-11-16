import type { Pool } from "pg";
import type { Translator, TranslationResult } from "../../contracts/translation";
import { validateTranslation } from "../../application/translation/validation";

/** Persistent accepted public text is free to serve; staged/model-only approval is private. */
export class PersistentTranslator implements Translator {
  constructor(private readonly pool: Pick<Pool, "query">, private readonly fallback: Translator, private readonly cacheOnly = false) {}
  async translate(payload: unknown): Promise<TranslationResult> {
    const request = validateTranslation(payload);
    if (request.source === request.target || !request.texts.length) return { translations: request.texts, cached: true };
    if (request.target === "en" || (request.source && request.source !== "en")) {
      if (!this.cacheOnly) return this.fallback.translate(request);
      if (request.target !== "en" || !request.source) return { translations: request.texts, cached: true };
      // Exact, unique reverse lookup supports translated recipe-name searches without a provider call.
      const reverse = (await this.pool.query<{ source_text: string; translated_text: string }>(`SELECT u.translated_text source_text,min(u.source_text) translated_text
        FROM translation_units u WHERE u.locale=$1 AND u.translated_text=ANY($2::text[])
        AND EXISTS(SELECT 1 FROM translation_runs r WHERE r.state='Accepted' AND
          (u.state='Reviewed' OR (u.state='Generated' AND r.manifest->'acceptance'->>'policy'='Codex-risk-based-local-v1')) AND EXISTS(
          SELECT 1 FROM jsonb_array_elements(r.manifest->'units') x WHERE x->>'hash'=u.source_sha256))
        GROUP BY u.translated_text HAVING count(DISTINCT u.source_text)=1`, [request.source, request.texts])).rows;
      const saved = new Map(reverse.map(row => [row.source_text, row.translated_text]));
      return { translations: request.texts.map(text => saved.get(text) ?? text), cached: true };
    }
    const rows = (await this.pool.query<{ source_text: string; translated_text: string }>(`SELECT u.source_text,min(u.translated_text) translated_text
      FROM translation_units u WHERE u.locale=$1 AND u.source_text=ANY($2::text[])
      AND EXISTS(SELECT 1 FROM translation_runs r WHERE r.state='Accepted' AND
        (u.state='Reviewed' OR (u.state='Generated' AND r.manifest->'acceptance'->>'policy'='Codex-risk-based-local-v1')) AND EXISTS(
        SELECT 1 FROM jsonb_array_elements(r.manifest->'units') x WHERE x->>'hash'=u.source_sha256))
      GROUP BY u.source_text HAVING count(DISTINCT u.translated_text)=1`, [request.target, request.texts])).rows;
    const saved = new Map(rows.map(row => [row.source_text, row.translated_text]));
    // Unknown shell/editorial text remains English without discarding valid cached siblings or charging money.
    if (this.cacheOnly) return { translations: request.texts.map(text => saved.get(text) ?? text), cached: true };
    const missing = [...new Set(request.texts.filter(text => !saved.has(text)))];
    if (!missing.length) return { translations: request.texts.map(text => saved.get(text)!), cached: true };
    const generated = await this.fallback.translate({ ...request, texts: missing });
    missing.forEach((text,index) => saved.set(text, generated.translations[index]!));
    return { translations: request.texts.map(text => saved.get(text)!), cached: generated.cached };
  }
}
