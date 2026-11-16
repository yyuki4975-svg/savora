import "server-only";
import { accountProfile, accountRequest } from "./account-boundary.mjs";
import { productRequest } from "./product-boundary.mjs";
import { nodeRequestOrigin } from "./node-request-origin.mjs";

function environment() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    SAVORA_ACCOUNT_API_ENABLED: process.env.SAVORA_ACCOUNT_API_ENABLED,
    SAVORA_ACCOUNT_API_BASE_URL: process.env.SAVORA_ACCOUNT_API_BASE_URL,
    SAVORA_ACCOUNT_WEB_ORIGIN: process.env.SAVORA_ACCOUNT_WEB_ORIGIN,
    SAVORA_TRUSTED_CLIENT_IP: process.env.SAVORA_TRUSTED_CLIENT_IP,
  };
}
export function proxyAccount(request: Request, action: string) { return accountRequest(nodeRequestOrigin(request), action, environment()); }
export function loadAccountProfile(request: Request) { return accountProfile(nodeRequestOrigin(request), environment()); }
export function proxyProduct(request: Request, path: string) { return productRequest(nodeRequestOrigin(request), path, environment()); }
