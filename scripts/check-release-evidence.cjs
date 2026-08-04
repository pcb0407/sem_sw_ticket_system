#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_EVIDENCE_FILES = [
  "docs/sem-sw-ticket-system-productization-profile.json",
  "docs/sem-sw-ticket-system-environment-matrix.json",
  "docs/sem-sw-ticket-system-release-readiness.md",
  "docs/sem-sw-ticket-system-security-review.md",
  "docs/sem-sw-ticket-system-operations-runbook.md",
];

const BLOCKERS = [
  { label: "TBD placeholder", pattern: /\bTBD\b/i },
  { label: "pending decision", pattern: /\bpending\b/i },
  { label: "example or Contoso placeholder", pattern: /\bexample\b|contoso/i },
  { label: "placeholder secret marker", pattern: /<[^>\n]+>/ },
  { label: "unselected decision list", pattern: /pending\s*\/\s*approved/i },
  { label: "staging/production choice not resolved", pattern: /staging\s*\/\s*production/i },
];

function evidenceFiles() {
  const raw = process.env.RELEASE_EVIDENCE_FILES;
  if (!raw) return DEFAULT_EVIDENCE_FILES;
  return raw
    .split(/[;\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function lineNumberForIndex(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

function findBlockers(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const findings = [];

  for (const blocker of BLOCKERS) {
    const match = blocker.pattern.exec(content);
    if (match) {
      findings.push({
        label: blocker.label,
        line: lineNumberForIndex(content, match.index),
        value: match[0],
      });
    }
  }

  return findings;
}

const root = path.resolve(__dirname, "..");
const findings = [];

for (const relativeFile of evidenceFiles()) {
  const filePath = path.resolve(root, relativeFile);
  const relativePath = path.relative(root, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    findings.push({
      file: relativeFile,
      line: 1,
      label: "path outside workspace",
      value: relativeFile,
    });
    continue;
  }

  if (!fs.existsSync(filePath)) {
    findings.push({
      file: relativePath,
      line: 1,
      label: "missing evidence file",
      value: relativePath,
    });
    continue;
  }

  for (const finding of findBlockers(filePath)) {
    findings.push({ file: relativePath, ...finding });
  }
}

if (findings.length) {
  console.error("[release-evidence] Release evidence is incomplete.");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.label}: ${JSON.stringify(finding.value)}`);
  }
  process.exit(1);
}

console.log("[release-evidence] OK");
