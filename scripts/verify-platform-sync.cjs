"use strict";

const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const { resolveLocalDependencyBaseRoot } = require("./local-paths.cjs");

const repoRoot = path.resolve(
  process.env.SEM_APP_WORKSPACE_ROOT ||
    process.env.SERVICE_PORTAL_WORKSPACE_ROOT ||
    process.env.BUNDLE_WORKSPACE_ROOT ||
    process.env.PUMP_WORKSPACE_ROOT ||
    process.env.TICKET_SYSTEM_WORKSPACE_ROOT ||
    process.env.INIT_CWD ||
    path.resolve(__dirname, ".."),
);

const commonPlatformRoot = path.join(repoRoot, "common-platform");
if (!existsSync(commonPlatformRoot)) {
  console.warn("[platform sync verify] common-platform link is missing; skipping sync verification.");
  process.exit(0);
}

const packageChecks = [
  { name: "platform-shared", dtsRelativePath: path.join("dist", "cjs", "index.d.ts") },
  { name: "platform-frontend", dtsRelativePath: path.join("dist", "index.d.ts") },
  { name: "platform-backend", dtsRelativePath: path.join("dist", "index.d.ts") },
];
const installRoots = resolveExternalInstallRoots(repoRoot);
const failuresByRoot = [];
let verifiedRoot = "";

for (const installRoot of installRoots) {
  const failures = verifyInstallRoot(installRoot);
  if (failures.length === 0) {
    verifiedRoot = installRoot;
    break;
  }

  failuresByRoot.push({ installRoot, failures });
}

if (!verifiedRoot) {
  console.error("[platform sync verify] External platform package sync validation failed.");
  console.error("Re-run npm run postinstall (or workspace install-deps task) after ensuring common-platform build outputs are current.");
  console.error(`Checked install roots: ${installRoots.join(", ")}`);
  for (const rootResult of failuresByRoot) {
    console.error(`- install root: ${rootResult.installRoot}`);
    for (const failure of rootResult.failures) {
      console.error(`  - ${failure}`);
    }
  }
  process.exit(1);
}

console.log(`[platform sync verify] External platform package sync validation passed (${verifiedRoot}).`);

function verifyInstallRoot(installRoot) {
  const failures = [];

  for (const packageCheck of packageChecks) {
    const packageName = packageCheck.name;
    const referenceDts = resolveReferenceDts(installRoot, packageCheck);
    const targetDts = path.join(installRoot, "node_modules", "@sem", packageName, packageCheck.dtsRelativePath);

    if (!existsSync(targetDts)) {
      failures.push(`${targetDts}: mirrored dist declaration missing`);
      continue;
    }

    if (referenceDts) {
      const missingExportLines = findMissingExportLines(referenceDts, targetDts);
      for (const exportLine of missingExportLines) {
        failures.push(`${targetDts}: missing export line ${JSON.stringify(exportLine)}`);
      }
    }

    if (packageName === "platform-backend") {
      const backendDts = readFileSync(targetDts, "utf8");
      if (!backendDts.includes('export * from "./database/resolve-seed-options";')) {
        failures.push(`${targetDts}: critical export missing for resolve-seed-options`);
      }
    }
  }

  return failures;
}

function resolveReferenceDts(installRoot, packageCheck) {
  const packageName = packageCheck.name;
  const candidates = [
    path.join(installRoot, "common-platform", "packages", packageName, packageCheck.dtsRelativePath),
    path.join(commonPlatformRoot, "packages", packageName, packageCheck.dtsRelativePath),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return "";
}

function resolveExternalInstallRoots(workspaceRoot) {
  const roots = [];

  if (process.env.CODEX_EXTERNAL_WORKSPACE_ACTIVE === "1") {
    const cwd = path.resolve(process.cwd());
    if (existsSync(path.join(cwd, "package.json")) && existsSync(path.join(cwd, "scripts", "install-platform.cjs"))) {
      roots.push(cwd);
    }
  }

  const nodeMajor = process.versions.node.split(".")[0];
  const layoutName = `${process.platform}-${process.arch}-node${nodeMajor}`;
  roots.push(path.join(resolveLocalDependencyBaseRoot(workspaceRoot), layoutName, "root"));

  if (process.platform === "win32") {
    roots.push(path.join("D:\\_SEM_BitBucket_SEM_SW", path.basename(workspaceRoot), layoutName, "root"));
  }

  return Array.from(new Set(roots.map((value) => path.resolve(value))));
}

function findMissingExportLines(sourceDts, targetDts) {
  const sourceExportLines = collectExportLines(sourceDts);
  const targetExportLines = new Set(collectExportLines(targetDts));
  return sourceExportLines.filter((line) => !targetExportLines.has(line));
}

function collectExportLines(filePath) {
  const content = readFileSync(filePath, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("export * from ")); 
}
