/** Default is configuration-only. Never claim queue work on a dry run. */
export function parseDeliveryArgs(args: readonly string[]): { apply: boolean } {
  if (args.length > 1 || (args.length === 1 && args[0] !== "--apply" && args[0] !== "--dry-run")) {
    throw new Error("Usage: mail:deliver [--dry-run|--apply]");
  }
  return { apply: args[0] === "--apply" };
}

/** Actual sending is separately opt-in; Production also requires the accepted artifact receipt. */
export function assertMailDeliveryAllowed(env: NodeJS.ProcessEnv, acceptProduction?: () => void): void {
  if (env.SAVORA_MAIL_DELIVERY_ENABLED !== "true" || env.SAVORA_PRODUCT_ENABLED !== "true") throw new Error("Live mail delivery is disabled.");
  const environment = env.SAVORA_ENVIRONMENT?.toLowerCase();
  if (environment !== "development" && environment !== "production") throw new Error("Live mail delivery is disabled.");
  const url = new URL(env.SAVORA_WEB_ORIGIN ?? "");
  if (url.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("Live delivery requires an accepted HTTPS web origin.");
  }
  if (environment === "production") {
    if (!acceptProduction) throw new Error("Production mail prerequisites have not been accepted.");
    acceptProduction();
  }
}
