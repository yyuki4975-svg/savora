import { MailCipher } from "./crypto";

export interface ProductConfig { origin: string; secureCookies: boolean; csrfKey: Buffer; mailCipher: MailCipher }
export function loadProductConfig(env: NodeJS.ProcessEnv = process.env): ProductConfig | null {
  if (env.SAVORA_PRODUCT_ENABLED === undefined || env.SAVORA_PRODUCT_ENABLED === "false") return null;
  if (env.SAVORA_PRODUCT_ENABLED !== "true") throw new Error("SAVORA_PRODUCT_ENABLED must be true or false.");
  let origin: URL;
  try { origin = new URL(env.SAVORA_WEB_ORIGIN ?? ""); }
  catch { throw new Error("SAVORA_WEB_ORIGIN must be a valid origin."); }
  const development = env.SAVORA_ENVIRONMENT?.toLowerCase() === "development" ||
    (env.SAVORA_ENVIRONMENT === undefined && env.NODE_ENV === "development");
  const localHttp = development && origin.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (origin.origin === "null" || (!localHttp && origin.protocol !== "https:") || origin.username || origin.password ||
    origin.pathname !== "/" || origin.search || origin.hash) throw new Error("SAVORA_WEB_ORIGIN requires HTTPS (local Development excepted).");
  const parseKey = (raw: unknown): Buffer => {
    if (typeof raw !== "string" || !/^[a-fA-F0-9]{64}$/.test(raw)) throw new Error("Product keys must be 32-byte hex secrets.");
    return Buffer.from(raw, "hex");
  };
  let rawKeys: unknown;
  try { rawKeys = JSON.parse(env.SAVORA_MAIL_KEYS ?? ""); }
  catch { throw new Error("SAVORA_MAIL_KEYS requires a JSON key ring."); }
  if (!rawKeys || typeof rawKeys !== "object" || Array.isArray(rawKeys) || Object.keys(rawKeys).length > 8) {
    throw new Error("Invalid mail encryption key ring.");
  }
  const keys = new Map(Object.entries(rawKeys).map(([id, key]) => [id, parseKey(key)]));
  return { origin: origin.origin, secureCookies: !localHttp, csrfKey: parseKey(env.SAVORA_CSRF_KEY),
    mailCipher: new MailCipher(keys, env.SAVORA_MAIL_CURRENT_KEY ?? "") };
}
