import { readAccountSession, type AccountSession } from "./account-client";
export async function productSession(): Promise<AccountSession | null> {
  const response = await fetch('/api/account/session', {credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});
  if (response.status === 401) return null;
  if (!response.ok) throw new ProductFailure('AccountsUnavailable',response.status);
  const session = readAccountSession(await response.json());
  if (!session) throw new ProductFailure('InvalidSession',503);
  return session;
}
export class ProductFailure extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}
export function productError(error: unknown) {
  if (error instanceof ProductFailure) {
    if (error.code === 'ChangedAccount') return 'The signed-in account changed. Reload the page before using this kitchen.';
    if (error.code === 'AccountsUnavailable') return 'Account service is unavailable. No kitchen changes were saved. Try again later.';
    if (error.status === 401) return 'Sign in with a verified account, then try again.';
    if (error.status === 403) return 'This action needs permission. Refresh your session before trying again.';
    if (error.status === 409) return 'This record changed. Reload it before saving; your unsaved text is still here.';
    if (error.status === 429) return 'Too many requests. Wait a moment before trying again.';
    if (error.code === 'PendingWritesFull') return 'Several saves are unconfirmed. Reload and check your account records before sending more changes.';
    if (error.status === 422) return `Check the required fields (${error.code}).`;
  }
  return 'Could not confirm the result. Reload before retrying; your unsaved text is still here.';
}
const pendingKeys = new Map<string, string>();
// Retain uncertain mutations in memory for explicit retries, scoped to the signed-in account.
// Nothing automatically retries; no session or private payload enters device storage.
export async function productCall<T>(path: string, method = 'GET', body?: unknown, session?: AccountSession | null, key?: string): Promise<T> {
  // Store only a digest, not a growing collection of private recipe/note bodies.
  const signature = body === undefined ? '' : Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(JSON.stringify([session?.account.id,path,method,body])))),v => v.toString(16).padStart(2,'0')).join('');
  if (body !== undefined && !key && !pendingKeys.has(signature) && pendingKeys.size >= 100)
    throw new ProductFailure('PendingWritesFull',503);
  const mutationKey = body === undefined ? undefined : key ?? pendingKeys.get(signature) ?? crypto.randomUUID();
  if (body !== undefined && !key) pendingKeys.set(signature,mutationKey!);
  const response = await fetch(`/api/product/${path}`, {method,credentials:'same-origin',cache:'no-store',
    headers: body === undefined ? {} : {'Content-Type':'application/json','X-Savora-Request':'1',
      'X-Savora-Csrf':session?.csrfToken ?? '', 'X-Idempotency-Key':mutationKey!},
    body:body === undefined ? undefined : JSON.stringify(body),signal:AbortSignal.timeout(22000)});
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    if (response.status < 500) pendingKeys.delete(signature);
    throw new ProductFailure(data?.code ?? 'ProductUnavailable',response.status);
  }
  pendingKeys.delete(signature);
  return data as T;
}
