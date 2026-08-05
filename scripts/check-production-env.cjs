#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const workspaceRoot =
  process.env.SEM_APP_WORKSPACE_ROOT ||
  process.env.PUMP_WORKSPACE_ROOT ||
  process.env.BUNDLE_WORKSPACE_ROOT ||
  process.env.WEB_TEMPLATE_WORKSPACE_ROOT ||
  "";

const candidates = [
  workspaceRoot ? path.resolve(workspaceRoot, "common-platform", "scripts", "check-production-env.cjs") : "",
  path.resolve(__dirname, "..", "common-platform", "scripts", "check-production-env.cjs"),
  path.resolve(__dirname, "..", "..", "common-platform", "scripts", "check-production-env.cjs"),
  path.resolve(process.cwd(), "common-platform", "scripts", "check-production-env.cjs"),
  path.resolve(process.cwd(), "..", "common-platform", "scripts", "check-production-env.cjs"),
  path.resolve(process.cwd(), "..", "..", "common-platform", "scripts", "check-production-env.cjs"),
];

const sharedScript = candidates.find((candidate) => fs.existsSync(candidate));
if (!sharedScript) {
  console.error("[production-env] shared checker not found in common-platform/scripts/check-production-env.cjs");
  process.exit(1);
}

const result = spawnSync(process.execPath, [sharedScript], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
