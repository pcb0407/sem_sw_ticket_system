const fs = require("fs");
const path = require("path");
const { spawnSync } = require("node:child_process");
const { resolveLocalDevConfig } = require("./local-dev-defaults.cjs");
const { isSyncedStoragePath, resolveLocalDependencyBaseRoot } = require("./local-paths.cjs");

const consoleContext = normalizeConsoleContext(process.env.TICKET_SYSTEM_CONSOLE_CONTEXT);
const consoleMode = String(process.env.TICKET_SYSTEM_APPHOST_CONSOLE_MODE || "default").trim().toLowerCase();
const quietSuccess =
  process.env.TICKET_SYSTEM_LOCAL_DEV_ENV_QUIET === "1" ||
  consoleMode === "compact" ||
  consoleMode === "quiet";

function normalizeConsoleContext(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  if (normalized === "backend-debug") {
    return "backend";
  }

  return normalized;
}

function formatMessagePrefix(tag = "local-dev-env") {
  if (consoleContext) {
    return `[${consoleContext}] ${tag}: `;
  }

  return `[${tag}] `;
}

function logInfo(message) {
  console.log(`${formatMessagePrefix()}${message}`);
}

function fail(message) {
  console.error(`\n${formatMessagePrefix()}${message}\n`);
  process.exit(1);
}

if (process.env.TICKET_SYSTEM_SKIP_LOCAL_DEV_ENV_CHECK === "1") {
  logInfo("Skipping local environment guard by explicit override.");
  process.exit(0);
}

if (process.platform !== "win32") {
  fail("Local development is supported only on Windows for this repository.");
}

const supportedArchitectures = new Set(["x64", "arm64"]);

if (!supportedArchitectures.has(process.arch)) {
  fail(
    `Detected unsupported Node architecture '${process.arch}'. ` +
      "Use Windows x64 or Windows ARM64 with a matching Node.js installation.",
  );
}

const [nodeMajor, nodeMinor] = process.versions.node
  .split(".")
  .map((part) => Number.parseInt(part, 10));

if (nodeMajor !== 20 || nodeMinor !== 19) {
  reinvokeWithWorkspaceNodeIfPossible();
  fail(
    `Detected unsupported Node.js version '${process.versions.node}'. ` +
      "Use Node.js 20.19.x for local development in this repository.",
  );
}

const workspaceRoot = path.resolve(process.env.SEM_APP_WORKSPACE_ROOT || process.env.TICKET_SYSTEM_WORKSPACE_ROOT || process.cwd());
const localDevConfig = resolveLocalDevConfig(workspaceRoot);
const inSyncedStoragePath = isSyncedStoragePath(workspaceRoot, localDevConfig);
const allowPhysicalNodeModules =
  process.env.TICKET_SYSTEM_ALLOW_PHYSICAL_NODE_MODULES === "1";
const configuredLocalNodeModulesRoot = resolveLocalDependencyBaseRoot(workspaceRoot, localDevConfig);
const localDependencyRoot = path.join(
  configuredLocalNodeModulesRoot,
  `${process.platform}-${process.arch}-node${nodeMajor}`,
);
const expectedNodeModulesTarget = path.join(localDependencyRoot, "root", "node_modules");
function normalizeArchitecture(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "amd64") return "x64";
  if (normalized === "aarch64") return "arm64";
  return normalized || process.arch;
}

const osArchitecture = normalizeArchitecture(process.env.PROCESSOR_ARCHITEW6432 || process.env.PROCESSOR_ARCHITECTURE || process.arch);

function normalizePathForCompare(value) {
  return path.resolve(value).replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();
}

function reinvokeWithWorkspaceNodeIfPossible() {
  if (process.env.SEM_LOCAL_DEV_ENV_REEXECED === "1") {
    return;
  }

  const wrapperPath = path.join(__dirname, "invoke-workspace-node.cjs");
  if (!fs.existsSync(wrapperPath)) {
    return;
  }

  const result = spawnSync(process.execPath, [wrapperPath, __filename], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SEM_LOCAL_DEV_ENV_REEXECED: "1",
    },
    stdio: "inherit",
    windowsHide: false,
  });

  if (result.error) {
    console.warn(`${formatMessagePrefix()}Unable to retry with workspace Node.js: ${result.error.message}`);
    return;
  }

  process.exit(result.status ?? 0);
}

if (inSyncedStoragePath && !allowPhysicalNodeModules) {
  const nodeModulesPath = path.join(workspaceRoot, "node_modules");

  if (fs.existsSync(nodeModulesPath)) {
    const resolvedNodeModulesPath = normalizePathForCompare(fs.realpathSync.native(nodeModulesPath));
    const normalizedNodeModulesPath = normalizePathForCompare(nodeModulesPath);
    const normalizedExpectedTarget = normalizePathForCompare(expectedNodeModulesTarget);

    if (resolvedNodeModulesPath === normalizedNodeModulesPath) {
      fail(
        "Detected a physical node_modules directory inside a synced workspace. " +
          "Run the VS Code task 'workspace:install-deps' so dependencies are rebuilt into the machine-local junction.",
      );
    }

    if (resolvedNodeModulesPath !== normalizedExpectedTarget) {
      fail(
        "Detected a node_modules link that points to a different machine-local dependency path. " +
          "This usually happens after switching between Windows x64 and Windows ARM64 development PCs. " +
          "Run the VS Code task 'workspace:install-deps' on the current machine to rebind the junction and rebuild local dependencies.",
      );
    }
  }
}

if (quietSuccess) {
  process.exit(0);
}

if (consoleContext) {
  logInfo(`Local dev env OK: ${process.platform} ${process.arch} -> ${localDependencyRoot}`);
  process.exit(0);
}

console.log(`[local-dev-env] OS architecture: ${osArchitecture}`);
console.log(`[local-dev-env] Process architecture: ${process.arch}`);
console.log(`[local-dev-env] Node.js architecture: ${process.arch}`);
console.log(`[local-dev-env] Selected dependency layout path: ${localDependencyRoot}`);
console.log(`[local-dev-env] Selected runtime path: ${process.execPath}`);
console.log(`[local-dev-env] OK: ${process.platform} ${process.arch} -> ${localDependencyRoot}`);
