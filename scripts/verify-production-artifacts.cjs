"use strict";

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(
  process.env.SEM_APP_WORKSPACE_ROOT ||
    process.env.TICKET_SYSTEM_WORKSPACE_ROOT ||
    process.env.INIT_CWD ||
    path.resolve(__dirname, ".."),
);
const maxFrontendChunkBytes = readPositiveInteger(
  process.env.TICKET_SYSTEM_MAX_FRONTEND_CHUNK_KB,
  500,
) * 1024;

const requiredFiles = [
  "shared/dist/cjs/index.js",
  "shared/dist/cjs/index.d.ts",
  "shared/dist/esm/index.js",
  "shared/dist/esm/package.json",
  "backend/dist/main.js",
  "backend/dist/app.module.js",
  "backend/dist/database/data-source.js",
  "frontend/dist/index.html",
];

const failures = [];

for (const relativePath of requiredFiles) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing required artifact: ${relativePath}`);
    continue;
  }

  const stat = fs.statSync(fullPath);
  if (!stat.isFile() || stat.size <= 0) {
    failures.push(`empty or invalid artifact: ${relativePath}`);
  }
}

const frontendAssetsRoot = path.join(repoRoot, "frontend", "dist", "assets");
if (!fs.existsSync(frontendAssetsRoot)) {
  failures.push("missing frontend asset directory: frontend/dist/assets");
} else {
  const assets = fs.readdirSync(frontendAssetsRoot).filter((name) => /\.(css|js)$/.test(name));
  const referencedAssets = readReferencedFrontendAssets();
  const jsAssets = assets.filter((name) => name.endsWith(".js") && referencedAssets.has(`assets/${name}`));
  const cssAssets = assets.filter((name) => name.endsWith(".css"));

  if (jsAssets.length === 0) failures.push("frontend build did not produce a JavaScript asset");
  if (cssAssets.length === 0) failures.push("frontend build did not produce a CSS asset");

  for (const assetName of jsAssets) {
    const fullPath = path.join(frontendAssetsRoot, assetName);
    const size = fs.statSync(fullPath).size;
    if (size > maxFrontendChunkBytes) {
      failures.push(
        `frontend JavaScript chunk exceeds ${formatBytes(maxFrontendChunkBytes)}: ${assetName} is ${formatBytes(size)}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("[production-artifacts] Verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[production-artifacts] Build artifacts verified.");

function readPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function readReferencedFrontendAssets() {
  const indexHtmlPath = path.join(repoRoot, "frontend", "dist", "index.html");
  if (!fs.existsSync(indexHtmlPath)) {
    return new Set();
  }

  const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");
  const matches = indexHtml.matchAll(/(?:src|href)="([^"]*assets\/[^"]+\.(?:js|css))"/g);
  return new Set(
    [...matches].map((match) => {
      const value = match[1].replace(/^\.\//, "");
      const assetsIndex = value.indexOf("assets/");
      return assetsIndex >= 0 ? value.slice(assetsIndex) : value;
    }),
  );
}
