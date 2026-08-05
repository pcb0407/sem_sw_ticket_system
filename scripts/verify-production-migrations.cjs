"use strict";

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(
  process.env.SEM_APP_WORKSPACE_ROOT ||
    process.env.TICKET_SYSTEM_WORKSPACE_ROOT ||
    process.env.INIT_CWD ||
    path.resolve(__dirname, ".."),
);

const failures = [];
const options = parseArgs(process.argv.slice(2));
const envFilePath = options.envFile || process.env.TICKET_SYSTEM_PRODUCTION_ENV_FILE || "";
const evidenceFilePath = options.evidenceFile || process.env.TICKET_SYSTEM_READINESS_EVIDENCE_FILE || "";
const fileValues = envFilePath ? readEnvFile(path.resolve(repoRoot, envFilePath)) : {};
const values = { ...fileValues, ...collectProcessEnv() };
const evidence = evidenceFilePath ? readEvidence(path.resolve(repoRoot, evidenceFilePath)) : null;
const dbType = resolveDbType();
const productionDbTypes = new Set(["mssql", "postgres", "mysql", "mariadb"]);

if (!dbType) {
  failures.push("DB_TYPE, --db-type, or database.type in readiness evidence is required for production migration verification");
} else if (dbType === "sqlite") {
  failures.push("DB_TYPE=sqlite is not acceptable for commercial production migration readiness");
} else if (!productionDbTypes.has(dbType)) {
  failures.push("DB_TYPE must be one of: mssql, postgres, mysql, mariadb");
} else {
  verifyTicketMigrations(dbType);
  verifyCommonPlatformMigrations(dbType);
}

if (failures.length > 0) {
  console.error("[production-migrations] Verification failed.");
  if (envFilePath) {
    console.error(`[production-migrations] Env file: ${path.resolve(repoRoot, envFilePath)}`);
  }
  if (evidenceFilePath) {
    console.error(`[production-migrations] Evidence file: ${path.resolve(repoRoot, evidenceFilePath)}`);
  }
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`[production-migrations] Production migration coverage verified for ${dbType}.`);

function parseArgs(rawArgs) {
  const parsed = { dbType: "", envFile: "", evidenceFile: "" };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    const optionNames = new Set(["db-type", "env-file", "evidence-file"]);
    if (arg.startsWith("--")) {
      const [rawName, inlineValue] = arg.slice(2).split("=", 2);
      if (!optionNames.has(rawName)) {
        failures.push(`unknown argument: ${arg}`);
        continue;
      }
      const value = inlineValue ?? rawArgs[index + 1] ?? "";
      if (inlineValue === undefined) {
        index += 1;
      }
      parsed[toCamelCase(rawName)] = value;
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
  console.log("Usage: set TICKET_SYSTEM_PRODUCTION_ENV_FILE=path/to/.env.production");
  console.log("       npm run verify:production-migrations");
  console.log("Alternatively set DB_TYPE=mssql or TICKET_SYSTEM_READINESS_EVIDENCE_FILE=path/to/readiness-evidence.json.");
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

function readEvidence(filePath) {
  if (!fs.existsSync(filePath)) {
    failures.push(`commercial readiness evidence file does not exist: ${filePath}`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    failures.push(`commercial readiness evidence file is not valid JSON: ${error.message}`);
    return null;
  }
}

function resolveDbType() {
  const candidates = [
    ["--db-type", options.dbType],
    ["DB_TYPE", values.DB_TYPE],
    ["database.type", evidence?.database?.type],
  ]
    .map(([source, value]) => [source, normalizeDbType(value)])
    .filter(([, value]) => value);

  const distinctValues = [...new Set(candidates.map(([, value]) => value))];
  if (distinctValues.length > 1) {
    failures.push(`production DB type sources disagree: ${candidates.map(([source, value]) => `${source}=${value}`).join(", ")}`);
  }

  return distinctValues[0] || "";
}

function verifyTicketMigrations(dbType) {
  const baselineDir = path.join(repoRoot, "backend", "src", "database", "migrations", "sqlite");
  const targetDir = path.join(repoRoot, "backend", "src", "database", "migrations", dbType);
  const baselineIds = listMigrationIds(baselineDir);
  const targetIds = listMigrationIds(targetDir);

  if (baselineIds.length === 0) {
    failures.push(`ticket system SQLite migration baseline is missing: ${baselineDir}`);
    return;
  }
  if (targetIds.length === 0) {
    failures.push(`ticket system ${dbType} migration directory is missing or empty: ${targetDir}`);
    return;
  }

  for (const migrationId of baselineIds) {
    if (!targetIds.includes(migrationId)) {
      failures.push(`ticket system ${dbType} migrations are missing migration ${migrationId} from the SQLite baseline`);
    }
  }
}

function verifyCommonPlatformMigrations(dbType) {
  const platformDir = path.join(
    repoRoot,
    "common-platform",
    "packages",
    "platform-backend",
    "src",
    "database",
    "migrations",
    dbType,
  );

  if (listMigrationFiles(platformDir).length === 0) {
    failures.push(`common platform ${dbType} migration directory is missing or empty: ${platformDir}`);
  }
}

function listMigrationIds(directoryPath) {
  return listMigrationFiles(directoryPath)
    .map((fileName) => fileName.match(/^(\d{13})-/)?.[1])
    .filter(Boolean)
    .sort();
}

function listMigrationFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  return fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:c|m)?[jt]s$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function normalizeDbType(value) {
  return String(value || "").trim().toLowerCase();
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
