#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_DIST = path.join("frontend", "dist");
const DEFAULT_MAX_JS_KB = 700;
const DEFAULT_MAX_CSS_KB = 120;
const DEFAULT_MAX_TOTAL_KB = 900;

function readPositiveNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toKilobytes(bytes) {
  return bytes / 1024;
}

function formatKb(kb) {
  return `${kb.toFixed(2)} kB`;
}

function collectFiles(root, predicate) {
  const results = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && predicate(fullPath)) {
        results.push(fullPath);
      }
    }
  }

  walk(root);
  return results;
}

function collectReferencedAssets(root) {
  const indexPath = path.join(root, "index.html");
  if (!fs.existsSync(indexPath)) {
    return [];
  }

  const html = fs.readFileSync(indexPath, "utf8");
  const files = new Set();
  const attributePattern = /\b(?:src|href)=["']([^"']+)["']/g;

  for (const match of html.matchAll(attributePattern)) {
    const rawValue = match[1];
    if (/^[a-z]+:/i.test(rawValue) || rawValue.startsWith("//")) {
      continue;
    }

    const assetPath = decodeURIComponent(rawValue.split(/[?#]/, 1)[0]).replace(/^\/+/, "");
    if (!assetPath.endsWith(".js") && !assetPath.endsWith(".css")) {
      continue;
    }

    const fullPath = path.resolve(root, assetPath);
    const relativePath = path.relative(root, fullPath);
    if (!relativePath.startsWith("..") && !path.isAbsolute(relativePath) && fs.existsSync(fullPath)) {
      files.add(fullPath);
    }
  }

  return [...files];
}

function summarize(files) {
  let totalBytes = 0;
  let maxBytes = 0;
  let maxFile = "";

  for (const file of files) {
    const size = fs.statSync(file).size;
    totalBytes += size;
    if (size > maxBytes) {
      maxBytes = size;
      maxFile = file;
    }
  }

  return { totalBytes, maxBytes, maxFile };
}

function fail(message) {
  console.error(`[frontend-budget] ${message}`);
  process.exitCode = 1;
}

const distRoot = path.resolve(process.env.FRONTEND_BUDGET_DIST || DEFAULT_DIST);
const maxJsKb = readPositiveNumber("FRONTEND_BUDGET_MAX_JS_KB", DEFAULT_MAX_JS_KB);
const maxCssKb = readPositiveNumber("FRONTEND_BUDGET_MAX_CSS_KB", DEFAULT_MAX_CSS_KB);
const maxTotalKb = readPositiveNumber("FRONTEND_BUDGET_MAX_TOTAL_KB", DEFAULT_MAX_TOTAL_KB);

if (!fs.existsSync(distRoot)) {
  fail(`Build output not found: ${distRoot}. Run npm run build first.`);
  process.exit();
}

const referencedAssets = collectReferencedAssets(distRoot);
const budgetFiles =
  referencedAssets.length > 0
    ? referencedAssets
    : collectFiles(distRoot, (file) => file.endsWith(".js") || file.endsWith(".css"));
const jsSummary = summarize(budgetFiles.filter((file) => file.endsWith(".js")));
const cssSummary = summarize(budgetFiles.filter((file) => file.endsWith(".css")));
const totalKb = toKilobytes(jsSummary.totalBytes + cssSummary.totalBytes);
const maxJsFileKb = toKilobytes(jsSummary.maxBytes);
const maxCssFileKb = toKilobytes(cssSummary.maxBytes);

console.log(`[frontend-budget] checked files: ${budgetFiles.length}`);
console.log(`[frontend-budget] largest JS: ${formatKb(maxJsFileKb)} ${path.relative(distRoot, jsSummary.maxFile)}`);
console.log(`[frontend-budget] largest CSS: ${formatKb(maxCssFileKb)} ${path.relative(distRoot, cssSummary.maxFile)}`);
console.log(`[frontend-budget] JS+CSS total: ${formatKb(totalKb)}`);

if (maxJsFileKb > maxJsKb) {
  fail(`Largest JS file exceeds budget: ${formatKb(maxJsFileKb)} > ${formatKb(maxJsKb)}.`);
}

if (maxCssFileKb > maxCssKb) {
  fail(`Largest CSS file exceeds budget: ${formatKb(maxCssFileKb)} > ${formatKb(maxCssKb)}.`);
}

if (totalKb > maxTotalKb) {
  fail(`Total JS+CSS exceeds budget: ${formatKb(totalKb)} > ${formatKb(maxTotalKb)}.`);
}

if (process.exitCode) {
  process.exit();
}

console.log("[frontend-budget] OK");
