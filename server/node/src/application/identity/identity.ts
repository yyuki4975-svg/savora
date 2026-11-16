import type { AccountResponse } from "../../contracts/identity";
import { ProductError } from "../../domain/product-error";

export const IDENTITY = Symbol("IdentityService");
export interface Credentials extends AccountResponse { passwordHash: string; verified: boolean; disabled: boolean }
export interface IdentityStore {
  register(email: string, displayName: string, passwordHash: string): Promise<void>;
  credentials(email: string): Promise<Credentials | null>;
  createSession(accountId: string, expectedPasswordHash: string, tokenHash: string): Promise<string | null>;
  session(tokenHash: string): Promise<{ account: AccountResponse; expiresAt: string } | null>;
  revoke(tokenHash: string): Promise<void>;
  requestAction(email: string, purpose: "VerifyEmail" | "ResetPassword"): Promise<void>;
  consumeAction(tokenHash: string, purpose: "VerifyEmail" | "ResetPassword", passwordHash?: string): Promise<boolean>;
}
export interface IdentityCrypto {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string | null): Promise<boolean>;
  token(): string;
  digest(token: string): string;
}
export function objectInput(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).some(key => !keys.includes(key))) throw new ProductError(422, "InvalidInput", "Invalid request fields.");
  return value as Record<string, unknown>;
}
export function emailInput(value: unknown): string {
  if (typeof value !== "string") throw new ProductError(422, "InvalidEmail", "Enter a valid email address.");
  const email = value.trim().toLowerCase();
  // ASCII email policy avoids ambiguous Unicode/local-part transformations and header injection.
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email) ||
    email.startsWith(".") || email.includes("..") || email.split("@")[0]!.endsWith(".") || email.split("@")[0]!.length > 64) {
    throw new ProductError(422, "InvalidEmail", "Enter a valid email address.");
  }
  return email;
}
export function loginPasswordInput(value: unknown): string {
  if (typeof value !== "string" || [...value].length < 8 || [...value].length > 128 || /[\x00-\x1f\x7f]/.test(value)) {
    throw new ProductError(422, "InvalidPassword", "Enter a password of 8–128 characters.");
  }
  return value; // Never trim or truncate a password.
}
/** GitHub's length/composition rule for NEW passwords, not a leaked-password database check.
 * https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-strong-password
 * Do not reapply composition policy at login: existing credentials must remain usable.
 */
export function passwordInput(value: unknown): string {
  const password = loginPasswordInput(value);
  if ([...password].length < 15 && !(/[a-z]/.test(password) && /[0-9]/.test(password))) {
    throw new ProductError(422, "InvalidPassword", "Use 15–128 characters, or 8–128 with a lowercase letter and a number.");
  }
  return password;
}
export function actionTokenInput(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value)) {
    throw new ProductError(400, "InvalidAction", "This link is invalid or expired.");
  }
  return value;
}
export class IdentityService {
  constructor(private readonly store: IdentityStore, private readonly crypto: IdentityCrypto) {}
  async register(body: unknown): Promise<void> {
    const input = objectInput(body, ["email", "password", "displayName"]);
    const email = emailInput(input.email), password = passwordInput(input.password);
    if (typeof input.displayName !== "string" || !input.displayName.trim() || input.displayName.trim().length > 80 ||
      /[\x00-\x1f\x7f]/.test(input.displayName)) throw new ProductError(422, "InvalidName", "Enter a name of up to 80 characters.");
    // Existing accounts still pay hashing cost and get the same 202 response.
    await this.store.register(email, input.displayName.trim(), await this.crypto.hashPassword(password));
  }
  async login(body: unknown): Promise<{ token: string; account: AccountResponse; expiresAt: string }> {
    const input = objectInput(body, ["email", "password"]);
    const email = emailInput(input.email), password = loginPasswordInput(input.password);
    const account = await this.store.credentials(email);
    const valid = await this.crypto.verifyPassword(password, account?.passwordHash ?? null);
    if (!account || !valid || !account.verified || account.disabled) {
      throw new ProductError(401, "InvalidCredentials", "Unable to sign in. Check your credentials and verify your email.");
    }
    const token = this.crypto.token();
    const expiresAt = await this.store.createSession(account.id, account.passwordHash, this.crypto.digest(token));
    if (!expiresAt) throw new ProductError(401, "InvalidCredentials", "Unable to sign in.");
    return { token, expiresAt, account: { id: account.id, email: account.email, displayName: account.displayName, role: account.role } };
  }
  async session(token: string | null): Promise<{ account: AccountResponse; expiresAt: string }> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new ProductError(401, "Unauthenticated", "Sign in to continue.");
    const session = await this.store.session(this.crypto.digest(token));
    if (!session) throw new ProductError(401, "Unauthenticated", "Sign in to continue.");
    return session;
  }
  async logout(token: string): Promise<void> { await this.store.revoke(this.crypto.digest(actionTokenInput(token))); }
  async requestAction(body: unknown, purpose: "VerifyEmail" | "ResetPassword"): Promise<void> {
    const input = objectInput(body, ["email"]);
    await this.store.requestAction(emailInput(input.email), purpose);
  }
  async verifyEmail(body: unknown): Promise<void> {
    const input = objectInput(body, ["token"]);
    if (!await this.store.consumeAction(this.crypto.digest(actionTokenInput(input.token)), "VerifyEmail")) {
      throw new ProductError(400, "InvalidAction", "This link is invalid or expired.");
    }
  }
  async resetPassword(body: unknown): Promise<void> {
    const input = objectInput(body, ["token", "password"]);
    const digest = this.crypto.digest(actionTokenInput(input.token));
    const hash = await this.crypto.hashPassword(passwordInput(input.password));
    if (!await this.store.consumeAction(digest, "ResetPassword", hash)) {
      throw new ProductError(400, "InvalidAction", "This link is invalid or expired.");
    }
  }
}
