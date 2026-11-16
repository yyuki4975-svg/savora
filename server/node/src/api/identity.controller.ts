import { Body, Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { IDENTITY, IdentityService } from "../application/identity/identity";
import { ProductError } from "../domain/product-error";
import { csrfToken, equalToken } from "../infrastructure/product/crypto";
import type { ProductConfig } from "../infrastructure/product/config";

export const PRODUCT_CONFIG = Symbol("ProductConfig");
export function readSessionCookie(req: Request, secure: boolean): string | null {
  const name = secure ? "__Host-savora-sid" : "savora-sid";
  const found = (req.headers.cookie ?? "").split(";").map(part => part.trim())
    .filter(part => part.startsWith(`${name}=`));
  // Ambiguous duplicate cookies are never accepted.
  if (found.length !== 1) return null;
  const value = found[0]!.slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}

@Controller("v1/auth")
export class IdentityController {
  constructor(@Inject(IDENTITY) private readonly identity: IdentityService,
    @Inject(PRODUCT_CONFIG) private readonly config: ProductConfig) {}
  private cookie(res: Response, value: string, expires: Date): void {
    res.cookie(this.config.secureCookies ? "__Host-savora-sid" : "savora-sid", value,
      { httpOnly: true, secure: this.config.secureCookies, sameSite: "lax", path: "/", expires });
  }
  @Post("register")
  async register(@Body() body: unknown, @Res() res: Response): Promise<void> {
    await this.identity.register(body); res.status(202).json({ accepted: true });
  }
  @Post("login")
  async login(@Body() body: unknown, @Res() res: Response): Promise<void> {
    const result = await this.identity.login(body);
    this.cookie(res, result.token, new Date(result.expiresAt));
    res.status(200).json({ account: result.account, expiresAt: result.expiresAt, csrfToken: csrfToken(this.config.csrfKey, result.token) });
  }
  @Get("session")
  async session(@Req() req: Request, @Res() res: Response): Promise<void> {
    const token = readSessionCookie(req, this.config.secureCookies);
    const session = await this.identity.session(token);
    res.json({ ...session, csrfToken: csrfToken(this.config.csrfKey, token!) });
  }
  @Post("logout")
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const token = readSessionCookie(req, this.config.secureCookies);
    await this.identity.session(token);
    const supplied = req.headers["x-savora-csrf"];
    if (typeof supplied !== "string" || !equalToken(supplied, csrfToken(this.config.csrfKey, token!))) {
      throw new ProductError(403, "InvalidCsrf", "Refresh the page and try again.");
    }
    await this.identity.logout(token!);
    this.cookie(res, "", new Date(0)); res.status(204).end();
  }
  @Post("verify-email")
  async verify(@Body() body: unknown, @Res() res: Response): Promise<void> {
    await this.identity.verifyEmail(body); res.status(204).end();
  }
  @Post("resend-verification")
  async resend(@Body() body: unknown, @Res() res: Response): Promise<void> {
    await this.identity.requestAction(body, "VerifyEmail"); res.status(202).json({ accepted: true });
  }
  @Post("forgot-password")
  async forgot(@Body() body: unknown, @Res() res: Response): Promise<void> {
    await this.identity.requestAction(body, "ResetPassword"); res.status(202).json({ accepted: true });
  }
  @Post("reset-password")
  async reset(@Body() body: unknown, @Res() res: Response): Promise<void> {
    await this.identity.resetPassword(body); res.status(204).end();
  }
}
