export type LocalDevEnv = Record<string, string | undefined>;

const DEFAULT_FRONTEND_PROTOCOL = "http";
const DEFAULT_FRONTEND_HOST = "127.0.0.1";
const DEFAULT_FRONTEND_PORT = 5173;
const DEFAULT_BACKEND_PROTOCOL = "http";
const DEFAULT_BACKEND_BROWSER_HOST = "127.0.0.1";
const DEFAULT_BACKEND_BIND_HOST = "0.0.0.0";
const DEFAULT_BACKEND_PORT = 3001;
const DEFAULT_API_PREFIX = "api";
const DEFAULT_SWAGGER_PATH = "docs";
const SWAGGER_PROTOCOLS = ["http", "https"] as const;

type LocalProtocol = typeof SWAGGER_PROTOCOLS[number];

function readString(env: LocalDevEnv, key: string, fallback: string): string {
  const value = env[key]?.trim();
  return value ? value : fallback;
}

function readPortValue(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw?.trim() ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readProtocol(env: LocalDevEnv, key: string, fallback: LocalProtocol): LocalProtocol {
  const value = env[key]?.trim().toLowerCase();
  return value === "https" || value === "http" ? value : fallback;
}

function normalizeBrowserHost(host: string): string {
  const normalized = host.trim();
  if (!normalized || normalized === "0.0.0.0" || normalized === "::") {
    return DEFAULT_BACKEND_BROWSER_HOST;
  }

  return normalized;
}

function formatOrigin(protocol: LocalProtocol, host: string, port: number): string {
  const normalizedHost = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  return `${protocol}://${normalizedHost}:${port}`;
}

function uniqueValues<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function readSwaggerProtocols(env: LocalDevEnv, fallback: LocalProtocol[]): LocalProtocol[] {
  const raw = env.DEV_BACKEND_SWAGGER_PROTOCOLS?.trim();
  if (!raw) {
    return uniqueValues(fallback);
  }

  const protocols = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is LocalProtocol => value === "http" || value === "https");

  return uniqueValues(protocols).length > 0 ? uniqueValues(protocols) : uniqueValues(fallback);
}

export function getLocalFrontendOrigin(env: LocalDevEnv = process.env): string {
  const protocol = readProtocol(env, "DEV_FRONTEND_PROTOCOL", DEFAULT_FRONTEND_PROTOCOL);
  const host = readString(env, "DEV_FRONTEND_HOST", DEFAULT_FRONTEND_HOST);
  const port = readPortValue(env.DEV_FRONTEND_PORT, DEFAULT_FRONTEND_PORT);

  return formatOrigin(protocol, host, port);
}

export function getCorsOrigin(env: LocalDevEnv = process.env): string {
  return readString(env, "CORS_ORIGIN", getLocalFrontendOrigin(env));
}

export function getBackendPort(env: LocalDevEnv = process.env): number {
  return readPortValue(
    env.TICKET_SYSTEM_BACKEND_PORT,
    readPortValue(env.DEV_BACKEND_PORT, readPortValue(env.PORT, DEFAULT_BACKEND_PORT)),
  );
}

export function getBackendListenHost(env: LocalDevEnv = process.env): string {
  return readString(
    env,
    "TICKET_SYSTEM_BACKEND_HOST",
    readString(env, "DEV_BACKEND_BIND_HOST", readString(env, "DEV_BACKEND_HOST", DEFAULT_BACKEND_BIND_HOST)),
  );
}

export function getBackendApiPrefix(env: LocalDevEnv = process.env): string {
  return readString(env, "API_PREFIX", readString(env, "DEV_BACKEND_API_PREFIX", DEFAULT_API_PREFIX));
}

export function getSwaggerPath(env: LocalDevEnv = process.env): string {
  return readString(env, "DEV_BACKEND_SWAGGER_PATH", DEFAULT_SWAGGER_PATH).replace(/^\/+|\/+$/g, "");
}

export function getSwaggerServers(env: LocalDevEnv = process.env): string[] {
  const configuredProtocol = readProtocol(env, "DEV_BACKEND_PROTOCOL", DEFAULT_BACKEND_PROTOCOL);
  const protocols = readSwaggerProtocols(env, [configuredProtocol, ...SWAGGER_PROTOCOLS]);
  const host = normalizeBrowserHost(readString(env, "DEV_BACKEND_HOST", readString(env, "TICKET_SYSTEM_BACKEND_HOST", DEFAULT_BACKEND_BROWSER_HOST)));
  const port = getBackendPort(env);

  return protocols.map((protocol) => formatOrigin(protocol, host, port));
}
