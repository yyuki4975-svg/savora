/** Product policy, not a provider delivery guarantee. Changes require review. */
export const retentionPolicy = Object.freeze({
  version: 1, batchSize: 500, terminalMailDays: 30, actionTokenGraceDays: 1,
  limitGraceDays: 1, receiptLifetimeDays: 30, sessionIdleHours: 24,
  overdueWarningSeconds: 900,
});

export function parseMaintenanceArgs(args: readonly string[]): { command: "status" | "check" | "policy" | "maintain"; apply: boolean } {
  const [command = "status", ...flags] = args;
  if (!["status", "check", "policy", "maintain"].includes(command) ||
    (command !== "maintain" && flags.length > 0) || flags.length > 1 ||
    flags.some(flag => flag !== "--apply" && flag !== "--dry-run")) {
    throw new Error("Usage: product-maintenance status | check | policy | maintain [--dry-run|--apply]");
  }
  return { command: command as "status" | "check" | "policy" | "maintain", apply: flags[0] === "--apply" };
}
