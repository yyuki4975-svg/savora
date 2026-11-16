export type MailPurpose = "VerifyEmail" | "ResetPassword";
export interface AuthMail {
  recipient: string;
  purpose: MailPurpose;
  actionUrl: string;
  expiresAt: string;
}
export interface MailLease { id: string; leaseToken: string; attempt: number; expiresAt: string }
export type MailFailureReason = "DeliveryFailed" | "InvalidPayload" | "PermanentDeliveryFailed";
/** Only an allowlisted category crosses the transport boundary, never provider diagnostics. */
export class MailDeliveryFailure extends Error {
  constructor(readonly permanent: boolean) { super("Mail delivery failed."); }
}
export interface MailQueue {
  claim(): Promise<MailLease | null>;
  read(lease: MailLease): Promise<AuthMail | null>;
  complete(lease: MailLease): Promise<boolean>;
  fail(lease: MailLease, reason: MailFailureReason): Promise<boolean>;
}
/** An adapter must enforce the supplied deadline and stable job-ID idempotency key. */
export interface MailTransport {
  send(mail: AuthMail, context: { idempotencyKey: string; signal: AbortSignal }): Promise<void>;
}
export type MailRunResult = "NotConfigured" | "Idle" | "Delivered" | "RetryScheduled" | "LeaseLost" | "DeadLettered";

/** No transport => no claims, attempts or false acknowledgements. No sensitive diagnostic output. */
export async function runMailOnce(queue: MailQueue, transport?: MailTransport): Promise<MailRunResult> {
  if (!transport) return "NotConfigured";
  const lease = await queue.claim();
  if (!lease) return "Idle";
  let mail: AuthMail | null;
  try { mail = await queue.read(lease); }
  catch { return await queue.fail(lease, "InvalidPayload") ? "DeadLettered" : "LeaseLost"; }
  if (!mail) return "LeaseLost";
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    // Bound the wait even if an incorrectly implemented adapter ignores abort.
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => { controller.abort(); reject(new Error("Delivery deadline")); }, 20_000);
    });
    await Promise.race([transport.send(mail, { idempotencyKey: lease.id, signal: controller.signal }), deadline]);
    return await queue.complete(lease) ? "Delivered" : "LeaseLost";
  } catch (error) {
    const permanent = error instanceof MailDeliveryFailure && error.permanent;
    return await queue.fail(lease, permanent ? "PermanentDeliveryFailed" : "DeliveryFailed")
      ? (permanent ? "DeadLettered" : "RetryScheduled") : "LeaseLost";
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
