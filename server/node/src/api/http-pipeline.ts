// Express middleware and the Nest exception filter reproducing the C# API pipeline:
// HostFiltering (AllowedHosts) -> [Production: HSTS + HTTPS redirection] -> routing (405 for
// known paths with other methods) -> endpoints -> UseExceptionHandler.
import { ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger, NotFoundException } from "@nestjs/common";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { AppConfig } from "../config";
import { writeEmpty, writeServerError } from "./http-results";
import { ProductError } from "../domain/product-error";

// Microsoft.AspNetCore.HostFiltering default failure response (IncludeFailureMessage = true).
const HOST_FILTERING_RESPONSE =
  '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN""http://www.w3.org/TR/html4/strict.dtd">\r\n' +
  "<HTML><HEAD><TITLE>Bad Request</TITLE>\r\n" +
  '<META HTTP-EQUIV="Content-Type" Content="text/html; charset=us-ascii"></ HEAD >\r\n' +
  "<BODY><h2>Bad Request - Invalid Hostname</h2>\r\n" +
  "<hr><p>HTTP Error 400. The request hostname is invalid.</p>\r\n" +
  "</BODY></HTML>";

function hostWithoutPort(hostHeader: string): string {
  const host = hostHeader.trim();
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end > 0 ? host.slice(0, end + 1) : host;
  }
  const colon = host.lastIndexOf(":");
  return colon >= 0 ? host.slice(0, colon) : host;
}

function hostMatches(host: string, allowed: string): boolean {
  if (allowed === "*") return true;
  if (allowed.startsWith("*.")) return host.toLowerCase().endsWith(allowed.slice(1).toLowerCase());
  return host.toLowerCase() === allowed.toLowerCase();
}

export function hostFiltering(config: AppConfig): RequestHandler {
  const allowAll = config.allowedHosts.includes("*");
  return (req: Request, res: Response, next: NextFunction) => {
    if (allowAll) return next();
    const header = req.headers.host;
    // AllowEmptyHosts defaults to true.
    if (header === undefined || header.trim() === "") return next();
    const host = hostWithoutPort(header);
    if (config.allowedHosts.some((allowed) => hostMatches(host, allowed))) return next();

    res.status(400);
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Length", Buffer.byteLength(HOST_FILTERING_RESPONSE, "ascii"));
    res.end(HOST_FILTERING_RESPONSE, "ascii");
  };
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** UseHsts() + UseHttpsRedirection() (Production only). */
export function httpsPolicy(config: AppConfig): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const host = hostWithoutPort(req.headers.host ?? "").toLowerCase();
    if (req.secure) {
      if (!LOOPBACK_HOSTS.has(host)) res.setHeader("Strict-Transport-Security", "max-age=2592000");
      return next();
    }
    if (config.httpsPort === undefined || host === "") return next();
    const portSuffix = config.httpsPort === 443 ? "" : `:${config.httpsPort}`;
    res.status(307);
    res.setHeader("Location", `https://${host}${portSuffix}${req.originalUrl}`);
    res.setHeader("Content-Length", 0);
    res.end();
  };
}

/**
 * Endpoint routing returns 405 (empty body, `Allow: GET`) when a GET-only route is hit with another
 * method, HEAD and OPTIONS included. The health checks are not listed: MapHealthChecks accepts any method.
 */
export function methodGuard(config: AppConfig): RequestHandler {
  const routes: RegExp[] = [
    /^\/$/,
    /^\/v1\/recipes\/?$/i,
    /^\/v1\/discovery\/recipes\/?$/i,
    /^\/v1\/recipes\/[^/]+\/?$/i,
    /^\/v1\/places\/[^/]+\/?$/i,
  ];
  if (config.environment === "Development") {
    routes.push(/^\/openapi\/v1\.json$/i, /^\/v1\/operator\/recipes\/?$/i, /^\/v1\/operator\/recipes\/[^/]+\/?$/i);
  }

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "GET") return next();
    const path = req.path;
    if (routes.some((route) => route.test(path))) {
      res.setHeader("Allow", "GET");
      return writeEmpty(res, 405);
    }
    return next();
  };
}

@Catch()
export class HttpProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger("UnhandledException");

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (res.headersSent) {
      this.logger.error("Exception after the response started; sensitive diagnostics suppressed.");
      res.end();
      return;
    }

    if (exception instanceof ProductError) {
      res.status(exception.status).type("application/problem+json").json({
        type: "about:blank", status: exception.status, title: exception.message, code: exception.code,
      });
      return;
    }

    // Unmatched routes: ASP.NET returns a bare 404.
    if (exception instanceof NotFoundException) return writeEmpty(res, 404);

    if (exception instanceof HttpException && exception.getStatus() < 500) {
      return writeEmpty(res, exception.getStatus());
    }

    this.logger.error("Request failed; sensitive diagnostics suppressed.");
    writeServerError(res);
  }
}
