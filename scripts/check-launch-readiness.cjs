#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_LAUNCH_READINESS_FILE = "docs/sem-sw-ticket-system-launch-readiness.md";
const BLOCKERS = [
  { label: "TBD placeholder", pattern: /\bTBD\b/i },
  { label: "pending status", pattern: /\bpending\b/i },
  { label: "not run status", pattern: /\bnot run\b/i },
  { label: "example URL", pattern: /example\.contoso\.com/i },
  { label: "placeholder secret marker", pattern: /<[^>\n]+>/ },
  { label: "unresolved staging/production choice", pattern: /staging\s*\/\s*production/i },
  { label: "unresolved pass/fail choice", pattern: /pass\s*\/\s*fail/i },
  { label: "unresolved yes/no choice", pattern: /yes\s*\/\s*no/i },
  { label: "unchecked launch item", pattern: /\[[ ]\]/ },
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
const evidenceFile = process.env.LAUNCH_READINESS_FILE || DEFAULT_LAUNCH_READINESS_FILE;
const evidencePath = path.resolve(root, evidenceFile);
const relativePath = path.relative(root, evidencePath);
const findings = [];

if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
  findings.push({ line: 1, label: "path outside workspace", value: evidenceFile });
} else if (!fs.existsSync(evidencePath)) {
  findings.push({ line: 1, label: "missing launch readiness file", value: relativePath });
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
  console.error("[launch-readiness] Launch readiness is incomplete.");
  for (const finding of findings) {
    console.error(`- ${relativePath || evidenceFile}:${finding.line} ${finding.label}: ${JSON.stringify(finding.value)}`);
  }
  process.exit(1);
}

console.log("[launch-readiness] OK");
