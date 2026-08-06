const { existsSync, readFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const enforceFallbackVerification = /^(1|true|yes|on)$/i.test(String(process.env.SEM_ENFORCE_RUNTIME_FALLBACK || "").trim());

const repoRoot = resolve(
  process.env.SEM_APP_WORKSPACE_ROOT ||
    process.env.TICKET_SYSTEM_WORKSPACE_ROOT ||
    process.env.INIT_CWD ||
    resolve(__dirname, ".."),
);
const platformRoot = join(repoRoot, "common-platform");
const platformBackendRoot = join(platformRoot, "packages", "platform-backend");
const platformBackendSrc = join(platformRoot, "packages", "platform-backend", "src");

const checks = [
  {
    file: join(platformBackendRoot, "package.json"),
    markers: [
      '"./common/runtime/register-backend-node-modules"',
      '"./dist/common/runtime/register-backend-node-modules"',
    ],
  },
  {
    file: join(platformBackendSrc, "database", "typeorm-options.ts"),
    markers: [
      'export type AppDbType = "sqlite" | "better-sqlite3" | "sqljs"',
      'const supportedDbTypes = new Set<AppDbType>(["sqlite", "better-sqlite3", "sqljs"',
      'canLoadPackage("sql.js")',
      "function canOpenBetterSqlite3()",
      'dbType === "sqljs"',
      "autoSave: true",
    ],
  },
  {
    file: join(platformBackendSrc, "users", "users.service.ts"),
    markers: [
      'import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto"',
      'const SCRYPT_PREFIX = "scrypt"',
      "function loadArgon2()",
      "async function hashPasswordWithScrypt",
      "async function verifyPasswordWithScrypt",
      'hash.startsWith(`${SCRYPT_PREFIX}$`)',
    ],
  },
  {
    file: join(platformBackendSrc, "common", "audit", "audit-database-initializer.service.ts"),
    markers: ['dbType !== "sqlite" && dbType !== "better-sqlite3" && dbType !== "sqljs"'],
  },
  {
    file: join(platformBackendSrc, "rdb-admin", "rdb-admin.service.ts"),
    markers: [
      'type SupportedDbType = "sqlite" | "better-sqlite3" | "sqljs"',
      'dbType === "sqlite" || dbType === "better-sqlite3" || dbType === "sqljs"',
    ],
  },
];

if (!existsSync(platformRoot)) {
  console.warn("[common-platform fallback] common-platform link is missing; skipping fallback verification.");
  process.exit(0);
}

const failures = [];

for (const check of checks) {
  if (!existsSync(check.file)) {
    failures.push(`${check.file}: file not found`);
    continue;
  }

  const source = readFileSync(check.file, "utf8");
  for (const marker of check.markers) {
    if (!source.includes(marker)) {
      failures.push(`${check.file}: missing marker ${JSON.stringify(marker)}`);
    }
  }
}

if (failures.length > 0) {
  const level = enforceFallbackVerification ? "error" : "warn";
  console[level]("[common-platform fallback] Required runtime fallback changes are missing.");
  console[level]("This ticket system depends on the linked common platform supporting sql.js DB fallback and scrypt password fallback.");
  console[level]("Review common-platform runtime fallback notes and restore the common-platform changes before building or running this app.");
  for (const failure of failures) {
    console[level](`- ${failure}`);
  }
  if (enforceFallbackVerification) {
    process.exit(1);
  }

  console.warn("[common-platform fallback] Non-strict mode: continuing build. Set SEM_ENFORCE_RUNTIME_FALLBACK=1 to enforce failure.");
  process.exit(0);
}

console.log("[common-platform fallback] Runtime fallback verification passed.");
