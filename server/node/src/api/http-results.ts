// Response writers that reproduce ASP.NET Core's Results/ProblemDetails output.
import { randomBytes } from "node:crypto";
import type { Response } from "express";
import type { SavoraEnvironment } from "../config";

/** W3C trace-context style id, the shape ASP.NET puts in ProblemDetails "traceId". */
export function newTraceId(): string {
  return `00-${randomBytes(16).toString("hex")}-${randomBytes(8).toString("hex")}-00`;
}

export function writeJson(res: Response, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", Buffer.byteLength(payload));
  res.end(payload);
}

function writeProblem(res: Response, status: number, problem: Record<string, unknown>): void {
  const payload = JSON.stringify(problem);
  res.status(status);
  res.setHeader("Content-Type", "application/problem+json");
  res.setHeader("Content-Length", Buffer.byteLength(payload));
  res.end(payload);
}

/** Results.ValidationProblem(errors) with AddProblemDetails(). */
export function writeValidationProblem(res: Response, errors: Record<string, string[]>): void {
  writeProblem(res, 400, {
    type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
    title: "One or more validation errors occurred.",
    status: 400,
    errors,
    traceId: newTraceId(),
  });
}

/**
 * Minimal-API parameter binding failure (e.g. limit=abc). RouteHandlerOptions.ThrowOnBadRequest
 * defaults to IsDevelopment(): in Development the BadHttpRequestException reaches
 * UseExceptionHandler() and becomes a 500 problem; otherwise the response is a bare 400.
 */
export function writeBindingFailure(res: Response, environment: SavoraEnvironment): void {
  if (environment === "Development") return writeServerError(res);
  writeEmpty(res, 400);
}

/** UseExceptionHandler() + AddProblemDetails() for an unhandled exception. */
export function writeServerError(res: Response): void {
  // ExceptionHandlerMiddleware.ClearCacheHeaders
  res.setHeader("Cache-Control", "no-cache,no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "-1");
  writeProblem(res, 500, {
    type: "https://tools.ietf.org/html/rfc9110#section-15.6.1",
    title: "An error occurred while processing your request.",
    status: 500,
    traceId: newTraceId(),
  });
}

/** Results.NotFound() and unmatched routes: status only, empty body. */
export function writeEmpty(res: Response, status: number): void {
  res.status(status);
  res.setHeader("Content-Length", 0);
  res.end();
}
