#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_TEST_EVIDENCE_FILE = "docs/sem-sw-ticket-system-test-evidence.md";
const BLOCKERS = [
  { label: "TBD placeholder", pattern: /\bTBD\b/i },
  { label: "pending status", pattern: /\bpending\b/i },
  { label: "not run status", pattern: /\bnot run\b/i },
  { label: "example URL", pattern: /example\.contoso\.com/i },
  { label: "unresolved pass/fail choice", pattern: /pass\s*\/\s*fail/i },
  { label: "unresolved yes/no choice", pattern: /yes\s*\/\s*no/i },
];

function lineNumberForIndex(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

const root = path.resolve(__dirname, "..");
const evidenceFile = process.env.TEST_EVIDENCE_FILE || DEFAULT_TEST_EVIDENCE_FILE;
const evidencePath = path.resolve(root, evidenceFile);
const relativePath = path.relative(root, evidencePath);
const findings = [];

if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
  findings.push({ line: 1, label: "path outside workspace", value: evidenceFile });
} else if (!fs.existsSync(evidencePath)) {
  findings.push({ line: 1, label: "missing test evidence file", value: relativePath });
} else {
  const content = fs.readFileSync(evidencePath, "utf8");
  for (const blocker of BLOCKERS) {
    const match = blocker.pattern.exec(content);
    if (match) {
      findings.push({
        line: lineNumberForIndex(content, match.index),
        label: blocker.label,
        value: match[0],
      });
    }
  }
}

if (findings.length) {
  console.error("[test-evidence] Test evidence is incomplete.");
  for (const finding of findings) {
    console.error(`- ${relativePath || evidenceFile}:${finding.line} ${finding.label}: ${JSON.stringify(finding.value)}`);
  }
  process.exit(1);
}

console.log("[test-evidence] OK");
