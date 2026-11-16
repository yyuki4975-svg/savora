import { Body, Controller, Get, Inject, Param, Post, Put, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { IDENTITY, IdentityService, objectInput } from "../application/identity/identity";
import { SUBMISSIONS, type SubmissionStore, submissionContent, submissionId, submissionRevision, reviewInput } from "../application/submissions/submissions";
import { idempotencyKey } from "../application/personal-kitchen/kitchen";
import { ProductError } from "../domain/product-error";
import { requireCapability } from "../domain/permissions";
import type { ProductConfig } from "../infrastructure/product/config";
import { csrfToken, equalToken } from "../infrastructure/product/crypto";
import { PRODUCT_CONFIG, readSessionCookie } from "./identity.controller";
import { PRODUCT_LIMITER, PgRateLimiter } from "../infrastructure/product/rate-limiter";
import { PUBLICATION, publicationInput, type PublicationStore } from "../application/submissions/publication";

// Explicit response handling follows https://docs.nestjs.com/controllers#library-specific-approach
@Controller("v1/submissions")
export class SubmissionsController {
  constructor(@Inject(IDENTITY) private readonly identity: IdentityService,
    @Inject(SUBMISSIONS) private readonly store: SubmissionStore, @Inject(PRODUCT_CONFIG) private readonly config: ProductConfig,
    @Inject(PRODUCT_LIMITER) private readonly limiter: PgRateLimiter, @Inject(PUBLICATION) private readonly publication: PublicationStore) {}
  private async actor(req: Request, write: boolean, review = false): Promise<string> {
    const token = readSessionCookie(req, this.config.secureCookies), session = await this.identity.session(token);
    requireCapability(session.account.role, review ? "ReviewRecipe" : "Contribute");
    if (write) {
      const supplied = req.headers["x-savora-csrf"];
      if (typeof supplied !== "string" || !equalToken(supplied, csrfToken(this.config.csrfKey, token!))) {
        throw new ProductError(403, "InvalidCsrf", "Refresh the page and try again.");
      }
    }
    await this.limiter.consume(write ? "submission-write-actor" : "submission-read-actor", session.account.id, write ? 60 : 300, 900);
    return session.account.id;
  }
  private query(req: Request) {
    if (Object.keys(req.query).some(key => !["after", "limit"].includes(key))) throw new ProductError(422, "InvalidQuery", "Invalid query fields.");
    const after = req.query.after === undefined ? null : submissionId(req.query.after);
    const limit = req.query.limit === undefined ? 20 : typeof req.query.limit === "string" && /^\d{1,2}$/.test(req.query.limit) ? Number(req.query.limit) : 0;
    if (limit < 1 || limit > 50) throw new ProductError(422, "InvalidLimit", "Limit must be between 1 and 50.");
    return { after, limit };
  }
  @Get()
  async list(@Req() req: Request, @Res() res: Response) {
    const actor = await this.actor(req, false), { after, limit } = this.query(req);
    res.json(await this.store.list(actor, false, after, limit));
  }
  // Static routes precede the parameter route: /review-queue is not an ID.
  @Get("review-queue")
  async queue(@Req() req: Request, @Res() res: Response) {
    const actor = await this.actor(req, false, true), { after, limit } = this.query(req);
    res.json(await this.store.list(actor, true, after, limit));
  }
  @Get(":id/review")
  async reviewDetail(@Param("id") id: string, @Req() req: Request, @Res() res: Response) {
    res.json(await this.store.detail(await this.actor(req, false, true), submissionId(id), true));
  }
  @Get(":id")
  async detail(@Param("id") id: string, @Req() req: Request, @Res() res: Response) {
    res.json(await this.store.detail(await this.actor(req, false), submissionId(id), false));
  }
  @Post()
  async create(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const actor = await this.actor(req, true), input = objectInput(body, ["content"]);
    res.status(201).json(await this.store.create(actor, submissionContent(input.content), idempotencyKey(req.headers["x-idempotency-key"])));
  }
  @Put(":id")
  async edit(@Param("id") id: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const actor = await this.actor(req, true), input = objectInput(body, ["content", "expectedRevision"]);
    res.json(await this.store.edit(actor, submissionId(id), submissionContent(input.content), submissionRevision(input.expectedRevision), idempotencyKey(req.headers["x-idempotency-key"])));
  }
  @Post(":id/submit")
  async submit(@Param("id") id: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const actor = await this.actor(req, true), input = objectInput(body, ["expectedRevision"]);
    res.status(200).json(await this.store.submit(actor, submissionId(id), submissionRevision(input.expectedRevision), idempotencyKey(req.headers["x-idempotency-key"])));
  }
  @Post(":id/review")
  async review(@Param("id") id: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const actor = await this.actor(req, true, true), input = reviewInput(body);
    res.status(200).json(await this.store.review(actor, submissionId(id), input.action, input.reason, input.expectedRevision, idempotencyKey(req.headers["x-idempotency-key"])));
  }
  @Post(":id/publish") async publish(@Param("id") id: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    res.status(200).json(await this.publication.publish(await this.actor(req, true, true), submissionId(id), publicationInput(body), idempotencyKey(req.headers["x-idempotency-key"])));
  }
  @Post(":id/withdraw") async withdraw(@Param("id") id: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const input = objectInput(body, ["expectedRevision", "reason"]);
    if (typeof input.reason !== "string" || !input.reason.trim() || input.reason.length > 1000) throw new ProductError(422, "InvalidSubmission", "Add a withdrawal reason.");
    res.status(200).json(await this.publication.withdraw(await this.actor(req, true), submissionId(id), submissionRevision(input.expectedRevision), input.reason.trim(), idempotencyKey(req.headers["x-idempotency-key"])));
  }
}
