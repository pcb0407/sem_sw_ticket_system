"use strict";

const fs = require("node:fs");
const path = require("node:path");

const workspaceRoot = path.resolve(process.env.SEM_APP_WORKSPACE_ROOT || path.resolve(__dirname, ".."));
const platformCandidates = [
  process.env.SEM_PLATFORM_SOURCE_ROOT,
  path.join(workspaceRoot, "common-platform"),
  path.resolve(workspaceRoot, "..", "sem_sw_common_web_platform"),
].filter(Boolean);

const launcherPath = platformCandidates
  .map((platformRoot) => path.join(platformRoot, "scripts", "invoke-consumer-workspace-node.cjs"))
  .find((candidate) => fs.existsSync(candidate));

if (!launcherPath) {
  console.error(
    "[workspace-node] Common launcher not found. Set SEM_PLATFORM_SOURCE_ROOT or run npm run platform:link.",
  );
  process.exit(1);
}

process.env.SEM_APP_WORKSPACE_ROOT = workspaceRoot;
require(launcherPath);
