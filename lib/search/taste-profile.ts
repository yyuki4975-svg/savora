// On-device taste profile for recommendations. Stored only in this browser's localStorage; never sent to
// Savora's servers. Signals are coarse catalogue labels ("menu:soup", "ing:chile", "country:japan",
// "time:quick", "diet:vegetarian"), never free text. Weights fade with a 21-day half-life.

const KEY = "savora-taste-profile";
const OFF_KEY = "savora-taste-off";
const HALF_LIFE_DAYS = 21;
const MAX_SIGNALS = 60;

type Stored = { v: 1; updatedAt: number; weights: Record<string, number> };

function decay(weights: Record<string, number>, from: number, to: number) {
  const factor = Math.pow(0.5, Math.max(0, to - from) / (HALF_LIFE_DAYS * 86400000));
  return Object.fromEntries(Object.entries(weights).map(([signal, weight]) => [signal, weight * factor]).filter(([, weight]) => (weight as number) > 0.05));
}

export function tasteEnabled(): boolean {
  try { return window.localStorage.getItem(OFF_KEY) !== "1"; } catch { return false; }
}

export function setTasteEnabled(enabled: boolean) {
  try {
    if (enabled) window.localStorage.removeItem(OFF_KEY);
    else { window.localStorage.setItem(OFF_KEY, "1"); window.localStorage.removeItem(KEY); }
  } catch { /* Storage unavailable: nothing is remembered. */ }
}

export function readTaste(now = Date.now()): Record<string, number> {
  try {
    const stored = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Stored | null;
    if (!stored || stored.v !== 1 || typeof stored.weights !== "object") return {};
    return decay(stored.weights, stored.updatedAt, now);
  } catch { return {}; }
}

/** Add interest in some signals (search 1, opening a recipe 1.5, saving 3). No-op when turned off. */
export function recordTaste(signals: readonly string[], weight: number, now = Date.now()) {
  if (!signals.length || !tasteEnabled()) return;
  const weights = readTaste(now);
  for (const signal of new Set(signals)) weights[signal] = Math.min(20, (weights[signal] ?? 0) + weight);
  const kept = Object.fromEntries(Object.entries(weights).sort((left, right) => right[1] - left[1]).slice(0, MAX_SIGNALS));
  try { window.localStorage.setItem(KEY, JSON.stringify({ v: 1, updatedAt: now, weights: kept } satisfies Stored)); } catch { /* ignore */ }
}

export function clearTaste() {
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function tasteSize(): number {
  return Object.keys(readTaste()).length;
}

export type RailCandidate = { slug: string; signals: readonly string[] };

/** How well a candidate fits the profile, 0..1 (share of its signals' weight against the top signal). */
export function tasteScore(signals: readonly string[], weights: Record<string, number>): number {
  const top = Math.max(0, ...Object.values(weights));
  if (!top) return 0;
  return signals.reduce((sum, signal) => sum + (weights[signal] ?? 0), 0) / (top * 2);
}

/**
 * Pick `size` recommendations: about half by taste, half deliberately from other kinds of recipe, interleaved,
 * and never two neighbours from the same country or main menu. `seed` varies the "other" half day by day.
 */
export function pickRail<T extends RailCandidate>(pool: readonly T[], weights: Record<string, number>, size = 8, seed = 0): T[] {
  if (!pool.length) return [];
  const scored = pool.map((item, index) => ({ item, score: tasteScore(item.signals, weights), order: (index * 2654435761 + seed * 40503) % 1000003 }));
  const tasteSlots = Math.ceil(size / 2);
  const personal = scored.filter((entry) => entry.score > 0).sort((left, right) => right.score - left.score);
  const median = personal.length ? personal[Math.floor(personal.length / 2)].score : 0;
  const others = scored.filter((entry) => entry.score <= median * 0.5).sort((left, right) => left.order - right.order);
  const key = (item: T, prefix: string) => item.signals.find((signal) => signal.startsWith(prefix)) ?? "";
  const picked: T[] = [];
  const take = (list: typeof scored) => {
    const last = picked[picked.length - 1];
    const index = list.findIndex((entry) => !picked.includes(entry.item) && (!last || (key(entry.item, "country:") !== key(last, "country:") && key(entry.item, "menu:") !== key(last, "menu:"))));
    const fallback = list.findIndex((entry) => !picked.includes(entry.item));
    const chosen = list[index >= 0 ? index : fallback];
    if (chosen) picked.push(chosen.item);
    return Boolean(chosen);
  };
  let tasteCount = 0;
  while (picked.length < size) {
    const wantTaste = picked.length % 2 === 0 && tasteCount < tasteSlots;
    if (wantTaste && take(personal)) { tasteCount++; continue; }
    if (take(others)) continue;
    if (take(personal)) { tasteCount++; continue; }
    if (!take(scored)) break;
  }
  return picked;
}
