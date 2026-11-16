import type { RequestHandler } from "express";
import type { ProductConfig } from "../infrastructure/product/config";
import { ProductError } from "../domain/product-error";
import type { PgRateLimiter } from "../infrastructure/product/rate-limiter";

/** Small first-party JSON boundary; leaves frozen GET/catalog body and error behavior untouched. */
export function productPipeline(config: ProductConfig, limiter: PgRateLimiter, group: "auth" | "kitchen" | "submissions" | "community" = "auth"): RequestHandler {
  return (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    res.setHeader("Referrer-Policy", "no-referrer");
    const reject = (status: number, code: string) => {
      res.status(status).type("application/problem+json").json({ type: "about:blank", status, title: code, code });
    };
    if (["GET", "HEAD"].includes(req.method)) return next();
    // Browser same-origin policy + mandatory non-simple header + exact Origin => login CSRF protection.
    // No CORS or credential wildcard added. Web integration uses a same-origin BFF.
    if (req.headers.origin !== config.origin || req.headers["x-savora-request"] !== "1") {
      reject(403, "InvalidOrigin"); req.resume(); return;
    }
    if (req.method === "OPTIONS") { reject(405, "MethodNotAllowed"); return; }
    if (req.headers["content-encoding"] && req.headers["content-encoding"] !== "identity") {
      reject(415, "UnsupportedEncoding"); req.resume(); return;
    }
    const type = req.headers["content-type"] ?? "";
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(type)) {
      reject(415, "JsonRequired"); req.resume(); return;
    }
    let total = 0, finished = false;
    const chunks: Buffer[] = [];
    const fail = (status: number, code: string) => {
      if (finished) return;
      finished = true; chunks.length = 0; reject(status, code); req.resume();
    };
    req.on("data", (value: Buffer) => {
      if (finished) return;
      total += value.length;
      if (total > (group === "auth" ? 8192 : 24 * 1024)) { fail(413, "BodyTooLarge"); return; }
      chunks.push(value);
    });
    req.on("end", () => {
      if (finished) return;
      try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
        const value: unknown = JSON.parse(text);
        if (!value || typeof value !== "object" || Array.isArray(value)) { fail(422, "InvalidInput"); return; }
        req.body = value; finished = true;
        // Trust req.ip only through the deployment's explicitly configured proxy policy, not arbitrary headers.
        const account = (value as Record<string, unknown>).email;
        const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
        const rawScope = req.path.replace(/\/$/, "").toLowerCase();
        const scope = ["/register", "/login", "/logout", "/verify-email", "/resend-verification", "/forgot-password", "/reset-password"]
          .includes(rawScope) ? rawScope : "unknown";
        void (async () => {
          await limiter.consume(`${group}-ip:${scope}`, ip, group === "auth" ? 40 : 120, 900);
          if (group === "auth" && typeof account === "string") await limiter.consume(`auth-account:${scope}`, account.trim().toLowerCase(), 8, 900);
          next();
        })().catch(error => {
          if (error instanceof ProductError) {
            res.setHeader("Retry-After", "900"); reject(error.status, error.code);
          } else { reject(503, "SecurityUnavailable"); }
        });
      } catch { fail(400, "InvalidJson"); }
    });
    req.on("error", () => fail(400, "InvalidBody"));
    req.on("aborted", () => { finished = true; chunks.length = 0; });
  };
}
