import type { Request } from "express";
import type { IdentityService } from "../application/identity/identity";
import { ProductError } from "../domain/product-error";
import { requireCapability, type Capability } from "../domain/permissions";
import type { ProductConfig } from "../infrastructure/product/config";
import { csrfToken, equalToken } from "../infrastructure/product/crypto";
import { readSessionCookie } from "./identity.controller";
export async function productActor(req: Request, identity: IdentityService, config: ProductConfig, write: boolean, capability: Capability) {
  const token = readSessionCookie(req, config.secureCookies), session = await identity.session(token);
  requireCapability(session.account.role, capability);
  if (write) {
    const supplied = req.headers["x-savora-csrf"];
    if (typeof supplied !== "string" || !equalToken(supplied, csrfToken(config.csrfKey, token!)))
      throw new ProductError(403, "InvalidCsrf", "Refresh the page and try again.");
  }
  return session.account.id;
}
