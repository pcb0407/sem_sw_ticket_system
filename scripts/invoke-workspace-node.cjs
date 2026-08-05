"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { resolveLocalDependencyBaseRoot } = require("./local-paths.cjs");

const requiredNodeVersion = "20.19.6";
const requiredNodeMajor = 20;
const requiredNodeMinor = 19;
const workspaceRoot = path.resolve(__dirname, "..");
const runtime = resolveWorkspaceRuntime();
const installRoot = resolveInstallRoot(runtime);
const args = process.argv.slice(2);

ensureWorkspaceNodeModulesJunctions();

if (args.length === 0) {
  console.error("[workspace-node] Missing Node script or arguments.");
  process.exit(1);
}

const resolvedArgs = resolveNodeArguments(args);
const result = spawnSync(runtime.nodeExe, resolvedArgs, {
  cwd: process.cwd(),
  env: buildEnvironment(),
  stdio: "inherit",
  windowsHide: false,
});

if (result.error) {
  console.error(`[workspace-node] ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 0);

function ensureWorkspaceNodeModulesJunctions() {
  const junctions = [
    [path.join(workspaceRoot, "node_modules"), path.join(installRoot, "node_modules")],
    [path.join(workspaceRoot, "backend", "node_modules"), path.join(installRoot, "backend", "node_modules")],
    [path.join(workspaceRoot, "frontend", "node_modules"), path.join(installRoot, "frontend", "node_modules")],
    [path.join(workspaceRoot, "shared", "node_modules"), path.join(installRoot, "shared", "node_modules")],
  ];

  for (const [linkPath, targetPath] of junctions) {
    if (!fs.existsSync(targetPath)) {
      continue;
    }

    ensureJunction(linkPath, targetPath);
  }
}

function ensureJunction(linkPath, targetPath) {
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });

  try {
    const stats = fs.lstatSync(linkPath);
    if (stats.isSymbolicLink() || stats.isDirectory()) {
      try {
        const current = fs.realpathSync.native(linkPath);
        const expected = fs.realpathSync.native(targetPath);
        if (normalizePathForCompare(current) === normalizePathForCompare(expected)) {
          return;
        }
      } catch {
        // Recreate below if realpath cannot be resolved.
      }
    }

    if (stats.isDirectory() && !stats.isSymbolicLink()) {
      // Keep a physical node_modules directory intact to avoid destructive behavior.
      return;
    }

    fs.rmSync(linkPath, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  fs.symlinkSync(targetPath, linkPath, "junction");
}

function normalizePathForCompare(value) {
  const resolved = path.resolve(value || "");
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function resolveInstallRoot(selectedRuntime) {
  const config = require(path.join(workspaceRoot, "scripts", "local-dev-defaults.cjs")).resolveLocalDevConfig(workspaceRoot);
  const nodeMajor = selectedRuntime.version.split(".")[0];
  const layoutName = `${process.platform}-${selectedRuntime.arch}-node${nodeMajor}`;
  const baseRoot = resolveLocalDependencyBaseRoot(workspaceRoot, config);

  return path.join(baseRoot, layoutName, "root");
}

function resolveWorkspaceRuntime() {
  const expectedArchitecture = getExpectedArchitecture();
  const configuredRuntime = validateNodeExecutable(process.env.SEM_WORKSPACE_NODE_EXE, "configured", expectedArchitecture);
  if (configuredRuntime) {
    return configuredRuntime;
  }

  const portableRuntime = validateNodeExecutable(getPortableNodePath(expectedArchitecture), "portable", expectedArchitecture);
  if (portableRuntime) {
    return portableRuntime;
  }

  const systemRuntime = findSystemNodeExecutables()
    .map((nodeExe) => validateNodeExecutable(nodeExe, "system", expectedArchitecture))
    .find(Boolean);
  if (systemRuntime) {
    return systemRuntime;
  }

  installPortableNode(expectedArchitecture);

  const installedRuntime = validateNodeExecutable(getPortableNodePath(expectedArchitecture), "portable", expectedArchitecture);
  if (!installedRuntime) {
    throw new Error("Portable Node.js installation finished, but Node.js 20.19.x could not be validated.");
  }

  return installedRuntime;
}

function getPortableNodePath(expectedArchitecture) {
  return path.join(getPortableInstallRoot(), `node-v${requiredNodeVersion}-win-${expectedArchitecture}`, "node.exe");
}

function getPortableInstallRoot() {
  const workspaceName = path.basename(workspaceRoot) || "sem_sw_app";
  const localAppData =
    process.env.LOCALAPPDATA?.trim() ||
    (os.homedir() ? path.join(os.homedir(), "AppData", "Local") : "");

  if (!localAppData) {
    throw new Error("LOCALAPPDATA is required to install the portable workspace Node.js runtime.");
  }

  return path.join(localAppData, `${workspaceName}_tools`);
}

function installPortableNode(expectedArchitecture) {
  const scriptPath = path.join(workspaceRoot, ".vscode", "scripts", "get-workspace-node.ps1");
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-InstallIfMissing"],
    {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        SEM_APP_WORKSPACE_ROOT: workspaceRoot,
        TICKET_SYSTEM_WORKSPACE_ROOT: workspaceRoot,
      },
      stdio: "inherit",
      windowsHide: false,
    },
  );

  if (result.error) {
    throw new Error(`Unable to install Node.js ${requiredNodeVersion}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`Unable to install Node.js ${requiredNodeVersion}; installer exited with ${result.status}.`);
  }

  const portableNodePath = getPortableNodePath(expectedArchitecture);
  if (!fs.existsSync(portableNodePath)) {
    throw new Error(`Node.js ${requiredNodeVersion} installer did not create ${portableNodePath}.`);
  }
}

function findSystemNodeExecutables() {
  const commands =
    process.platform === "win32"
      ? [["where.exe", ["node"]]]
      : [["sh", ["-lc", "command -v node"]]];
  const candidates = new Set([process.execPath]);

  for (const [command, commandArgs] of commands) {
    const result = spawnSync(command, commandArgs, { encoding: "utf8", windowsHide: true });
    if (result.status === 0) {
      for (const line of result.stdout.split(/\r?\n/)) {
        const candidate = line.trim();
        if (candidate) {
          candidates.add(candidate);
        }
      }
    }
  }

  return [...candidates];
}

function validateNodeExecutable(nodeExe, source, expectedArchitecture) {
  if (!nodeExe || !fs.existsSync(nodeExe)) {
    return null;
  }

  const executableArchitecture = getWindowsExecutableArchitecture(nodeExe);
  if (executableArchitecture && executableArchitecture !== expectedArchitecture) {
    console.warn(
      `[workspace-node] Ignoring ${source} Node.js at ${nodeExe} because the executable is ${executableArchitecture} but this Windows host requires ${expectedArchitecture}.`,
    );
    return null;
  }

  const result = spawnSync(
    nodeExe,
    ["-p", "JSON.stringify({ version: process.versions.node, arch: process.arch })"],
    { encoding: "utf8", windowsHide: true },
  );

  if (result.error) {
    console.warn(`[workspace-node] Ignoring ${source} Node.js at ${nodeExe} because it could not be started: ${result.error.message}`);
    return null;
  }

  if (result.status !== 0) {
    return null;
  }

  let metadata;
  try {
    metadata = JSON.parse(result.stdout.trim());
  } catch {
    return null;
  }

  if (!isSupportedNodeVersion(metadata.version) || metadata.arch !== expectedArchitecture) {
    return null;
  }

  return {
    source,
    version: metadata.version,
    arch: metadata.arch,
    nodeExe,
    nodeHome: path.dirname(nodeExe),
  };
}

function getWindowsExecutableArchitecture(exePath) {
  if (process.platform !== "win32") {
    return "";
  }

  let fd;
  try {
    fd = fs.openSync(exePath, "r");
    const dosHeader = Buffer.alloc(64);
    if (fs.readSync(fd, dosHeader, 0, dosHeader.length, 0) < dosHeader.length) {
      return "";
    }

    if (dosHeader.readUInt16LE(0) !== 0x5a4d) {
      return "";
    }

    const peOffset = dosHeader.readInt32LE(0x3c);
    if (peOffset < 0) {
      return "";
    }

    const peHeader = Buffer.alloc(6);
    if (fs.readSync(fd, peHeader, 0, peHeader.length, peOffset) < peHeader.length) {
      return "";
    }

    if (peHeader.readUInt32LE(0) !== 0x00004550) {
      return "";
    }

    switch (peHeader.readUInt16LE(4)) {
      case 0x8664:
        return "x64";
      case 0xaa64:
        return "arm64";
      case 0x014c:
        return "x86";
      case 0x01c4:
        return "arm";
      default:
        return "";
    }
  } catch {
    return "";
  } finally {
    if (fd !== undefined) {
      fs.closeSync(fd);
    }
  }
}

function isSupportedNodeVersion(versionText) {
  const [major, minor, patch] = String(versionText)
    .split(".")
    .map((part) => Number.parseInt(part, 10));

  return (
    major === requiredNodeMajor &&
    minor === requiredNodeMinor &&
    Number.isFinite(patch) &&
    patch >= 0
  );
}

function getExpectedArchitecture() {
  if (process.platform === "win32") {
    return getWindowsHostArchitecture();
  }

  return normalizeArchitecture(process.arch);
}

function getWindowsHostArchitecture() {
  if (process.env.PROCESSOR_ARCHITEW6432?.trim()) {
    return normalizeArchitecture(process.env.PROCESSOR_ARCHITEW6432);
  }

  const processorIdentifier = String(process.env.PROCESSOR_IDENTIFIER || "").toLowerCase();
  if (processorIdentifier.includes("arm") || processorIdentifier.includes("aarch64")) {
    return "arm64";
  }

  return normalizeArchitecture(process.env.PROCESSOR_ARCHITECTURE || process.arch);
}

function normalizeArchitecture(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "amd64") return "x64";
  if (normalized === "aarch64") return "arm64";
  return normalized || process.arch;
}

function resolveNodeArguments(rawArgs) {
  if (rawArgs[0] === "--npm") {
    return [resolveNpmCliPath(), ...rawArgs.slice(1)];
  }

  return rawArgs.map((arg, index) => (index === 0 ? resolveScriptArgument(arg) : arg));
}

function resolveNpmCliPath() {
  const npmCliPath = path.join(runtime.nodeHome, "node_modules", "npm", "bin", "npm-cli.js");
  if (!fs.existsSync(npmCliPath)) {
    throw new Error(`Bundled npm CLI not found for Node.js ${runtime.version}: ${npmCliPath}`);
  }

  return npmCliPath;
}

function resolveScriptArgument(arg) {
  if (!arg || arg.startsWith("-")) {
    return arg;
  }

  const directPath = path.resolve(process.cwd(), arg);
  if (fs.existsSync(directPath)) {
    return directPath;
  }

  const normalized = arg.replace(/\\/g, "/");
  const nodeModulesIndex = normalized.lastIndexOf("node_modules/");
  if (nodeModulesIndex >= 0) {
    const moduleRelativePath = normalized.slice(nodeModulesIndex + "node_modules/".length);
    return resolveExistingPath([
      path.join(process.cwd(), "node_modules", moduleRelativePath),
      path.join(workspaceRoot, "node_modules", moduleRelativePath),
      path.join(installRoot, path.basename(process.cwd()), "node_modules", moduleRelativePath),
      path.join(installRoot, "node_modules", moduleRelativePath),
    ]);
  }

  const workspacePath = path.resolve(workspaceRoot, arg);
  if (fs.existsSync(workspacePath)) {
    return workspacePath;
  }

  return arg;
}

function resolveExistingPath(candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function buildEnvironment() {
  const pathEntries = [
    runtime.nodeHome,
    path.join(process.cwd(), "node_modules", ".bin"),
    path.join(installRoot, path.basename(process.cwd()), "node_modules", ".bin"),
    path.join(installRoot, "backend", "node_modules", ".bin"),
    path.join(installRoot, "frontend", "node_modules", ".bin"),
    path.join(installRoot, "shared", "node_modules", ".bin"),
    path.join(installRoot, "node_modules", ".bin"),
    path.join(workspaceRoot, "node_modules", ".bin"),
    process.env.Path || process.env.PATH,
  ].filter(Boolean);
  const nodePathEntries = [
    path.join(process.cwd(), "node_modules"),
    path.join(workspaceRoot, "node_modules"),
    path.join(installRoot, path.basename(process.cwd()), "node_modules"),
    path.join(installRoot, "backend", "node_modules"),
    path.join(installRoot, "frontend", "node_modules"),
    path.join(installRoot, "shared", "node_modules"),
    path.join(installRoot, "node_modules"),
    process.env.NODE_PATH,
  ].filter(Boolean);

  return {
    ...process.env,
    SEM_APP_WORKSPACE_ROOT: workspaceRoot,
    SEM_WORKSPACE_NODE_EXE: runtime.nodeExe,
    PUMP_WORKSPACE_ROOT: workspaceRoot,
    BUNDLE_WORKSPACE_ROOT: workspaceRoot,
    NO_UPDATE_NOTIFIER: "1",
    NODE_PATH: [...new Set(nodePathEntries)].join(path.delimiter),
    NODE_OPTIONS: mergeNodeOptions(process.env.NODE_OPTIONS),
    npm_config_scripts_prepend_node_path: "true",
    npm_node_execpath: runtime.nodeExe,
    Path: [...new Set(pathEntries)].join(path.delimiter),
    PATH: [...new Set(pathEntries)].join(path.delimiter),
    npm_config_update_notifier: "false",
  };
}

function mergeNodeOptions(current) {
  const values = String(current || "")
    .split(/\s+/)
    .filter(Boolean);
  for (const option of ["--preserve-symlinks-main", "--preserve-symlinks"]) {
    if (!values.includes(option)) {
      values.push(option);
    }
  }
  return values.join(" ");
}
