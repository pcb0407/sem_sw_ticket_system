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
const warnings = [];
const options = parseArgs(process.argv.slice(2));
const lockFilePath = path.resolve(repoRoot, options.lockFile || "package-lock.json");
const reviewFilePath = options.reviewFile || process.env.TICKET_SYSTEM_DEPENDENCY_REVIEW_FILE || "";
const deprecatedPackages = readDeprecatedPackages(lockFilePath);
const review = reviewFilePath ? readJsonFile(path.resolve(repoRoot, reviewFilePath), "dependency review file") : null;

if (deprecatedPackages.length > 0 && !review) {
  failures.push(`dependency review file is required because package-lock.json contains ${deprecatedPackages.length} deprecated package(s)`);
}
if (deprecatedPackages.length > 0 && review) {
  validateReview(review);
}

if (failures.length > 0) {
  console.error("[dependency-review] Verification failed.");
  console.error(`[dependency-review] Lock file: ${lockFilePath}`);
  if (reviewFilePath) {
    console.error(`[dependency-review] Review file: ${path.resolve(repoRoot, reviewFilePath)}`);
  } else {
    console.error("[dependency-review] Review file: not provided.");
  }
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`[dependency-review] Dependency review verified for ${deprecatedPackages.length} deprecated package(s).`);
for (const warning of warnings) {
  console.warn(`[dependency-review] warning: ${warning}`);
}

function parseArgs(rawArgs) {
  const parsed = { lockFile: "", reviewFile: "" };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    const optionNames = new Set(["lock-file", "review-file"]);
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

    if (!arg.startsWith("-") && !parsed.reviewFile) {
      parsed.reviewFile = arg;
      continue;
    }

    failures.push(`unknown argument: ${arg}`);
  }
  return parsed;
}

function printUsage() {
  console.log("Usage: npm run verify:dependency-review -- path/to/dependency-review.json");
  console.log("       npm run verify:dependency-review -- --review-file=path/to/dependency-review.json");
  console.log("Alternatively set TICKET_SYSTEM_DEPENDENCY_REVIEW_FILE=path/to/dependency-review.json.");
}

function readDeprecatedPackages(filePath) {
  const lock = readJsonFile(filePath, "package lock");
  const packages = lock?.packages;
  if (!packages || typeof packages !== "object" || Array.isArray(packages)) {
    failures.push("package-lock.json must contain a packages object");
    return [];
  }

  return Object.entries(packages)
    .filter(([, pkg]) => pkg && typeof pkg === "object" && typeof pkg.deprecated === "string" && pkg.deprecated.trim())
    .map(([packagePath, pkg]) => ({
      deprecated: pkg.deprecated.trim(),
      name: resolvePackageName(packagePath),
      packagePath,
      version: String(pkg.version || "").trim(),
    }))
    .sort((a, b) => a.packagePath.localeCompare(b.packagePath));
}

function validateReview(value) {
  const review = requireObject(value, "dependency review");
  requireText(review.reviewedBy, "reviewedBy");
  requireIsoDate(review.reviewedAt, "reviewedAt", { allowPast: true, allowFuture: false });

  if (!Array.isArray(review.deprecatedPackages)) {
    failures.push("deprecatedPackages must be an array");
    return;
  }

  const reviewEntries = new Map();
  for (const [index, entry] of review.deprecatedPackages.entries()) {
    const item = requireObject(entry, `deprecatedPackages[${index}]`);
    const packagePath = requireText(item.path, `deprecatedPackages[${index}].path`);
    const version = requireText(item.version, `deprecatedPackages[${index}].version`);
    const key = `${packagePath}@${version}`;
    if (reviewEntries.has(key)) {
      failures.push(`duplicate dependency review entry: ${key}`);
    }
    reviewEntries.set(key, { item, index });
  }

  const currentKeys = new Set(deprecatedPackages.map((pkg) => `${pkg.packagePath}@${pkg.version}`));
  for (const pkg of deprecatedPackages) {
    const key = `${pkg.packagePath}@${pkg.version}`;
    const entry = reviewEntries.get(key);
    if (!entry) {
      failures.push(`missing dependency review entry for ${key}: ${pkg.deprecated}`);
      continue;
    }

    validateReviewEntry(entry.item, entry.index, pkg);
  }

  for (const key of reviewEntries.keys()) {
    if (!currentKeys.has(key)) {
      warnings.push(`dependency review entry is no longer present in package-lock.json: ${key}`);
    }
  }
}

function validateReviewEntry(entry, index, pkg) {
  const decision = requireText(entry.decision, `deprecatedPackages[${index}].decision`);
  const allowedDecisions = ["accepted-risk", "upgrade-planned", "not-shipped", "false-positive"];
  if (decision && !allowedDecisions.includes(decision)) {
    failures.push(`deprecatedPackages[${index}].decision must be one of: ${allowedDecisions.join(", ")}`);
  }

  const reason = requireText(entry.reason, `deprecatedPackages[${index}].reason`);
  if (reason && reason.length < 20) {
    failures.push(`deprecatedPackages[${index}].reason must be at least 20 characters`);
  }

  requireIsoDate(entry.expiresAt, `deprecatedPackages[${index}].expiresAt`, { allowPast: false, allowFuture: true });

  if (entry.deprecated && String(entry.deprecated).trim() !== pkg.deprecated) {
    warnings.push(`deprecated message changed for ${pkg.packagePath}@${pkg.version}`);
  }
}

function readJsonFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    failures.push(`${label} does not exist: ${filePath}`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    failures.push(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

function requireObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failures.push(`${name} must be an object`);
    return {};
  }
  return value;
}

function requireText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) {
    failures.push(`${name} is required`);
    return "";
  }
  if (isPlaceholderValue(text)) {
    failures.push(`${name} must not contain placeholder text`);
  }
  return text;
}

function requireIsoDate(value, name, options) {
  const text = requireText(value, name);
  const timestamp = Date.parse(text);
  if (!text || Number.isNaN(timestamp)) {
    failures.push(`${name} must be a valid ISO date/time`);
    return;
  }

  const now = Date.now();
  if (!options.allowPast && timestamp <= now) {
    failures.push(`${name} must be in the future`);
  }
  if (!options.allowFuture && timestamp > now + 60_000) {
    failures.push(`${name} must not be in the future`);
  }
}

function resolvePackageName(packagePath) {
  const parts = packagePath.split(/[/\\]node_modules[/\\]/).filter(Boolean);
  const last = parts[parts.length - 1] || packagePath;
  const segments = last.split(/[/\\]/);
  return segments[0]?.startsWith("@") ? `${segments[0]}/${segments[1] || ""}` : segments[0] || packagePath;
}

function isPlaceholderValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return (
    normalized.includes("<") ||
    normalized.includes(">") ||
    normalized.includes("changeme") ||
    normalized.includes("replace-me") ||
    normalized.includes("todo")
  );
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
