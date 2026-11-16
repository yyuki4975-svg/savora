import { loadAccountProfile } from "../../../lib/auth/account-server";
import { privateResponse } from "../../../lib/auth/account-boundary.mjs";

export const dynamic = "force-dynamic";
export function GET(request: Request) { return loadAccountProfile(request); }
// Legacy writes trusted browser identity headers. Preserve D1/local data, but
// never silently migrate or associate that data with a new email account.
export function POST() { return privateResponse({ code: "KitchenIntegrationPending" }, 409); }
