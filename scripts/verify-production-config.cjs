"use strict";

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(
  process.env.SEM_APP_WORKSPACE_ROOT ||
    process.env.TICKET_SYSTEM_WORKSPACE_ROOT ||
    process.env.INIT_CWD ||
    path.resolve(__dirname, ".."),
);

const args = process.argv.slice(2);
const failures = [];
const warnings = [];
const options = parseArgs(args);
const envFilePath = options.envFile || process.env.TICKET_SYSTEM_PRODUCTION_ENV_FILE || "";
const fileValues = envFilePath ? readEnvFile(path.resolve(repoRoot, envFilePath)) : {};
const values = { ...fileValues, ...collectProcessEnv() };

requireExact("NODE_ENV", "production");
requireBoolean("DB_SYNCHRONIZE", false);
requireBoolean("SWAGGER_ENABLED", false);
requireBoolean("COOKIE_SECURE", true);
requireOneOf("COOKIE_SAMESITE", ["lax", "strict", "none"]);
requireNonPlaceholder("SESSION_COOKIE_NAME", { disallow: ["sem_sid"] });
requireSecret("SESSION_SECRET", 32);
requireSecret("JWT_SECRET", 32);

validateApiPrefix();
validateCorsOrigin();
validateFrontendApiBaseUrl();
validateDatabase();
validateSeedConfig();

if (failures.length > 0) {
  console.error("[production-config] Verification failed.");
  if (envFilePath) {
    console.error(`[production-config] Env file: ${path.resolve(repoRoot, envFilePath)}`);
  } else {
    console.error("[production-config] Env file: not provided; using current process environment only.");
  }
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[production-config] Production configuration verified.");
for (const warning of warnings) {
  console.warn(`[production-config] warning: ${warning}`);
}

function parseArgs(rawArgs) {
  const parsed = { envFile: "" };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    if (arg === "--env-file") {
      parsed.envFile = rawArgs[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg.startsWith("--env-file=")) {
      parsed.envFile = arg.slice("--env-file=".length);
      continue;
    }
    if (!arg.startsWith("-") && !parsed.envFile) {
      parsed.envFile = arg;
      continue;
    }
    failures.push(`unknown argument: ${arg}`);
  }
  return parsed;
}

function printUsage() {
  console.log("Usage: npm run verify:production-config -- path/to/.env.production");
  console.log("       npm run verify:production-config -- --env-file=path/to/.env.production");
  console.log("Alternatively set TICKET_SYSTEM_PRODUCTION_ENV_FILE=path/to/.env.production.");
}

function collectProcessEnv() {
  const result = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value.trim()) {
      result[key] = value;
    }
  }
  return result;
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    failures.push(`production env file does not exist: ${filePath}`);
    return {};
  }

  const result = {};
  const content = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  for (const [lineIndex, line] of content.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      failures.push(`invalid env file line ${lineIndex + 1}: expected KEY=value`);
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function getValue(name) {
  return String(values[name] ?? "").trim();
}

function requireValue(name) {
  const value = getValue(name);
  if (!value) {
    failures.push(`${name} is required for commercial production readiness`);
  }
  return value;
}

function requireExact(name, expected) {
  const value = requireValue(name);
  if (value && value !== expected) {
    failures.push(`${name} must be ${expected}`);
  }
}

function requireBoolean(name, expected) {
  const value = requireValue(name).toLowerCase();
  if (!value) {
    return;
  }

  const normalized = ["1", "true", "yes", "on"].includes(value)
    ? "true"
    : ["0", "false", "no", "off"].includes(value)
      ? "false"
      : "";
  if (!normalized) {
    failures.push(`${name} must be a boolean value`);
    return;
  }

  if ((normalized === "true") !== expected) {
    failures.push(`${name} must be ${expected}`);
  }
}

function requireOneOf(name, allowedValues) {
  const value = requireValue(name).toLowerCase();
  if (value && !allowedValues.includes(value)) {
    failures.push(`${name} must be one of: ${allowedValues.join(", ")}`);
  }
}

function requireNonPlaceholder(name, options = {}) {
  const value = requireValue(name);
  if (!value) {
    return "";
  }

  const lower = value.toLowerCase();
  const disallowed = options.disallow || [];
  if (disallowed.map((item) => item.toLowerCase()).includes(lower)) {
    failures.push(`${name} must not use the default value "${value}"`);
  }
  if (isPlaceholderValue(value)) {
    failures.push(`${name} contains a placeholder or local-only value`);
  }
  return value;
}

function requireSecret(name, minimumLength) {
  const value = requireValue(name);
  if (!value) {
    return;
  }

  if (value.length < minimumLength) {
    failures.push(`${name} must be at least ${minimumLength} characters`);
  }
  if (isPlaceholderValue(value) || /^(changeme|secret|default|master|password)$/i.test(value)) {
    failures.push(`${name} must be a real secret, not a placeholder/default value`);
  }
}

function validateApiPrefix() {
  const apiPrefix = requireValue("API_PREFIX");
  if (apiPrefix && (apiPrefix.startsWith("/") || apiPrefix.endsWith("/"))) {
    failures.push("API_PREFIX must not start or end with /");
  }
}

function validateCorsOrigin() {
  const raw = requireValue("CORS_ORIGIN");
  const origins = raw.split(",").map((item) => item.trim()).filter(Boolean);
  if (origins.length === 0) {
    return;
  }

  for (const origin of origins) {
    if (origin === "*") {
      failures.push("CORS_ORIGIN must not allow wildcard origins in production");
      continue;
    }
    validateAbsoluteHttpsUrl("CORS_ORIGIN", origin);
  }
}

function validateFrontendApiBaseUrl() {
  const value = requireNonPlaceholder("VITE_API_BASE_URL");
  if (!value) {
    return;
  }

  if (value.startsWith("/")) {
    if (!value.startsWith("/api")) {
      failures.push("VITE_API_BASE_URL should route through /api for same-origin production deployments");
    }
    return;
  }

  validateAbsoluteHttpsUrl("VITE_API_BASE_URL", value);
}

function validateDatabase() {
  const dbType = requireValue("DB_TYPE").toLowerCase();
  if (!dbType) {
    return;
  }

  if (dbType === "sqlite") {
    failures.push("DB_TYPE=sqlite is not acceptable for commercial production readiness");
    return;
  }

  if (!["mssql", "postgres", "mysql", "mariadb"].includes(dbType)) {
    failures.push("DB_TYPE must be one of: mssql, postgres, mysql, mariadb");
    return;
  }

  if (dbType === "mssql") {
    requireValue("DB_HOST");
    requireValue("DB_NAME");
    requireValue("DB_USER");
    requireValue("DB_PASSWORD");
    requireBoolean("DB_ENCRYPT", true);
    requireBoolean("DB_TRUST_SERVER_CERTIFICATE", false);
  }
}

function validateSeedConfig() {
  const seedEmail = getValue("MASTER_SEED_EMAIL");
  const seedPassword = getValue("MASTER_SEED_PASSWORD");

  if (seedEmail && /localhost|example|contoso/i.test(seedEmail)) {
    warnings.push("MASTER_SEED_EMAIL should be changed from local/template values before production go-live");
  }

  if (seedPassword && /^(master|password|changeme)$/i.test(seedPassword)) {
    warnings.push("MASTER_SEED_PASSWORD appears to be a default value");
  }
}

function validateAbsoluteHttpsUrl(name, value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    failures.push(`${name} must be a valid URL`);
    return;
  }

  if (parsed.protocol !== "https:") {
    failures.push(`${name} must use https in production`);
  }

  if (isLocalHost(parsed.hostname) || isPlaceholderValue(value)) {
    failures.push(`${name} must not use localhost or placeholder hosts`);
  }
}

function isLocalHost(hostname) {
  const normalized = String(hostname || "").trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1" || normalized.endsWith(".local");
}

function isPlaceholderValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return (
    normalized.includes("<") ||
    normalized.includes(">") ||
    normalized.includes("changeme") ||
    normalized.includes("replace-me") ||
    normalized.includes("example") ||
    normalized.includes("contoso")
  );
}
