import { MailDeliveryFailure, type AuthMail, type MailTransport } from "../../application/mail/outbox";
import { validateAuthMail } from "./mail-outbox";

export interface ResendConfig { apiKey: string; from: string; origin: string }
const sender = "accounts@mail.cookwsavora.com";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

/** No secret is returned by operator summaries. Missing configuration is not delivery readiness. */
export function loadResendConfig(env: NodeJS.ProcessEnv = process.env): ResendConfig {
  const apiKey = env.RESEND_API_KEY ?? "";
  if (!/^re_[A-Za-z0-9_-]{20,200}$/.test(apiKey)) throw new Error("Invalid Resend configuration.");
  const from = env.SAVORA_MAIL_FROM ?? `Savora <${sender}>`;
  if (from !== sender && from !== `Savora <${sender}>`) throw new Error("Invalid Resend configuration.");
  let origin: URL;
  try { origin = new URL(env.SAVORA_WEB_ORIGIN ?? ""); }
  catch { throw new Error("Invalid Resend configuration."); }
  const development = env.SAVORA_ENVIRONMENT?.toLowerCase() === "development";
  const local = development && origin.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if ((!local && origin.protocol !== "https:") || origin.username || origin.password ||
    origin.pathname !== "/" || origin.search || origin.hash || origin.origin === "null") {
    throw new Error("Invalid Resend configuration.");
  }
  return { apiKey, from, origin: origin.origin };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}

/** Stable content across retries; no relative time, random template IDs or attempt counters. */
function payload(mail: AuthMail, config: ResendConfig) {
  const verify = mail.purpose === "VerifyEmail";
  const subject = verify ? "Verify your Savora email" : "Reset your Savora password";
  const explanation = verify ? "Confirm your email address to sign in to Savora."
    : "Use this link to choose a new Savora password.";
  const action = verify ? "Verify email" : "Reset password";
  const expiry = new Date(mail.expiresAt).toISOString();
  const closing = `This link expires at ${expiry} and can be used once. If you did not request this email, you can ignore it.`;
  return { from: config.from, to: [mail.recipient], subject,
    text: `${explanation}\n\n${action}: ${mail.actionUrl}\n\n${closing}`,
    html: `<html><body><h1>${subject}</h1><p>${explanation}</p><p><a href="${escapeHtml(mail.actionUrl)}">${action}</a></p><p>${closing}</p></body></html>` };
}

/** Native fetch: no SDK dependency, retries, provider URL override or redirects.
 * https://resend.com/docs/api-reference/emails/send-email
 * https://resend.com/docs/dashboard/emails/idempotency-keys
 */
export class ResendMailTransport implements MailTransport {
  private readonly config: ResendConfig;
  constructor(config: ResendConfig, private readonly request: typeof fetch = fetch) {
    this.config = Object.freeze(loadResendConfig({ RESEND_API_KEY: config.apiKey, SAVORA_MAIL_FROM: config.from,
      SAVORA_WEB_ORIGIN: config.origin, SAVORA_ENVIRONMENT: "Development" }));
  }

  async send(value: AuthMail, context: { idempotencyKey: string; signal: AbortSignal }): Promise<void> {
    let mail: AuthMail;
    try {
      mail = validateAuthMail(value, this.config.origin);
      // Verification tokens live at most 24h, resets 30m; retries remain inside provider dedupe retention.
      const remaining = Date.parse(mail.expiresAt) - Date.now();
      const maximum = mail.purpose === "VerifyEmail" ? 86_400_000 : 1_800_000;
      if (remaining <= 0 || remaining > maximum || !uuid.test(context.idempotencyKey) ||
        !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(mail.recipient)) {
        throw new Error("Invalid mail.");
      }
    } catch { throw new MailDeliveryFailure(true); }
    if (context.signal.aborted) throw new MailDeliveryFailure(false);
    const controller = new AbortController();
    // Shorter than the queue's 20s deadline and 60s fenced lease.
    const timer = setTimeout(() => controller.abort(), 12_000);
    const signal = AbortSignal.any([context.signal, controller.signal]);
    try {
      const response = await this.request("https://api.resend.com/emails", { method: "POST", redirect: "error",
        signal, headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json",
          "Idempotency-Key": `savora-auth/${context.idempotencyKey}` }, body: JSON.stringify(payload(mail, this.config)) });
      const reader = response.body?.getReader();
      if (!reader) throw new MailDeliveryFailure(false);
      let text = "", bytes = 0;
      const decoder = new TextDecoder("utf-8", { fatal: true });
      try {
        while (true) {
          signal.throwIfAborted();
          const next = await reader.read();
          if (next.done) break;
          bytes += next.value.byteLength;
          if (bytes > 8192) throw new MailDeliveryFailure(false);
          text += decoder.decode(next.value, { stream: true });
        }
        text += decoder.decode();
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      if (signal.aborted) throw new MailDeliveryFailure(false);
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { throw new MailDeliveryFailure(false); }
      const body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
      if (response.status === 200 && typeof body.id === "string" && uuid.test(body.id)) return;
      // Never forward provider messages, recipient echoes or authorization diagnostics.
      const transient = response.status === 408 || response.status === 429 || response.status >= 500 ||
        (response.status === 409 && ["concurrent_idempotent_requests", "resource_locked"].includes(String(body.name)));
      const permanent = response.status >= 400 && response.status < 500 && !transient;
      throw new MailDeliveryFailure(permanent);
    } catch (error) {
      if (error instanceof MailDeliveryFailure) throw error;
      throw new MailDeliveryFailure(false);
    } finally { clearTimeout(timer); }
  }
}
