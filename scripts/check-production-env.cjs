#!/usr/bin/env node

const REQUIRED_VALUES = [
  "NODE_ENV",
  "API_PREFIX",
  "CORS_ORIGIN",
  "SESSION_SECRET",
  "JWT_SECRET",
  "DB_TYPE",
  "DB_HOST",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
];

const REQUIRED_EXACT = {
  NODE_ENV: "production",
  DB_SYNCHRONIZE: "false",
  COOKIE_SECURE: "true",
};

const FORBIDDEN_PLACEHOLDERS = [/example/i, /contoso/i, /localhost/i, /<.*>/, /change[-_ ]?me/i, /template/i];
const LOCAL_DB_TYPES = new Set(["sqlite", "better-sqlite3", "sqljs"]);
const ROLE_PREFIXES = ["AUDIT", "USER", "TRACE", "SYSTEM", "SERVICE"];

function read(name) {
  return String(process.env[name] || "").trim();
}

function isTruthy(value) {
  return ["1", "true", "yes", "y"].includes(String(value || "").trim().toLowerCase());
}

function hasPlaceholder(value) {
  return FORBIDDEN_PLACEHOLDERS.some((pattern) => pattern.test(value));
}

function checkUrl(name, value, failures) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      failures.push(`${name} must use https.`);
    }
  } catch {
    failures.push(`${name} must be an absolute URL.`);
  }
}

const failures = [];

for (const name of REQUIRED_VALUES) {
  const value = read(name);
  if (!value) {
    failures.push(`${name} is required.`);
    continue;
  }

  if (hasPlaceholder(value)) {
    failures.push(`${name} contains a placeholder or non-production value.`);
  }
}

for (const [name, expected] of Object.entries(REQUIRED_EXACT)) {
  const value = read(name).toLowerCase();
  if (value !== expected) {
    failures.push(`${name} must be ${expected}.`);
  }
}

checkUrl("CORS_ORIGIN", read("CORS_ORIGIN"), failures);

if (read("SESSION_SECRET").length < 32) {
  failures.push("SESSION_SECRET must be at least 32 characters.");
}

if (read("JWT_SECRET").length < 32) {
  failures.push("JWT_SECRET must be at least 32 characters.");
}

if (isTruthy(read("SWAGGER_ENABLED"))) {
  failures.push("SWAGGER_ENABLED must be false or unset for production.");
}

if (read("DB_TYPE").toLowerCase() === "sqlite") {
  failures.push("DB_TYPE must not be sqlite for shared or production environments.");
}

const primaryDbType = read("DB_TYPE").toLowerCase();
if (LOCAL_DB_TYPES.has(primaryDbType)) {
  failures.push("DB_TYPE must use a managed server engine in production (mssql/postgres/mysql/mariadb).");
}

for (const rolePrefix of ROLE_PREFIXES) {
  const key = `${rolePrefix}_DB_TYPE`;
  const value = read(key).toLowerCase();
  if (!value) {
    failures.push(`${key} is required in production to prevent implicit local-db fallback.`);
    continue;
  }

  if (LOCAL_DB_TYPES.has(value)) {
    failures.push(`${key} must not use local DB engines in production.`);
  }
}

if (failures.length) {
  console.error("[production-env] production environment check failed");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[production-env] OK");
