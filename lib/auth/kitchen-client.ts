import { productCall, productSession, ProductFailure } from './product-client';
import type { KitchenEntryResponse } from '../../server/node/src/contracts/kitchen';
import type { AccountSession } from './account-client';
export async function sameKitchenAccount(session: AccountSession | null) {
  const current = await productSession();
  if (current?.account.id !== session?.account.id) throw new ProductFailure('ChangedAccount',409);
  return current;
}
export async function kitchenEntries(): Promise<KitchenEntryResponse[]> {
  const rows: KitchenEntryResponse[] = [], cursors = new Set<string>();
  let after: string | null = null;
  for (let page=0;page<25;page++) {
    const result: {items:KitchenEntryResponse[];nextCursor:string|null} = await productCall(`me/kitchen?limit=50${after ? `&after=${encodeURIComponent(after)}` : ''}`);
    rows.push(...result.items);
    if (result.nextCursor === null) return rows;
    if (cursors.has(result.nextCursor)) throw new ProductFailure('InvalidCursor',503);
    cursors.add(result.nextCursor); after=result.nextCursor;
  }
  throw new ProductFailure('KitchenTooLarge',503);
}
export async function saveKitchenEntry(session: AccountSession, slug: string, servings: number | undefined, status?: KitchenEntryResponse['status'], note?: string) {
  const current = await sameKitchenAccount(session);
  const existing = (await kitchenEntries()).find(r => r.recipeSlug === slug);
  await sameKitchenAccount(session);
  return productCall<KitchenEntryResponse>(`me/kitchen/${slug}`,'PUT',{
    status:status ?? existing?.status ?? 'Want to cook', privateNote:note === undefined ? existing?.privateNote ?? null : note.trim() || null,
    servings:servings ?? existing?.servings ?? 1,expectedRevision:existing?.revision ?? 0,
  },current);
}
