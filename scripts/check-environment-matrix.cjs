#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_MATRIX_FILE = "docs/sem-sw-ticket-system-environment-matrix.json";
const REQUIRED_ENVIRONMENTS = new Set(["staging", "production"]);

const REQUIRED_STRING_FIELDS = [
  "frontendUrl",
  "backendUrl",
  "apiBasePath",
  "dns.record",
  "dns.tlsCertificateOwner",
  "hosting.frontend",
  "hosting.backend",
  "database.engine",
  "database.host",
  "database.name",
  "database.backupPolicy",
  "database.restoreDrillEvidence",
  "database.migrationEvidence",
  "database.rollbackEvidence",
  "secrets.store",
  "secrets.sessionSecretName",
  "secrets.jwtSecretName",
  "secrets.dbPasswordSecretName",
  "secrets.rotationOwner",
  "observability.logs",
  "observability.metrics",
  "observability.alerts",
  "observability.dashboardUrl",
  "observability.incidentChannel",
  "checks.productionEnv",
  "checks.deploymentSmoke",
  "checks.authenticatedSmoke",
  "checks.swaggerPolicy",
  "release.rollbackOwner",
  "release.artifactRetention",
  "release.approver",
  "release.approvalDate",
];

const VALUE_BLOCKERS = [
  { label: "TBD placeholder", pattern: /\bTBD\b/i },
  { label: "pending decision", pattern: /\bpending\b/i },
  { label: "not run status", pattern: /\bnot run\b/i },
  { label: "example placeholder", pattern: /(?:^|[\/@._-])example(?:[\/@._-]|$)/i },
  { label: "Contoso placeholder", pattern: /contoso/i },
  { label: "localhost value", pattern: /\blocalhost\b/i },
  { label: "placeholder marker", pattern: /<[^>\n]+>/ },
  { label: "unresolved pass/fail choice", pattern: /pass\s*\/\s*fail/i },
  { label: "unresolved yes/no choice", pattern: /yes\s*\/\s*no/i },
];

function matrixFile() {
  return process.env.ENVIRONMENT_MATRIX_FILE || DEFAULT_MATRIX_FILE;
}

function readByPath(value, propertyPath) {
  return propertyPath.split(".").reduce((current, segment) => {
    if (current && Object.prototype.hasOwnProperty.call(current, segment)) {
      return current[segment];
    }
    return undefined;
  }, value);
}

function collectStringValues(value, propertyPath = "$", values = []) {
  if (typeof value === "string") {
    values.push({ path: propertyPath, value });
    return values;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStringValues(item, `${propertyPath}[${index}]`, values));
    return values;
  }

  if (value && typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      collectStringValues(nestedValue, `${propertyPath}.${key}`, values);
    }
  }

  return values;
}

function findValueBlocker(value) {
  for (const blocker of VALUE_BLOCKERS) {
    const match = blocker.pattern.exec(value);
    if (match) {
      return { label: blocker.label, value: match[0] };
    }
  }

  return undefined;
}

function validateHttpsUrl(environmentName, fieldPath, value, findings) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      findings.push({ path: `${environmentName}.${fieldPath}`, label: "URL must use https", value });
    }
  } catch {
    findings.push({ path: `${environmentName}.${fieldPath}`, label: "invalid URL", value });
  }
}

function validateEnvironment(environment, findings) {
  const environmentName = String(environment.name || "").trim();
  if (!REQUIRED_ENVIRONMENTS.has(environmentName)) {
    findings.push({ path: "$.environments[].name", label: "environment must be staging or production", value: environmentName });
    return;
  }

  for (const fieldPath of REQUIRED_STRING_FIELDS) {
    const value = readByPath(environment, fieldPath);
    if (typeof value !== "string" || value.trim() === "") {
      findings.push({ path: `${environmentName}.${fieldPath}`, label: "required value must be non-empty text", value: String(value) });
    }
  }

  for (const fieldPath of ["frontendUrl", "backendUrl", "observability.dashboardUrl"]) {
    const value = readByPath(environment, fieldPath);
    if (typeof value === "string" && value.trim()) {
      validateHttpsUrl(environmentName, fieldPath, value.trim(), findings);
    }
  }

  const apiBasePath = readByPath(environment, "apiBasePath");
  if (typeof apiBasePath === "string" && apiBasePath.trim() && !apiBasePath.trim().startsWith("/")) {
    findings.push({ path: `${environmentName}.apiBasePath`, label: "API base path must start with /", value: apiBasePath });
  }

  const releaseDecision = readByPath(environment, "release.decision");
  if (!["approved", "waived"].includes(String(releaseDecision || "").trim().toLowerCase())) {
    findings.push({ path: `${environmentName}.release.decision`, label: "decision must be approved or waived", value: String(releaseDecision) });
  }

  for (const stringValue of collectStringValues(environment, environmentName)) {
    const blocker = findValueBlocker(stringValue.value);
    if (blocker) {
      findings.push({ path: stringValue.path, ...blocker });
    }
  }
}

const root = path.resolve(__dirname, "..");
const relativeMatrixFile = matrixFile();
const resolvedMatrixFile = path.resolve(root, relativeMatrixFile);
const relativeMatrixPath = path.relative(root, resolvedMatrixFile);
const findings = [];

if (relativeMatrixPath.startsWith("..") || path.isAbsolute(relativeMatrixPath)) {
  findings.push({ path: "$", label: "path outside workspace", value: relativeMatrixFile });
} else if (!fs.existsSync(resolvedMatrixFile)) {
  findings.push({ path: "$", label: "missing environment matrix file", value: relativeMatrixPath });
} else {
  let matrix;
  try {
    matrix = JSON.parse(fs.readFileSync(resolvedMatrixFile, "utf8"));
  } catch (error) {
    findings.push({ path: "$", label: "invalid JSON", value: error.message });
  }

  if (matrix) {
    if (!Array.isArray(matrix.environments) || matrix.environments.length === 0) {
      findings.push({ path: "$.environments", label: "environments must include staging and production", value: String(matrix.environments) });
    } else {
      const seen = new Set();
      for (const environment of matrix.environments) {
        validateEnvironment(environment, findings);
        if (environment && REQUIRED_ENVIRONMENTS.has(environment.name)) {
          seen.add(environment.name);
        }
      }

      for (const requiredEnvironment of REQUIRED_ENVIRONMENTS) {
        if (!seen.has(requiredEnvironment)) {
          findings.push({ path: "$.environments", label: `missing ${requiredEnvironment} environment`, value: requiredEnvironment });
        }
      }
    }
  }
}

if (findings.length) {
  console.error("[environment-matrix] Environment matrix is incomplete.");
  for (const finding of findings) {
    console.error(`- ${relativeMatrixPath}:${finding.path} ${finding.label}: ${JSON.stringify(finding.value)}`);
  }
  process.exit(1);
}

console.log("[environment-matrix] OK");
