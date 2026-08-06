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
const evidenceFilePath = options.evidenceFile || process.env.TICKET_SYSTEM_READINESS_EVIDENCE_FILE || "";
const evidence = readEvidence(evidenceFilePath);

if (evidence) {
  validateRelease(evidence.release);
  validateCi(evidence.ci);
  validateDeployment(evidence.deployment);
  validateDatabase(evidence.database);
  validateSecurity(evidence.security);
  validateOperations(evidence.operations);
  validateUx(evidence.ux);
  validatePerformance(evidence.performance);
}

if (failures.length > 0) {
  console.error("[commercial-readiness-evidence] Verification failed.");
  if (evidenceFilePath) {
    console.error(`[commercial-readiness-evidence] Evidence file: ${path.resolve(repoRoot, evidenceFilePath)}`);
  } else {
    console.error("[commercial-readiness-evidence] Evidence file: not provided.");
  }
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[commercial-readiness-evidence] Commercial readiness evidence verified.");

function parseArgs(rawArgs) {
  const parsed = { evidenceFile: "" };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    if (arg === "--evidence-file") {
      parsed.evidenceFile = rawArgs[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg.startsWith("--evidence-file=")) {
      parsed.evidenceFile = arg.slice("--evidence-file=".length);
      continue;
    }
    if (!arg.startsWith("-") && !parsed.evidenceFile) {
      parsed.evidenceFile = arg;
      continue;
    }
    failures.push(`unknown argument: ${arg}`);
  }
  return parsed;
}

function printUsage() {
  console.log("Usage: npm run verify:readiness-evidence -- path/to/readiness-evidence.json");
  console.log("       npm run verify:readiness-evidence -- --evidence-file=path/to/readiness-evidence.json");
  console.log("Alternatively set TICKET_SYSTEM_READINESS_EVIDENCE_FILE=path/to/readiness-evidence.json.");
}

function readEvidence(filePath) {
  if (!filePath) {
    failures.push("TICKET_SYSTEM_READINESS_EVIDENCE_FILE or an evidence file argument is required for 100% readiness");
    return null;
  }

  const fullPath = path.resolve(repoRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`commercial readiness evidence file does not exist: ${fullPath}`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    failures.push(`commercial readiness evidence file is not valid JSON: ${error.message}`);
    return null;
  }
}

function validateRelease(value) {
  const release = requireObject(value, "release");
  requireText(release, "release.version");
  requireText(release, "release.commit");
  requireIsoDate(release, "release.verifiedAt");
  requirePassedEvidence(release.verifyRelease, "release.verifyRelease");
  requirePassedEvidence(release.productionConfig, "release.productionConfig");
  requirePassedEvidence(release.productionMigrations, "release.productionMigrations");
  requirePassedEvidence(release.deploymentSmoke, "release.deploymentSmoke");
}

function validateCi(value) {
  const ci = requireObject(value, "ci");
  requirePassedEvidence(ci.windowsX64Hosted, "ci.windowsX64Hosted");
  requirePassedEvidence(ci.windows11Arm64Hosted, "ci.windows11Arm64Hosted");

  const exactX64 = ci.windows11X64SelfHosted;
  if (exactX64 && exactX64.status === "passed") {
    requireHttpsUrl(exactX64.url, "ci.windows11X64SelfHosted.url");
    return;
  }

  const waiver = requireObject(ci.windows11X64Waiver, "ci.windows11X64Waiver");
  requireText(waiver, "ci.windows11X64Waiver.reason");
  requireText(waiver, "ci.windows11X64Waiver.approvedBy");
  requireIsoDate(waiver, "ci.windows11X64Waiver.approvedAt");
}

function validateDeployment(value) {
  const deployment = requireObject(value, "deployment");
  requireText(deployment, "deployment.environment");
  if (String(deployment.environment).trim().toLowerCase() !== "production") {
    failures.push("deployment.environment must be production");
  }
  requireHttpsUrl(deployment.frontendUrl, "deployment.frontendUrl");
  requireHttpsUrl(deployment.apiUrl, "deployment.apiUrl");
  requireIsoDate(deployment.deployedAt, "deployment.deployedAt");
  requireTrue(deployment.dnsValidated, "deployment.dnsValidated");
  requireTrue(deployment.tlsValidated, "deployment.tlsValidated");
  requireText(deployment, "deployment.rollbackPlan");
}

function validateDatabase(value) {
  const database = requireObject(value, "database");
  const dbType = requireText(database, "database.type").toLowerCase();
  if (dbType === "sqlite") {
    failures.push("database.type must not be sqlite for commercial readiness");
  } else if (dbType && !["mssql", "postgres", "mysql", "mariadb"].includes(dbType)) {
    failures.push("database.type must be one of: mssql, postgres, mysql, mariadb");
  }
  requireTrue(database.migrationsApplied, "database.migrationsApplied");
  requireTrue(database.backupRestoreValidated, "database.backupRestoreValidated");
  requireTrue(database.rollbackValidated, "database.rollbackValidated");
}

function validateSecurity(value) {
  const security = requireObject(value, "security");
  requireTrue(security.secretsInSecretStore, "security.secretsInSecretStore");
  requireTrue(security.swaggerDisabledOrProtected, "security.swaggerDisabledOrProtected");
  requireTrue(security.corsRestricted, "security.corsRestricted");
  requireTrue(security.cookiesSecure, "security.cookiesSecure");
  requireTrue(security.dependencyReviewCompleted, "security.dependencyReviewCompleted");
  requirePassedEvidence(security.dependencyReview, "security.dependencyReview");
  requireText(security, "security.reviewedBy");
  requireIsoDate(security, "security.reviewedAt");
}

function validateOperations(value) {
  const operations = requireObject(value, "operations");
  requireText(operations, "operations.owner");
  requireText(operations, "operations.incidentContact");
  requireTrue(operations.alertingEnabled, "operations.alertingEnabled");
  requirePositiveNumber(operations.logRetentionDays, "operations.logRetentionDays");
  if (Number(operations.logRetentionDays) < 30) {
    failures.push("operations.logRetentionDays must be at least 30");
  }
  requireHttpsUrl(operations.runbookUrl, "operations.runbookUrl");
}

function validateUx(value) {
  const ux = requireObject(value, "ux");
  requireTrue(ux.serviceCatalogSmokeTested, "ux.serviceCatalogSmokeTested");
  requireTrue(ux.settingsSmokeTested, "ux.settingsSmokeTested");
  requireIsoDate(ux.testedAt, "ux.testedAt");
  if (!Array.isArray(ux.targetBrowsers) || ux.targetBrowsers.length === 0) {
    failures.push("ux.targetBrowsers must list at least one target browser");
  }
}

function validatePerformance(value) {
  const performance = requireObject(value, "performance");
  requireTrue(performance.smokeLoadTestPassed, "performance.smokeLoadTestPassed");
  requirePositiveNumber(performance.frontendLargestChunkKb, "performance.frontendLargestChunkKb");
  requirePositiveNumber(performance.apiHealthP95Ms, "performance.apiHealthP95Ms");
  if (Number(performance.frontendLargestChunkKb) > 500) {
    failures.push("performance.frontendLargestChunkKb must be <= 500");
  }
  if (Number(performance.apiHealthP95Ms) > 1000) {
    failures.push("performance.apiHealthP95Ms must be <= 1000");
  }
}

function requireObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failures.push(`${name} must be an object`);
    return {};
  }
  return value;
}

function requirePassedEvidence(value, name) {
  const item = requireObject(value, name);
  if (item.status !== "passed") {
    failures.push(`${name}.status must be passed`);
  }
  requireHttpsUrl(item.url, `${name}.url`);
  requireIsoDate(item.completedAt, `${name}.completedAt`);
}

function requireText(container, name) {
  const value = String(readPath(container, name) ?? "").trim();
  if (!value) {
    failures.push(`${name} is required`);
    return "";
  }
  if (isPlaceholderValue(value)) {
    failures.push(`${name} must not be a placeholder or local-only value`);
  }
  return value;
}

function requireTrue(value, name) {
  if (value !== true) {
    failures.push(`${name} must be true`);
  }
}

function requirePositiveNumber(value, name) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
    failures.push(`${name} must be a positive number`);
  }
}

function requireIsoDate(value, name) {
  const resolvedValue = value && typeof value === "object" && !Array.isArray(value) ? readPath(value, name) : value;
  const text = String(resolvedValue ?? "").trim();
  const timestamp = Date.parse(text);
  if (!text || Number.isNaN(timestamp)) {
    failures.push(`${name} must be a valid ISO date/time`);
    return;
  }
  if (timestamp > Date.now() + 60_000) {
    failures.push(`${name} must not be in the future`);
  }
}

function requireHttpsUrl(value, name) {
  const text = String(value ?? "").trim();
  if (!text) {
    failures.push(`${name} is required`);
    return;
  }

  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    failures.push(`${name} must be a valid URL`);
    return;
  }

  if (parsed.protocol !== "https:") {
    failures.push(`${name} must use https`);
  }
  if (isPlaceholderValue(text) || isLocalHost(parsed.hostname)) {
    failures.push(`${name} must not use a placeholder or local-only host`);
  }
}

function readPath(container, dottedPath) {
  const parts = dottedPath.split(".");
  let value = container;
  for (let index = 1; index < parts.length; index += 1) {
    value = value?.[parts[index]];
  }
  return value;
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
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1") ||
    normalized.includes("example") ||
    normalized.includes("contoso") ||
    normalized.includes("changeme") ||
    normalized.includes("replace-me")
  );
}
