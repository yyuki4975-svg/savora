// "Download my data": one JSON file with everything Savora keeps for this person.
// Device records come from this browser's storage; account records are read through the
// same first-party product routes the kitchen uses. Session tokens are never included.
import { kitchenEntries } from "./auth/kitchen-client";
import { productCall, productSession } from "./auth/product-client";

// Editorial review scratch keys are internal tools, not personal kitchen data.
const internalPrefixes = ["savora-themealdb-review:", "savora-media-review:"];

export function deviceRecords(): Record<string, unknown> {
  const records: Record<string, unknown> = {};
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith("savora-") || internalPrefixes.some((prefix) => key.startsWith(prefix))) continue;
      const raw = window.localStorage.getItem(key);
      if (raw === null) continue;
      try { records[key] = JSON.parse(raw); } catch { records[key] = raw; }
    }
  } catch { /* Storage blocked: nothing to export from this browser. */ }
  return records;
}

async function allPages<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  let after: string | null = null;
  for (let page = 0; page < 25; page += 1) {
    const result: { items: T[]; nextCursor: string | null } = await productCall(`${path}?limit=50${after ? `&after=${encodeURIComponent(after)}` : ""}`);
    rows.push(...result.items);
    if (!result.nextCursor || result.nextCursor === after) return rows;
    after = result.nextCursor;
  }
  return rows;
}

export type DataExport = { file: string; account: "included" | "signed-out" | "unavailable" };

/** Builds the export and hands it to the browser as a download. */
export async function downloadMyData(): Promise<DataExport> {
  const exportedAt = new Date().toISOString();
  let account: Record<string, unknown> | null = null;
  let state: DataExport["account"] = "signed-out";
  try {
    const session = await productSession();
    if (session) {
      const [kitchen, workspace, submissions] = await Promise.all([
        kitchenEntries(),
        productCall<unknown>("me/kitchen/workspace"),
        allPages<unknown>("submissions"),
      ]);
      account = { displayName: session.account.displayName, email: session.account.email, kitchen, workspace, recipeDrafts: submissions };
      state = "included";
    }
  } catch {
    state = "unavailable";
  }
  const data = {
    format: "savora-data-export",
    version: 1,
    exportedAt,
    site: window.location.origin,
    device: deviceRecords(),
    account,
    notes: state === "unavailable" ? "The account service could not be reached; this file contains this browser's data only." : undefined,
  };
  const file = `savora-data-${exportedAt.slice(0, 10)}.json`;
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { file, account: state };
}
