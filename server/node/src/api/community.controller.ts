import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { COMMUNITY, communityFilter, communityId, communityInput, communityText, type CommunityStore } from "../application/community/community";
import { IDENTITY, IdentityService, objectInput } from "../application/identity/identity";
import { idempotencyKey } from "../application/personal-kitchen/kitchen";
import { ProductError } from "../domain/product-error";
import { PRODUCT_CONFIG, readSessionCookie } from "./identity.controller";
import type { ProductConfig } from "../infrastructure/product/config";
import { PRODUCT_LIMITER, PgRateLimiter } from "../infrastructure/product/rate-limiter";
import { productActor } from "./product-actor";

@Controller("v1/community")
export class CommunityController {
  constructor(@Inject(IDENTITY) private readonly identity: IdentityService, @Inject(COMMUNITY) private readonly store: CommunityStore,
    @Inject(PRODUCT_CONFIG) private readonly config: ProductConfig, @Inject(PRODUCT_LIMITER) private readonly limiter: PgRateLimiter) {}
  private async actor(req: Request, write = true, moderation = false) {
    const actor = await productActor(req, this.identity, this.config, write, moderation ? "ModerateCommunity" : "Contribute");
    await this.limiter.consume(write ? "community-write-actor" : "community-read-actor", actor, write ? 60 : 300, 900);
    return actor;
  }
  private async optional(req: Request) {
    if (!readSessionCookie(req, this.config.secureCookies)) return null;
    return this.actor(req, false); // Invalid/stale cookies are not treated as another identity.
  }
  private query(req: Request, extras: string[] = []) {
    if (Object.keys(req.query).some(k => !["after", "limit", ...extras].includes(k))) throw new ProductError(422, "InvalidQuery", "Invalid query.");
    const after = req.query.after === undefined ? null : communityId(req.query.after);
    const limit = req.query.limit === undefined ? 20 : typeof req.query.limit === "string" && /^\d{1,2}$/.test(req.query.limit) ? Number(req.query.limit) : 0;
    if (limit < 1 || limit > 50) throw new ProductError(422, "InvalidLimit", "Choose a limit from 1 to 50.");
    return { after, limit };
  }
  @Get("posts") async feed(@Req() req: Request, @Res() res: Response) {
    const { after, limit } = this.query(req, ["space", "saved", "recipe"]);
    if (req.query.saved !== undefined && req.query.saved !== "true") throw new ProductError(422, "InvalidQuery", "Invalid filter.");
    res.json(await this.store.feed(await this.optional(req), communityFilter(req.query.space, req.query.recipe), after, limit, req.query.saved === "true"));
  }
  @Post("posts") async create(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    res.status(201).json(await this.store.create(await this.actor(req), communityInput(body), idempotencyKey(req.headers["x-idempotency-key"])));
  }
  @Get("posts/:id/replies") async replies(@Param("id") id: string, @Req() req: Request, @Res() res: Response) {
    const { after, limit } = this.query(req);
    res.json(await this.store.replies(await this.optional(req), communityId(id), after, limit));
  }
  @Post("posts/:id/replies") async reply(@Param("id") id: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const input = objectInput(body, ["text"]);
    res.status(201).json(await this.store.reply(await this.actor(req), communityId(id), communityText(input.text, 2000), idempotencyKey(req.headers["x-idempotency-key"])));
  }
  @Put("posts/:id/marks") async mark(@Param("id") id: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const input = objectInput(body, ["kind", "active"]);
    if (!["Helpful", "Saved"].includes(input.kind as string) || typeof input.active !== "boolean") throw new ProductError(422, "InvalidCommunity", "Invalid mark.");
    res.json(await this.store.mark(await this.actor(req), communityId(id), input.kind as "Helpful" | "Saved", input.active, idempotencyKey(req.headers["x-idempotency-key"])));
  }
  @Post("posts/:id/reports") async report(@Param("id") id: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const input = objectInput(body, ["reason"]);
    res.status(202).json(await this.store.report(await this.actor(req), communityId(id), communityText(input.reason, 1000), idempotencyKey(req.headers["x-idempotency-key"])));
  }
  @Delete("posts/:id") async remove(@Param("id") id: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    objectInput(body, []);
    res.json(await this.store.remove(await this.actor(req), communityId(id), idempotencyKey(req.headers["x-idempotency-key"])));
  }
  @Get("reports") async reports(@Req() req: Request, @Res() res: Response) {
    const { after, limit } = this.query(req);
    res.json(await this.store.reports(await this.actor(req, false, true), after, limit));
  }
  @Post("reports/:id") async moderate(@Param("id") id: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const input = objectInput(body, ["action", "reason"]);
    if (input.action !== "hide" && input.action !== "dismiss") throw new ProductError(422, "InvalidCommunity", "Invalid moderation action.");
    res.status(200).json(await this.store.moderate(await this.actor(req, true, true), communityId(id), input.action, communityText(input.reason, 1000), idempotencyKey(req.headers["x-idempotency-key"])));
  }
}
