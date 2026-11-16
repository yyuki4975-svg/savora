import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { IDENTITY, IdentityService, objectInput } from "../application/identity/identity";
import { KITCHEN, type KitchenStore, idempotencyKey, kitchenSlug, kitchenWrite, revisionInput } from "../application/personal-kitchen/kitchen";
import { ProductError } from "../domain/product-error";
import { requireCapability } from "../domain/permissions";
import type { ProductConfig } from "../infrastructure/product/config";
import { csrfToken, equalToken } from "../infrastructure/product/crypto";
import { PRODUCT_CONFIG, readSessionCookie } from "./identity.controller";
import { PRODUCT_LIMITER, PgRateLimiter } from "../infrastructure/product/rate-limiter";
import { WORKSPACE, workspaceWrite, importItems, type WorkspaceStore } from "../application/personal-kitchen/workspace";

@Controller("v1/me/kitchen")
export class KitchenController {
  constructor(@Inject(IDENTITY) private readonly identity: IdentityService,
    @Inject(KITCHEN) private readonly kitchen: KitchenStore, @Inject(PRODUCT_CONFIG) private readonly config: ProductConfig,
    @Inject(PRODUCT_LIMITER) private readonly limiter: PgRateLimiter, @Inject(WORKSPACE) private readonly workspace: WorkspaceStore) {}
  private async actor(req: Request, write = false): Promise<string> {
    const token = readSessionCookie(req, this.config.secureCookies);
    const session = await this.identity.session(token);
    requireCapability(session.account.role, "PrivateKitchen");
    if (write) {
      const supplied = req.headers["x-savora-csrf"];
      if (typeof supplied !== "string" || !equalToken(supplied, csrfToken(this.config.csrfKey, token!))) {
        throw new ProductError(403, "InvalidCsrf", "Refresh the page and try again.");
      }
      await this.limiter.consume("kitchen-write-actor", session.account.id, 120, 900);
    }
    return session.account.id; // Never read account identity or role from request parameters/body.
  }
  @Get()
  async list(@Req() req: Request, @Res() res: Response): Promise<void> {
    const account = await this.actor(req);
    if (Object.keys(req.query).some(key => !["after", "limit"].includes(key))) throw new ProductError(422, "InvalidQuery", "Invalid query fields.");
    const after = req.query.after === undefined ? null : kitchenSlug(req.query.after);
    const limit = req.query.limit === undefined ? 50 : typeof req.query.limit === "string" && /^\d{1,2}$/.test(req.query.limit) ? Number(req.query.limit) : 0;
    if (limit < 1 || limit > 50) throw new ProductError(422, "InvalidLimit", "Limit must be between 1 and 50.");
    res.json(await this.kitchen.list(account, after, limit));
  }
  @Put(":slug")
  async save(@Param("slug") slug: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const account = await this.actor(req, true);
    res.status(200).json(await this.kitchen.save(account, kitchenSlug(slug), kitchenWrite(body), idempotencyKey(req.headers["x-idempotency-key"])));
  }
  @Get("workspace") async loadWorkspace(@Req() req: Request, @Res() res: Response) {
    if (Object.keys(req.query).length) throw new ProductError(422, "InvalidQuery", "Invalid query.");
    res.json(await this.workspace.load(await this.actor(req)));
  }
  // Workspace uses POST so it cannot collide with the recipe-slug PUT route.
  @Post("workspace") async saveWorkspace(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const actor = await this.actor(req, true), input = workspaceWrite(body);
    res.status(200).json(await this.workspace.save(actor, input.content, input.revision, idempotencyKey(req.headers["x-idempotency-key"])));
  }
  @Post("import-preview") async preview(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    res.status(200).json(await this.workspace.import(await this.actor(req, true), importItems(body), false, ""));
  }
  @Post("import") async applyImport(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    res.status(200).json(await this.workspace.import(await this.actor(req, true), importItems(body), true, idempotencyKey(req.headers["x-idempotency-key"])));
  }
  @Delete(":slug")
  async remove(@Param("slug") slug: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const account = await this.actor(req, true), input = objectInput(body, ["expectedRevision"]);
    await this.kitchen.remove(account, kitchenSlug(slug), revisionInput(input.expectedRevision, false), idempotencyKey(req.headers["x-idempotency-key"]));
    res.status(204).end();
  }
}
