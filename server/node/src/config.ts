import path from "node:path";

export type SavoraEnvironment = "Development" | "Production";

export interface AppConfig {
  environment: SavoraEnvironment;
  databaseUrl: string;
  port: number;
  bindHost: string;
  /** Host header allowlist (ASP.NET AllowedHosts). ["*"] disables filtering. */
  allowedHosts: string[];
  /** Express "trust proxy" setting; undefined keeps Express's default (no proxy trusted). */
  trustProxy: boolean | number | string | undefined;
  /** HTTPS port for Production HTTP->HTTPS redirects (ASP.NET UseHttpsRedirection); undefined disables redirects. */
  httpsPort: number | undefined;
  /** v1 contract served at /openapi/v1.json in Development. */
  openApiDocumentPath: string;
}

export const APP_CONFIG = Symbol("AppConfig");

const DEFAULT_ALLOWED_HOSTS = "cookwsavora.com;api.cookwsavora.com;localhost";

/** Compose supplies separate secrets so reserved characters are encoded correctly. */
export function databaseUrlFromEnvironment(env: NodeJS.ProcessEnv = process.env): string {
  const supplied = env.SAVORA_DATABASE_URL?.trim();
  if (supplied) return supplied;
  if (env.SAVORA_POSTGRES_USER && env.SAVORA_POSTGRES_PASSWORD && env.SAVORA_POSTGRES_DB) {
    const url = new URL("postgres://127.0.0.1");
    url.hostname = env.SAVORA_POSTGRES_HOST || "127.0.0.1";
    url.port = String(parsePort(env.SAVORA_POSTGRES_PORT, 5432, "SAVORA_POSTGRES_PORT"));
    // URL setters preserve existing '%' sequences; encode raw secrets first so pg's
    // decodeURIComponent does not corrupt literal percent characters.
    url.username = encodeURIComponent(env.SAVORA_POSTGRES_USER);
    url.password = encodeURIComponent(env.SAVORA_POSTGRES_PASSWORD);
    url.pathname = `/${encodeURIComponent(env.SAVORA_POSTGRES_DB)}`;
    return url.href;
  }
  throw new Error("SAVORA_DATABASE_URL is required. Supply it through the process environment or a secret store; never commit it.");
}

function parsePort(value: string | undefined, fallback: number | undefined, name: string): number | undefined {
  if (value === undefined || value.trim() === "") return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`${name} must be a TCP port number.`);
  return port;
}

function parseTrustProxy(value: string | undefined): AppConfig["trustProxy"] {
  if (value === undefined || value.trim() === "") return undefined;
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const databaseUrl = databaseUrlFromEnvironment(env);

  const environmentName = (env.SAVORA_ENVIRONMENT ?? (env.NODE_ENV === "development" ? "Development" : "Production")).trim();
  const environment: SavoraEnvironment = environmentName.toLowerCase() === "development" ? "Development" : "Production";

  const allowedHosts = (env.SAVORA_ALLOWED_HOSTS ?? DEFAULT_ALLOWED_HOSTS)
    .split(";")
    .map((host) => host.trim())
    .filter((host) => host.length > 0);

  return {
    environment,
    databaseUrl,
    port: parsePort(env.PORT, 5094, "PORT")!,
    bindHost: env.SAVORA_BIND_HOST?.trim() || "127.0.0.1",
    allowedHosts: allowedHosts.length === 0 ? ["*"] : allowedHosts,
    trustProxy: parseTrustProxy(env.SAVORA_TRUST_PROXY),
    httpsPort: parsePort(env.SAVORA_HTTPS_PORT, undefined, "SAVORA_HTTPS_PORT"),
    openApiDocumentPath:
      env.SAVORA_OPENAPI_PATH?.trim() ||
      // dist/src/config.js -> server/node/openapi/savora-v1.json
      path.resolve(__dirname, "..", "..", "openapi", "savora-v1.json"),
  };
}
