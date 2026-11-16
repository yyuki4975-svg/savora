import { TARGETS, sha256 } from "./catalog-plan";
import { numericFactsMatch } from "./editorial-review";
import { isDeepStrictEqual } from "node:util";

/** JSONB reorders object keys; semantic equality keeps array/step ordering strict. */
export const acceptanceDataMatches = (stored: unknown, expected: unknown): boolean => isDeepStrictEqual(stored, expected);

export const RISK_POLICY = "Codex-risk-based-local-v1";
export interface RiskRow {
  locale: string; source_sha256: string; source_text: string; translated_text: string | null;
  state: string; review: { method?: string; reason?: string } | null;
}
export interface RiskCertificate {
  policy: typeof RISK_POLICY; sourceHash: string; draftDigest: string; warningDigest: string;
  authorizedAt: string; reviewedAt: string; reviewer: "Codex";
  exhaustiveSentenceReview: false; unresolvedMajorFindings: string[];
  sampleEvidence: string[]; sourceEvidence: string[];
  dispositions: Array<{ key: string; reason: string }>;
}
const negative: Record<string, RegExp> = { zh: /不|勿|别|避免/, ja: /ない|ず|禁止|避け|なし/,
  fr: /\b(?:pas|sans|jamais|éviter|évitez)\b/i, it: /\b(?:non|senza|mai|evitare|evitate)\b/i,
  es: /\b(?:no|sin|nunca|evitar|evite|evites)\b/i };
const fridge: Record<string, RegExp> = { zh: /冷藏|冰箱/, ja: /冷蔵/, fr: /réfrig|frigo/i,
  it: /refriger|frigor|frigo/i, es: /refrig|frigor|nevera/i };
function temperatures(text: string): string {
  return [...text.replaceAll("℃", "°C").replaceAll("℉", "°F").replaceAll("摄氏度", "°C")
    .replaceAll("华氏度", "°F").replace(/(?:degrees|degrés|gradi|grados)\s*([CF])/gi, "°$1")
    .matchAll(/(\d+(?:[.,]\d+)?)(\s*)(°\s*)?([CF])\b/g)]
    .filter(m => m[3] || !m[2] || Number(m[1]) >= 50)
    .map(m => m[1]!.replace(",", ".") + m[4]).sort().join("|");
}
/** Heuristic warnings require an explicit disposition; absence is not semantic proof. */
export function riskWarnings(rows: ReadonlyArray<RiskRow>) {
  return rows.flatMap(row => {
    const reasons: string[] = [], text = row.translated_text ?? "";
    if (/\b(do not|never|don['’]t)\b/i.test(row.source_text) && !negative[row.locale]?.test(text)) reasons.push("negation");
    if (/refrigerat|in the fridge/i.test(row.source_text) && !fridge[row.locale]?.test(text)) reasons.push("refrigeration");
    if (temperatures(row.source_text) && temperatures(row.source_text) !== temperatures(text)) reasons.push("temperature-labels");
    return reasons.length ? [{ key: row.locale + ":" + row.source_sha256, reasons }] : [];
  }).sort((a, b) => a.key.localeCompare(b.key));
}
export function draftDigest(rows: ReadonlyArray<RiskRow>): string {
  return sha256([...rows].sort((a, b) => (a.locale + a.source_sha256).localeCompare(b.locale + b.source_sha256))
    .map(r => [r.locale, r.source_sha256, r.source_text, r.translated_text, r.state, r.review?.method ?? null, r.review?.reason ?? null]));
}
/** No production activation and no conversion of unread Generated text into Reviewed. */
export function assertRiskAcceptance(sources: ReadonlyArray<{ hash: string; source: string }>, rows: ReadonlyArray<RiskRow>,
  sourceHash: string, value: unknown, environment: string, databaseUrl: string): asserts value is RiskCertificate {
  const invalid = () => { throw new Error("Risk-based local acceptance certificate is incomplete, stale or unsafe."); };
  const db = new URL(databaseUrl);
  if (environment !== "Development" || !["localhost", "127.0.0.1", "[::1]"].includes(db.hostname)) invalid();
  const expected = new Map(sources.map(u => [u.hash, u.source])), seen = new Set<string>();
  if (expected.size !== sources.length) invalid();
  for (const r of rows) {
    const key = r.locale + ":" + r.source_sha256, text = r.translated_text;
    if (!(TARGETS as readonly string[]).includes(r.locale) || seen.has(key) || expected.get(r.source_sha256) !== r.source_text ||
      !["Generated", "Reviewed"].includes(r.state) || typeof text !== "string" || !text.trim() || text.length > 12000 ||
      /__SAVORA_NUMBER_|<\/?[a-z][^>]*>|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/i.test(text) || !numericFactsMatch(r.source_text, text)) invalid();
    seen.add(key);
  }
  if (seen.size !== sources.length * TARGETS.length || !value || typeof value !== "object" || Array.isArray(value)) invalid();
  const cert = value as RiskCertificate, warnings = riskWarnings(rows);
  if (cert.policy !== RISK_POLICY || cert.reviewer !== "Codex" || cert.exhaustiveSentenceReview !== false ||
    cert.sourceHash !== sourceHash || cert.draftDigest !== draftDigest(rows) || cert.warningDigest !== sha256(warnings) ||
    !Number.isFinite(Date.parse(cert.authorizedAt)) || !Number.isFinite(Date.parse(cert.reviewedAt)) ||
    !Array.isArray(cert.unresolvedMajorFindings) || cert.unresolvedMajorFindings.length ||
    !Array.isArray(cert.sampleEvidence) || !cert.sampleEvidence.length || !Array.isArray(cert.sourceEvidence) || !cert.sourceEvidence.length ||
    [...cert.sampleEvidence, ...cert.sourceEvidence].some(s => typeof s !== "string" || !s.trim() || s.length > 1000) ||
    !Array.isArray(cert.dispositions) || cert.dispositions.length !== warnings.length) invalid();
  const decisions = new Map(cert.dispositions.map(d => [d.key, d.reason]));
  if (decisions.size !== warnings.length || warnings.some(w => typeof decisions.get(w.key) !== "string" ||
    !decisions.get(w.key)!.trim() || decisions.get(w.key)!.length > 2000)) invalid();
}
