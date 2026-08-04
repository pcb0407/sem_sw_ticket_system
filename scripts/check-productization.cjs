#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SCAN_ROOTS = [
  "package.json",
  "README.md",
  "backend/package.json",
  "backend/src",
  "frontend/package.json",
  "frontend/src",
  "shared/package.json",
  "shared/src",
  "scripts/local-dev-defaults.json",
  "docs/sem-sw-ticket-system-deployment.md",
  "docs/sem-sw-ticket-system-developer-config.md",
];

const MAX_TEXT_FILE_BYTES = 512 * 1024;
const SKIP_DIRS = new Set(["node_modules", "dist", "build", "coverage", "output", ".git", ".github", ".codex"]);
const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".env",
  ".html",
  ".js",
  ".json",
  ".md",
  ".ps1",
  ".tsx",
  ".ts",
  ".txt",
  ".yml",
  ".yaml",
]);

const PLACEHOLDERS = [
  { label: "template package/name", pattern: /sem[-_]sw[-_]web[-_]template/i },
  { label: "template display name", pattern: /SEM SW Ticket System/i },
  { label: "template class/entity naming", pattern: /WebTemplate[A-Za-z]*/i },
  { label: "template route/table naming", pattern: /web[-_]templates?/i },
  { label: "default master seed email", pattern: /master@localhost/i },
  { label: "default master seed password", pattern: /master(['"`\s,})\]]|$)/ },
  { label: "example domain placeholder", pattern: /example\.contoso\.com/i },
  { label: "Contoso placeholder", pattern: /contoso/i },
];

function parseScanRoots() {
  const raw = process.env.PRODUCTIZATION_SCAN_ROOTS;
  if (!raw) return DEFAULT_SCAN_ROOTS;
  return raw
    .split(/[;\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function shouldReadFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(extension);
}

function collectFiles(targetPath, files = []) {
  if (!fs.existsSync(targetPath)) {
    return files;
  }

  const linkStat = fs.lstatSync(targetPath);
  if (linkStat.isSymbolicLink()) {
    return files;
  }

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    if (shouldReadFile(targetPath) && stat.size <= MAX_TEXT_FILE_BYTES) {
      files.push(targetPath);
    }
    return files;
  }

  if (!stat.isDirectory()) {
    return files;
  }

  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) {
      continue;
    }

    collectFiles(path.join(targetPath, entry.name), files);
  }

  return files;
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

function findMatches(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const matches = [];

  for (const placeholder of PLACEHOLDERS) {
    const match = placeholder.pattern.exec(content);
    if (match) {
      matches.push({
        label: placeholder.label,
        line: lineNumberForIndex(content, match.index),
        value: match[0],
      });
    }
  }

  return matches;
}

const root = path.resolve(__dirname, "..");
const files = parseScanRoots().flatMap((scanRoot) => collectFiles(path.resolve(root, scanRoot)));
const findings = [];

for (const file of files) {
  const matches = findMatches(file);
  for (const match of matches) {
    findings.push({
      file: path.relative(root, file),
      ...match,
    });
  }
}

if (findings.length > 0) {
  console.error("[productization] Template placeholders remain. Replace them before commercial product release.");
  for (const finding of findings.slice(0, 50)) {
    console.error(`- ${finding.file}:${finding.line} ${finding.label}: ${JSON.stringify(finding.value)}`);
  }

  if (findings.length > 50) {
    console.error(`- ...and ${findings.length - 50} more findings.`);
  }

  process.exit(1);
}

console.log("[productization] OK");
