#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_PROFILE_FILE = "docs/sem-sw-ticket-system-productization-profile.json";

const REQUIRED_FIELDS = [
  { path: "product.name", type: "string" },
  { path: "product.slug", type: "string", pattern: /^[a-z0-9][a-z0-9-]*$/ },
  { path: "product.packageName", type: "string", pattern: /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/ },
  { path: "product.displayName", type: "string" },
  { path: "owners.productOwner", type: "string" },
  { path: "owners.releaseOwner", type: "string" },
  { path: "owners.operationsOwner", type: "string" },
  { path: "owners.securityOwner", type: "string" },
  { path: "owners.supportChannel", type: "string" },
  { path: "runtime.frontendBaseUrl", type: "url" },
  { path: "runtime.backendBaseUrl", type: "url" },
  { path: "runtime.apiPrefix", type: "string", pattern: /^[a-z0-9][a-z0-9-_/]*$/i },
  { path: "runtime.cookieName", type: "string", pattern: /^[A-Za-z0-9_.-]+$/ },
  { path: "database.engine", type: "string" },
  { path: "database.name", type: "string", pattern: /^[A-Za-z0-9_-]+$/ },
  { path: "database.migrationOwner", type: "string" },
  { path: "security.secretStore", type: "string" },
  { path: "security.seedAdminIdentitySource", type: "string" },
  { path: "domain.primaryNavigationLabel", type: "string" },
  { path: "domain.primaryEntityName", type: "string" },
  { path: "domain.primaryRoute", type: "route" },
  { path: "domain.roleModel", type: "array" },
  { path: "domain.criticalJourneys", type: "array" },
  { path: "release.productizationDecision", type: "decision" },
  { path: "release.approver", type: "string" },
  { path: "release.approvalDate", type: "string" },
];

const VALUE_BLOCKERS = [
  { label: "TBD placeholder", pattern: /\bTBD\b/i },
  { label: "pending decision", pattern: /\bpending\b/i },
  { label: "example placeholder", pattern: /(?:^|[\/@._-])example(?:[\/@._-]|$)/i },
  { label: "Contoso placeholder", pattern: /contoso/i },
  { label: "placeholder marker", pattern: /<[^>\n]+>/ },
  { label: "template package/name", pattern: /sem[-_]sw[-_]web[-_]template/i },
  { label: "template display name", pattern: /SEM SW Web Template/i },
  { label: "template class/entity naming", pattern: /WebTemplate[A-Za-z]*/i },
  { label: "template route/table naming", pattern: /web[-_]templates?/i },
  { label: "default master seed email", pattern: /master@localhost/i },
  { label: "localhost value", pattern: /\blocalhost\b/i },
];

function profileFile() {
  return process.env.PRODUCT_PROFILE_FILE || DEFAULT_PROFILE_FILE;
}

function readByPath(value, propertyPath) {
  return propertyPath.split(".").reduce((current, segment) => {
    if (current && Object.prototype.hasOwnProperty.call(current, segment)) {
      return current[segment];
    }
    return undefined;
  }, value);
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

function validateRequiredField(profile, field) {
  const value = readByPath(profile, field.path);
  const findings = [];

  if (value === undefined || value === null) {
    findings.push({ path: field.path, label: "missing required field", value: field.path });
    return findings;
  }

  if (field.type === "array") {
    if (!Array.isArray(value) || value.length === 0) {
      findings.push({ path: field.path, label: "empty required array", value: field.path });
      return findings;
    }

    for (const [index, item] of value.entries()) {
      if (typeof item !== "string" || item.trim() === "") {
        findings.push({ path: `${field.path}[${index}]`, label: "array item must be non-empty text", value: String(item) });
      }
    }

    return findings;
  }

  if (typeof value !== "string" || value.trim() === "") {
    findings.push({ path: field.path, label: "required value must be non-empty text", value: String(value) });
    return findings;
  }

  const trimmed = value.trim();

  if (field.type === "url") {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:") {
        findings.push({ path: field.path, label: "URL must use https", value: trimmed });
      }
      if (parsed.hostname === "localhost" || parsed.hostname.endsWith(".local")) {
        findings.push({ path: field.path, label: "URL must be deployable, not local", value: trimmed });
      }
    } catch {
      findings.push({ path: field.path, label: "invalid URL", value: trimmed });
    }
  }

  if (field.type === "route" && !trimmed.startsWith("/")) {
    findings.push({ path: field.path, label: "route must start with /", value: trimmed });
  }

  if (field.type === "decision" && !["approved", "waived"].includes(trimmed.toLowerCase())) {
    findings.push({ path: field.path, label: "decision must be approved or waived", value: trimmed });
  }

  if (field.pattern && !field.pattern.test(trimmed)) {
    findings.push({ path: field.path, label: "value has invalid format", value: trimmed });
  }

  return findings;
}

const root = path.resolve(__dirname, "..");
const relativeProfileFile = profileFile();
const resolvedProfileFile = path.resolve(root, relativeProfileFile);
const relativeProfilePath = path.relative(root, resolvedProfileFile);
const findings = [];

if (relativeProfilePath.startsWith("..") || path.isAbsolute(relativeProfilePath)) {
  findings.push({ path: "$", label: "path outside workspace", value: relativeProfileFile });
} else if (!fs.existsSync(resolvedProfileFile)) {
  findings.push({ path: "$", label: "missing product profile file", value: relativeProfilePath });
} else {
  let profile;
  try {
    profile = JSON.parse(fs.readFileSync(resolvedProfileFile, "utf8"));
  } catch (error) {
    findings.push({ path: "$", label: "invalid JSON", value: error.message });
  }

  if (profile) {
    for (const field of REQUIRED_FIELDS) {
      findings.push(...validateRequiredField(profile, field));
    }

    for (const stringValue of collectStringValues(profile)) {
      const blocker = findValueBlocker(stringValue.value);
      if (blocker) {
        findings.push({ path: stringValue.path, ...blocker });
      }
    }
  }
}

if (findings.length) {
  console.error("[product-profile] Productization profile is incomplete.");
  for (const finding of findings) {
    console.error(`- ${relativeProfilePath}:${finding.path} ${finding.label}: ${JSON.stringify(finding.value)}`);
  }
  process.exit(1);
}

console.log("[product-profile] OK");
