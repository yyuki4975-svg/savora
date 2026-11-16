import { readFile } from "node:fs/promises";
import { All, Controller, Get, Inject, Logger, Res } from "@nestjs/common";
import type { Response } from "express";
import { DATABASE_HEALTH, type DatabaseHealth } from "../application/catalog/catalog-queries";
import { APP_CONFIG, type AppConfig } from "../config";
import { writeEmpty, writeJson } from "./http-results";

/** ASP.NET HealthCheckMiddleware's plain-text writer and no-cache headers. */
function writeHealth(res: Response, healthy: boolean): void {
  const body = healthy ? "Healthy" : "Unhealthy";
  res.status(healthy ? 200 : 503);
  res.setHeader("Cache-Control", "no-store, no-cache");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "Thu, 01 Jan 1970 00:00:00 GMT");
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Length", Buffer.byteLength(body));
  res.end(body);
}

@Controller()
export class SystemController {
  private readonly logger = new Logger(SystemController.name);

  constructor(
    @Inject(DATABASE_HEALTH) private readonly database: DatabaseHealth,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get()
  root(@Res() res: Response): void {
    writeJson(res, 200, { service: "Savora API", version: "v1", health: "/health/ready" });
  }

  /** Process liveness: no dependency checks (Predicate = _ => false). MapHealthChecks accepts any method. */
  @All("health/live")
  live(@Res() res: Response): void {
    writeHealth(res, true);
  }

  /** Readiness: the PostgreSQL connectivity check tagged "ready". */
  @All("health/ready")
  async ready(@Res() res: Response): Promise<void> {
    writeHealth(res, await this.database.canConnect());
  }

  /** MapOpenApi() is Development-only in the C# API. */
  @Get("openapi/v1.json")
  async openApi(@Res() res: Response): Promise<void> {
    if (this.config.environment !== "Development") return writeEmpty(res, 404);
    try {
      const document = JSON.parse(await readFile(this.config.openApiDocumentPath, "utf8")) as unknown;
      writeJson(res, 200, document);
    } catch (error) {
      this.logger.error(`OpenAPI document unavailable at ${this.config.openApiDocumentPath}`, error as Error);
      writeEmpty(res, 404);
    }
  }
}
