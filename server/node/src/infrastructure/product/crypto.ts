import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { ProductError } from "../../domain/product-error";

export function opaqueToken(): string { return randomBytes(32).toString("base64url"); }
export function tokenHash(value: string): string { return createHash("sha256").update(value).digest("hex"); }
export function csrfToken(key: Buffer, sessionToken: string): string {
  return createHmac("sha256", key).update("savora-csrf-v1:").update(sessionToken).digest("base64url");
}
export function equalToken(left: string, right: string): boolean {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Node 22 native scrypt; OWASP's N=2^17, r=8, p=1. No synchronous hashing on the event loop.
// https://nodejs.org/docs/latest-v22.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback
// https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt
let activeHashes = 0;
async function derive(password: string, salt: Buffer): Promise<Buffer> {
  // Resource admission, NOT an IP/account rate limiter; avoid unbounded 128 MiB allocations.
  if (activeHashes >= 2) throw new ProductError(503, "AuthBusy", "Please retry shortly.");
  activeHashes++;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
        (error, key) => error ? reject(error) : resolve(key));
    });
  } finally { activeHashes--; }
}
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt-v1$${salt.toString("hex")}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string | null): Promise<boolean> {
  const match = /^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded ?? "");
  // Invalid/missing records still pay the same KDF cost, without accepting attacker-selected parameters.
  const salt = match ? Buffer.from(match[1]!, "hex") : Buffer.alloc(16);
  const actual = await derive(password, salt);
  const expected = match ? Buffer.from(match[2]!, "hex") : Buffer.alloc(64);
  return timingSafeEqual(actual, expected) && match !== null;
}

/** AES-GCM key ring allows rotation while retaining decryption of pending jobs. AAD binds ciphertext to job ID. */
export class MailCipher {
  constructor(private readonly keys: ReadonlyMap<string, Buffer>, readonly currentKeyId: string) {
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(currentKeyId) || !keys.has(currentKeyId) ||
      [...keys].some(([id, key]) => !/^[A-Za-z0-9_-]{1,32}$/.test(id) || key.length !== 32)) {
      throw new Error("Invalid mail encryption key ring.");
    }
  }
  encrypt(id: string, value: unknown): string {
    const nonce = randomBytes(12), key = this.keys.get(this.currentKeyId)!;
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    cipher.setAAD(Buffer.from(`savora-mail-v1:${id}`));
    const payload = Buffer.from(JSON.stringify(value));
    if (payload.length > 16_384) throw new Error("Mail payload is too large.");
    const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
    return ["v1", this.currentKeyId, nonce.toString("base64url"), cipher.getAuthTag().toString("base64url"),
      encrypted.toString("base64url")].join(".");
  }
  decrypt(id: string, value: string): unknown {
    if (value.length > 24_000) throw new Error("Invalid mail payload.");
    const [version, keyId, nonceText, tagText, encryptedText, extra] = value.split(".");
    const key = this.keys.get(keyId ?? "");
    if (version !== "v1" || !key || !nonceText || !tagText || !encryptedText || extra !== undefined ||
      ![nonceText, tagText, encryptedText].every(text => /^[A-Za-z0-9_-]+$/.test(text))) {
      throw new Error("Invalid mail payload.");
    }
    const nonce = Buffer.from(nonceText, "base64url"), tag = Buffer.from(tagText, "base64url");
    if (nonce.length !== 12 || tag.length !== 16) throw new Error("Invalid mail payload.");
    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAAD(Buffer.from(`savora-mail-v1:${id}`));
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8")) as unknown;
  }
}
