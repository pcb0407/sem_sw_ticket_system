// Ensures the common platform submodule is installed and built so the bundle
// workspaces (@ticket-system/backend, @ticket-system/shared, @ticket-system/frontend) can resolve the file: deps.
//
// Builds the platform packages from the common-platform workspace root so they share
// one consistent node_modules layout.
// Idempotent: skips work when dist files are present and the source hash for
// each package hasn't changed since the last successful build.

const { execFileSync } = require("node:child_process");
const { cpSync, existsSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync, mkdirSync, readdirSync, statSync, renameSync } = require("node:fs");
const { join, relative, resolve } = require("node:path");
const { createHash } = require("node:crypto");
const { ensurePlatformRoot } = require("./ensure-platform-root.cjs");
const { resolveLocalDevConfig } = require("./local-dev-defaults.cjs");
const { resolveLocalBuildOutputBaseRoot, resolveLocalDependencyBaseRoot } = require("./local-paths.cjs");

const repoRoot = resolve(process.env.SEM_APP_WORKSPACE_ROOT || process.env.TICKET_SYSTEM_WORKSPACE_ROOT || process.env.INIT_CWD || resolve(__dirname, ".."));
const platformRoot = join(repoRoot, "common-platform");
const sourceSharedRoot = join(platformRoot, "packages", "platform-shared");
const sourceBackendRoot = join(platformRoot, "packages", "platform-backend");
const sourceFrontendRoot = join(platformRoot, "packages", "platform-frontend");
const nodeMajor = process.versions.node.split(".")[0];
const layoutName = `${process.platform}-${process.arch}-node${nodeMajor}`;
const localDevConfig = resolveLocalDevConfig(repoRoot);
const activeExternalInstallRoot = resolveActiveExternalInstallRoot();
const configuredDependencyBaseRoot = resolveLocalDependencyBaseRoot(repoRoot, localDevConfig);
const configuredOutputBaseRoot = resolveLocalBuildOutputBaseRoot(repoRoot, localDevConfig);
const externalInstallRoot = activeExternalInstallRoot || join(configuredDependencyBaseRoot, layoutName, "root");
const externalDependencyBaseRoot = activeExternalInstallRoot ? resolve(externalInstallRoot, "..", "..") : configuredDependencyBaseRoot;
const externalOutputBaseRoot = activeExternalInstallRoot ? join(externalDependencyBaseRoot, "output") : configuredOutputBaseRoot;
const platformInstallRoot = join(externalInstallRoot, "common-platform");
const buildSharedRoot = join(platformInstallRoot, "packages", "platform-shared");
const buildBackendRoot = join(platformInstallRoot, "packages", "platform-backend");
const buildFrontendRoot = join(platformInstallRoot, "packages", "platform-frontend");
const platformCopyBlockedNames = new Set([".git", ".vscode", "node_modules", "dist", "build", "output", "coverage", ".vite", ".cache", ".turbo", ".next", "out"]);
const lockedPathErrorCodes = new Set(["EACCES", "EBUSY", "ENOTEMPTY", "EPERM", "UNKNOWN"]);

ensurePlatformRoot();

if (!existsSync(platformRoot) || !existsSync(join(platformRoot, "package.json"))) {
  console.warn(
    "[bundle postinstall] platform workspace is missing; skipping. Run 'npm run platform:link' or set SEM_PLATFORM_SOURCE_ROOT, otherwise init ./common-platform.",
  );
  process.exit(0);
}

function resolveActiveExternalInstallRoot() {
  if (process.env.CODEX_EXTERNAL_WORKSPACE_ACTIVE !== "1") {
    return "";
  }

  const cwd = resolve(process.cwd());
  if (!existsSync(join(cwd, "package.json")) || !existsSync(join(cwd, "scripts", "install-platform.cjs"))) {
    return "";
  }

  return cwd;
}

ensurePlatformInstallRoot();

if (!existsSync(platformInstallRoot) || !existsSync(join(platformInstallRoot, "package.json"))) {
  throw new Error("[bundle postinstall] external platform workspace could not be prepared.");
}

const stampDir = join(externalOutputBaseRoot, layoutName, ".bundle");
const nodeHome = resolve(process.execPath, "..");
const npmCli = join(nodeHome, "node_modules", "npm", "bin", "npm-cli.js");
const skipSqliteRebuild = process.env.TICKET_SYSTEM_FORCE_SQLITE_REBUILD !== "1";

function hasRequiredPlatformDependencies() {
  const requiredPaths = [
    join(platformInstallRoot, "package.json"),
    join(platformInstallRoot, "package-lock.json"),
    join(platformInstallRoot, "node_modules", "typescript", "bin", "tsc"),
    join(platformInstallRoot, "node_modules", "typescript", "lib", "lib.es2022.d.ts"),
    join(platformInstallRoot, "node_modules", "@types", "node", "package.json"),
  ];

  return requiredPaths.every((filePath) => existsSync(filePath));
}

function canLoadSqlite3(cwd) {
  try {
    execFileSync(process.execPath, ["-e", 'require("sqlite3")'], { cwd, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function runNpm(args, options) {
  if (!existsSync(npmCli)) {
    throw new Error(`Bundled npm CLI not found next to Node runtime: ${npmCli}`);
  }

  execFileSync(process.execPath, [npmCli, ...args], options);
}

function resolvePlatformTool(packageRoot, packageName, toolRelativePath) {
  const candidates = [
    join(platformInstallRoot, "node_modules", packageName, ...toolRelativePath),
    join(packageRoot, "node_modules", packageName, ...toolRelativePath),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`[bundle postinstall] Unable to find ${packageName}/${toolRelativePath.join("/")}`);
}

function getTypeScriptMajorVersion(tscCli, options) {
  try {
    const versionOutput = execFileSync(process.execPath, [tscCli, "--version"], {
      cwd: platformInstallRoot,
      env: options?.env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const match = /Version\s+(\d+)\./.exec(versionOutput);
    return match ? Number.parseInt(match[1], 10) : 0;
  } catch {
    return 0;
  }
}

function runTypeScriptBuild(packageRoot, tsconfigName, options) {
  const tscCli = resolvePlatformTool(packageRoot, "typescript", ["bin", "tsc"]);
  const ignoreDeprecationsArgs = getTypeScriptMajorVersion(tscCli, options) >= 6 ? ["--ignoreDeprecations", "6.0"] : [];
  execFileSync(process.execPath, [tscCli, "--project", tsconfigName, "--pretty", "false", ...ignoreDeprecationsArgs], {
    ...options,
    cwd: packageRoot,
  });
}

function runPlatformPackageBuild({ name, buildRoot }, options) {
  if (name === "@sem/platform-shared") {
    runTypeScriptBuild(buildRoot, "tsconfig.cjs.json", options);
    runTypeScriptBuild(buildRoot, "tsconfig.esm.json", options);
    execFileSync(process.execPath, [join(buildRoot, "scripts", "write-esm-pkg.cjs")], {
      ...options,
      cwd: buildRoot,
    });
    return;
  }

  if (name === "@sem/platform-backend" || name === "@sem/platform-frontend") {
    runTypeScriptBuild(buildRoot, "tsconfig.build.json", options);
    return;
  }

  throw new Error(`[bundle postinstall] Unsupported platform package build: ${name}`);
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function getStalePath(targetPath) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  let candidate = `${targetPath}.stale-${stamp}`;
  let suffix = 0;
  while (existsSync(candidate)) {
    suffix += 1;
    candidate = `${targetPath}.stale-${stamp}-${suffix}`;
  }
  return candidate;
}

function removePathWithRetry(targetPath) {
  const deadline = Date.now() + 15_000;

  while (true) {
    try {
      rmSync(targetPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      return;
    } catch (error) {
      if (!lockedPathErrorCodes.has(error?.code)) {
        throw error;
      }

      if (Date.now() >= deadline) {
        if (existsSync(targetPath)) {
          const stalePath = getStalePath(targetPath);
          try {
            renameSync(targetPath, stalePath);
            console.warn(`[bundle postinstall] Moved locked path aside: ${targetPath} -> ${stalePath}`);
            return;
          } catch (renameError) {
            throw renameError;
          }
        }

        throw error;
      }

      sleep(100);
    }
  }
}

function copyPathWithRetry(sourcePath, targetPath, options) {
  const deadline = Date.now() + 15_000;

  while (true) {
    try {
      cpSync(sourcePath, targetPath, options);
      return;
    } catch (error) {
      if (!lockedPathErrorCodes.has(error?.code) || Date.now() >= deadline) {
        throw error;
      }
      sleep(100);
    }
  }
}

function syncBuiltDistArtifacts({ packageName, buildRoot, outputArea }) {
  const sourceDist = join(externalOutputBaseRoot, layoutName, "platform", outputArea, "dist");
  if (!existsSync(sourceDist)) {
    throw new Error(`[bundle postinstall] Missing built dist output: ${sourceDist}`);
  }

  const packageShortName = packageName.split("/").at(-1);
  const targets = [
    join(buildRoot, "dist"),
    join(externalInstallRoot, "node_modules", "@sem", packageShortName, "dist"),
  ];

  for (const targetDist of targets) {
    if (existsSync(targetDist)) {
      removePathWithRetry(targetDist);
    }

    mkdirSync(resolve(targetDist, ".."), { recursive: true });
    copyPathWithRetry(sourceDist, targetDist, {
      recursive: true,
      force: true,
      dereference: true,
    });
  }
}

function normalizePathForCompare(value) {
  return resolve(value).replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();
}

function realpathSafe(targetPath) {
  try {
    return realpathSync.native(targetPath);
  } catch {
    return "";
  }
}

function isSameRealPath(leftPath, rightPath) {
  const leftRealPath = realpathSafe(leftPath);
  const rightRealPath = realpathSafe(rightPath);
  return Boolean(leftRealPath && rightRealPath && normalizePathForCompare(leftRealPath) === normalizePathForCompare(rightRealPath));
}

function ensureJunction(linkPath, targetPath) {
  if (isSameRealPath(linkPath, targetPath)) {
    return;
  }

  mkdirSync(resolve(linkPath, ".."), { recursive: true });
  removePathWithRetry(linkPath);
  symlinkSync(targetPath, linkPath, process.platform === "win32" ? "junction" : "dir");
}

function ensureRepoNodeModulesJunction() {
  const targetPath = join(externalInstallRoot, "node_modules");
  if (!existsSync(targetPath)) {
    return;
  }

  ensureJunction(join(repoRoot, "node_modules"), targetPath);
}

function ensureAppNodeModuleLink(packageName, packageRoot) {
  ensureRepoNodeModulesJunction();

  const parts = packageName.split("/");
  const linkPath =
    packageName.startsWith("@") && parts.length === 2
      ? join(repoRoot, "node_modules", parts[0], parts[1])
      : join(repoRoot, "node_modules", packageName);

  ensureJunction(linkPath, packageRoot);
}

function shouldCopyPlatformPath(sourceRoot, sourcePath) {
  const relativePath = relative(sourceRoot, sourcePath);
  if (!relativePath) {
    return true;
  }

  return !relativePath.split(/[\\/]+/).some((part) => platformCopyBlockedNames.has(part));
}

function ensurePlatformInstallRoot() {
  const sourceRoot = realpathSafe(platformRoot) || platformRoot;
  if (!existsSync(join(sourceRoot, "package.json"))) {
    throw new Error(`[bundle postinstall] platform source is incomplete: ${sourceRoot}`);
  }

  if (existsSync(platformInstallRoot)) {
    try {
      removePathWithRetry(platformInstallRoot);
    } catch (error) {
      if (!lockedPathErrorCodes.has(error?.code)) {
        throw error;
      }

      console.warn(
        `[bundle postinstall] Platform install root is locked (${error.code}); continuing with in-place sync: ${platformInstallRoot}`,
      );
    }
  }

  mkdirSync(platformInstallRoot, { recursive: true });
  copyPathWithRetry(sourceRoot, platformInstallRoot, {
    recursive: true,
    force: true,
    dereference: true,
    filter: (sourcePath) => shouldCopyPlatformPath(sourceRoot, sourcePath),
  });
}

function hashSourceTree(dir) {
  const hasher = createHash("sha256");
  function walk(current) {
    for (const entry of readdirSync(current).sort()) {
      if (entry === "node_modules" || entry === "dist") continue;
      const full = join(current, entry);
      const s = statSync(full);
      if (s.isDirectory()) {
        walk(full);
      } else {
        hasher.update(full);
        hasher.update(s.mtimeMs.toString());
        hasher.update(s.size.toString());
      }
    }
  }
  walk(dir);
  return hasher.digest("hex");
}

function hashInstallInputs(paths) {
  const hasher = createHash("sha256");
  for (const filePath of paths) {
    if (!existsSync(filePath)) continue;
    hasher.update(filePath);
    hasher.update(readFileSync(filePath));
  }
  return hasher.digest("hex");
}

const installInputHash = hashInstallInputs([
  join(platformRoot, "package.json"),
  join(platformRoot, "package-lock.json"),
  join(sourceSharedRoot, "package.json"),
  join(sourceBackendRoot, "package.json"),
  join(sourceFrontendRoot, "package.json"),
]);

function ensureWorkspaceInstalled(installOpts) {
  const installStampPath = join(stampDir, "platform-install.hash");
  const cachedInstallHash = existsSync(installStampPath) ? readFileSync(installStampPath, "utf8").trim() : null;
  const nodeModulesRoot = join(platformInstallRoot, "node_modules");
  const nodeModulesReady = existsSync(nodeModulesRoot);
  const dependenciesReady = nodeModulesReady && hasRequiredPlatformDependencies();

  if (dependenciesReady && (!cachedInstallHash || cachedInstallHash === installInputHash)) {
    mkdirSync(stampDir, { recursive: true });
    writeFileSync(installStampPath, installInputHash, "utf8");
    return false;
  }

  if (nodeModulesReady && !dependenciesReady) {
    removePathWithRetry(nodeModulesRoot);
  }

  runNpm(["install", "--ignore-scripts", "--workspaces", "--include-workspace-root", "--no-audit", "--no-fund", "--loglevel=warn"], installOpts);

  if (!hasRequiredPlatformDependencies()) {
    throw new Error("[bundle postinstall] common-platform dependency install is incomplete after npm install.");
  }

  mkdirSync(stampDir, { recursive: true });
  writeFileSync(installStampPath, installInputHash, "utf8");
  return true;
}

function ensurePackageBuilt({ name, sourceRoot, buildRoot, distChecks, stampFile, outputArea }) {
  const currentHash = hashSourceTree(sourceRoot);
  const distExists = distChecks.every((p) => existsSync(p));
  const stampPath = join(stampDir, stampFile);
  const cachedHash = existsSync(stampPath) ? readFileSync(stampPath, "utf8").trim() : null;
  const backendSqliteReady = name !== "@sem/platform-backend" || skipSqliteRebuild || canLoadSqlite3(platformInstallRoot);
  const commandEnv = {
    ...process.env,
    DEV_LOCAL_NODE_MODULES_ROOT: externalDependencyBaseRoot,
    DEV_LOCAL_BUILD_OUTPUT_ROOT: externalOutputBaseRoot,
    SEM_EXTERNAL_WORKSPACE_ACTIVE: "1",
    PATH: `${nodeHome}${process.platform === "win32" ? ";" : ":"}${process.env.PATH || ""}`,
  };

  execFileSync(process.execPath, [join(repoRoot, "scripts", "ensure-local-build-output.cjs"), outputArea], {
    cwd: repoRoot,
    stdio: "inherit",
    env: commandEnv,
  });

  if (distExists && cachedHash === currentHash && backendSqliteReady) {
    ensureAppNodeModuleLink(name, buildRoot);
    console.log(`[bundle postinstall] ${name} already built (hash match).`);
    return;
  }

  console.log(`[bundle postinstall] Installing and building ${name}...`);
  const installOpts = { cwd: platformInstallRoot, stdio: "inherit", env: commandEnv };
  const buildOpts = { cwd: platformInstallRoot, stdio: "inherit", env: commandEnv };
  ensureWorkspaceInstalled(installOpts);
  const sqliteStillUnavailable = name === "@sem/platform-backend" && !skipSqliteRebuild && !canLoadSqlite3(platformInstallRoot);
  if (sqliteStillUnavailable) {
    runNpm(["rebuild", "sqlite3", "--no-audit", "--no-fund", "--loglevel=warn"], installOpts);
  }
  runPlatformPackageBuild({ name, buildRoot }, buildOpts);
  syncBuiltDistArtifacts({ packageName: name, buildRoot, outputArea });
  ensureAppNodeModuleLink(name, buildRoot);

  mkdirSync(stampDir, { recursive: true });
  writeFileSync(stampPath, hashSourceTree(sourceRoot), "utf8");
  console.log(`[bundle postinstall] ${name} built.`);
}

ensurePackageBuilt({
  name: "@sem/platform-shared",
  sourceRoot: sourceSharedRoot,
  buildRoot: buildSharedRoot,
  distChecks: [
    join(buildSharedRoot, "dist", "cjs", "index.js"),
    join(buildSharedRoot, "dist", "esm", "index.js"),
  ],
  stampFile: "platform-shared.hash",
  outputArea: "platform-shared",
});

ensurePackageBuilt({
  name: "@sem/platform-backend",
  sourceRoot: sourceBackendRoot,
  buildRoot: buildBackendRoot,
  distChecks: [join(buildBackendRoot, "dist", "index.js")],
  stampFile: "platform-backend.hash",
  outputArea: "platform-backend",
});

ensurePackageBuilt({
  name: "@sem/platform-frontend",
  sourceRoot: sourceFrontendRoot,
  buildRoot: buildFrontendRoot,
  distChecks: [join(buildFrontendRoot, "dist", "index.js")],
  stampFile: "platform-frontend.hash",
  outputArea: "platform-frontend",
});
