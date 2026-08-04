const fs = require("node:fs");
const path = require("node:path");
const { resolveLocalDevConfig } = require("./local-dev-defaults.cjs");
const {
  resolveLocalBuildOutputBaseRoot,
  resolveLocalDependencyBaseRoot,
} = require("./local-paths.cjs");

const consoleContext = normalizeConsoleContext(process.env.TICKET_SYSTEM_CONSOLE_CONTEXT);
const consoleMode = String(process.env.TICKET_SYSTEM_APPHOST_CONSOLE_MODE || "default").trim().toLowerCase();
const quietSummary = consoleMode === "compact" || consoleMode === "quiet";

const workspaceRoot = path.resolve(__dirname, "..");
const localDevConfig = resolveLocalDevConfig(workspaceRoot);

const nodeMajor = process.versions.node.split(".")[0];
const layoutName = `${process.platform}-${process.arch}-node${nodeMajor}`;
const externalOutputBaseRoot = resolveLocalBuildOutputBaseRoot(workspaceRoot, localDevConfig);
const externalOutputRoot = path.join(externalOutputBaseRoot, layoutName);

const externalDependencyBaseRoot = resolveLocalDependencyBaseRoot(workspaceRoot, localDevConfig);
const externalDependencyRoot = path.join(externalDependencyBaseRoot, layoutName, "root");
const currentWorkingDirectory = path.resolve(process.cwd());
const staleEntryRoot = resolveStaleEntryRoot(externalOutputRoot);

function resolvePlatformPackageRoot(areaName) {
  const currentLeaf = path.basename(currentWorkingDirectory).toLowerCase();
  if (currentLeaf === areaName) {
    return currentWorkingDirectory;
  }

  return path.join(path.resolve(__dirname, ".."), "common-platform", "packages", areaName);
}

function normalizeArchitecture(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "amd64") return "x64";
  if (normalized === "aarch64") return "arm64";
  return normalized || process.arch;
}

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

function formatPrefix(tag = "build-output") {
  if (consoleContext) {
    return `[${consoleContext}] ${tag}: `;
  }

  return `[${tag}] `;
}

function logInfo(message) {
  console.log(`${formatPrefix()}${message}`);
}

function logWarn(message) {
  console.warn(`${formatPrefix()}${message}`);
}

if (!quietSummary) {
  console.log(`[build-output] OS architecture: ${normalizeArchitecture(process.env.PROCESSOR_ARCHITEW6432 || process.env.PROCESSOR_ARCHITECTURE || process.arch)}`);
  console.log(`[build-output] Process architecture: ${process.arch}`);
  console.log(`[build-output] Node.js architecture: ${process.arch}`);
  console.log(`[build-output] Selected dependency layout path: ${layoutName}`);
  console.log(`[build-output] Selected build output path: ${externalOutputRoot}`);
}

function resolveOutputPath(areaName) {
  const currentPackageRoot = path.dirname(path.join(currentWorkingDirectory, "dist"));
  const normalizedExternalDependencyRoot = `${externalDependencyRoot.toLowerCase()}${path.sep}`;
  const normalizedCurrentPackageRoot = `${currentPackageRoot.toLowerCase()}${path.sep}`;

  if (normalizedCurrentPackageRoot.startsWith(normalizedExternalDependencyRoot)) {
    return path.join(externalOutputRoot, areaName, "dist");
  }

  if (path.basename(currentPackageRoot).toLowerCase() === areaName) {
    return path.join(currentPackageRoot, "dist");
  }

  return path.join(externalDependencyRoot, areaName, "dist");
}

const areaConfigs = {
  backend: {
    outputPath: resolveOutputPath("backend"),
    cleanFiles: [path.join(externalOutputRoot, "backend", "tsconfig.tsbuildinfo")],
  },
  frontend: {
    outputPath: resolveOutputPath("frontend"),
    cleanFiles: [path.join(externalOutputRoot, "frontend", "tsconfig.tsbuildinfo")],
  },
  shared: {
    outputPath: resolveOutputPath("shared"),
    cleanFiles: [
      path.join(externalOutputRoot, "shared", "tsconfig.cjs.tsbuildinfo"),
      path.join(externalOutputRoot, "shared", "tsconfig.esm.tsbuildinfo"),
    ],
    nodeModulesPath: path.join(externalOutputRoot, "shared", "node_modules"),
    nodeModulesSource: path.join(externalDependencyRoot, "node_modules"),
  },
  "platform-backend": {
    outputPath: path.join(externalOutputRoot, "platform", "platform-backend", "dist"),
    cleanFiles: [],
    linkPath: path.join(resolvePlatformPackageRoot("platform-backend"), "dist"),
    nodeModulesPath: path.join(externalOutputRoot, "platform", "platform-backend", "node_modules"),
    nodeModulesSource: path.join(externalDependencyRoot, "node_modules"),
  },
  "platform-frontend": {
    outputPath: path.join(externalOutputRoot, "platform", "platform-frontend", "dist"),
    cleanFiles: [],
    linkPath: path.join(resolvePlatformPackageRoot("platform-frontend"), "dist"),
    nodeModulesPath: path.join(externalOutputRoot, "platform", "platform-frontend", "node_modules"),
    nodeModulesSource: path.join(externalDependencyRoot, "node_modules"),
  },
  "platform-shared": {
    outputPath: path.join(externalOutputRoot, "platform", "platform-shared", "dist"),
    cleanFiles: [],
    linkPath: path.join(resolvePlatformPackageRoot("platform-shared"), "dist"),
    nodeModulesPath: path.join(externalOutputRoot, "platform", "platform-shared", "node_modules"),
    nodeModulesSource: path.join(externalDependencyRoot, "node_modules"),
  },
};

function isSameTarget(linkPath, targetPath) {
  try {
    return fs.realpathSync.native(linkPath) === fs.realpathSync.native(targetPath);
  } catch {
    return false;
  }
}

function ensureJunction(linkPath, targetPath) {
  ensureDirectory(path.dirname(linkPath));
  ensureDirectory(targetPath);

  let stats = null;
  try {
    stats = fs.lstatSync(linkPath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  if (stats) {
    if ((stats.isSymbolicLink() || stats.isDirectory()) && isSameTarget(linkPath, targetPath)) {
      return;
    }

    if (stats.isSymbolicLink()) {
      try {
        fs.rmdirSync(linkPath);
      } catch (error) {
        if (error?.code === "ENOTDIR") {
          fs.unlinkSync(linkPath);
        } else {
          removePath(linkPath);
        }
      }
    } else {
      removePath(linkPath);
    }
  }

  fs.symlinkSync(targetPath, linkPath, "junction");
}

function ensureDirectory(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function resolveStaleEntryRoot(preferredRoot) {
  const workspaceVolume = path.parse(currentWorkingDirectory).root.toLowerCase();
  const preferredVolume = path.parse(preferredRoot).root.toLowerCase();

  if (workspaceVolume === preferredVolume) {
    return path.join(preferredRoot, ".stale-paths");
  }

  const projectName = path.basename(workspaceRoot).replace(/[<>:"/\\|?*\x00-\x1f]+/g, "-");
  return path.join(path.parse(currentWorkingDirectory).root, ".sem-local", projectName, layoutName, ".stale-paths");
}

function sanitizeStaleEntryName(targetPath) {
  const relativePath = path.relative(currentWorkingDirectory, targetPath);
  const labelSource = relativePath && !relativePath.startsWith("..") ? relativePath : path.basename(targetPath);
  return labelSource.replace(/[\\/:]+/g, "__").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function createStaleEntryPath(targetPath, attempt) {
  ensureDirectory(staleEntryRoot);
  return path.join(staleEntryRoot, `${sanitizeStaleEntryName(targetPath)}.stale-${Date.now()}-${attempt}`);
}

const lockedPathErrorCodes = new Set(["EBUSY", "EPERM", "ENOTEMPTY"]);

function waitForLockedPathRetry(milliseconds) {
  const buffer = new SharedArrayBuffer(4);
  const view = new Int32Array(buffer);
  Atomics.wait(view, 0, 0, milliseconds);
}

function removePath(targetPath) {
  const maxAttempts = 20;
  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (error?.code === "ENOENT") {
        return;
      }

      if (!lockedPathErrorCodes.has(error?.code)) {
        throw error;
      }

      lastError = error;
    }

    const stalePath = createStaleEntryPath(targetPath, attempt);
    try {
      fs.renameSync(targetPath, stalePath);
      logWarn(`moved locked path aside: ${targetPath} -> ${stalePath}`);
      return;
    } catch (error) {
      if (error?.code === "ENOENT") {
        return;
      }

      if (!lockedPathErrorCodes.has(error?.code)) {
        throw error;
      }

      lastError = error;
    }

    waitForLockedPathRetry(250);
  }

  throw new Error(
    `Unable to remove or move locked path after ${maxAttempts} attempts: ${targetPath}` +
      (lastError ? ` (${lastError.code}: ${lastError.message})` : ""),
  );
}

function emptyDirectory(targetPath) {
  ensureDirectory(targetPath);

  for (const entry of fs.readdirSync(targetPath)) {
    removePath(path.join(targetPath, entry));
  }
}

function cleanArea(config) {
  emptyDirectory(config.outputPath);

  for (const filePath of config.cleanFiles) {
    removePath(filePath);
  }
}

function parseArgs(argv) {
  const requestedAreas = [];
  let clean = false;

  for (const arg of argv) {
    if (arg === "--clean") {
      clean = true;
      continue;
    }

    requestedAreas.push(arg);
  }

  return { requestedAreas, clean };
}

const { requestedAreas, clean } = parseArgs(process.argv.slice(2));
const areaNames = requestedAreas.length > 0 ? requestedAreas : Object.keys(areaConfigs);

function ensureOutputScriptsReady() {
  ensureJunction(path.join(externalOutputRoot, "scripts"), path.join(path.resolve(__dirname, ".."), "scripts"));
}

for (const areaName of areaNames) {
  const config = areaConfigs[areaName];
  if (!config) {
    throw new Error(`Unsupported build output area: ${areaName}`);
  }

  if (config.linkPath) {
    ensureJunction(config.linkPath, config.sourcePath || config.outputPath);
  } else {
    ensureDirectory(config.outputPath);
  }

  if (config.nodeModulesPath && config.nodeModulesSource) {
    ensureJunction(config.nodeModulesPath, config.nodeModulesSource);
  }

  if (clean) {
    cleanArea(config);
  }

  if (areaName === "backend") {
    ensureOutputScriptsReady();
  }

  if (quietSummary) {
    logInfo(`${areaName} output ready: ${config.outputPath}`);
  } else {
    console.log(`[build-output] ${areaName}: ${config.outputPath}`);
  }
}
