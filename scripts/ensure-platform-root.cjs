const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const platformRoot = path.join(repoRoot, "common-platform");
const blockedDirectoryNames = new Set([".git", "node_modules", "dist", "build", "output", "coverage", ".vite", ".cache", ".turbo", ".next", "out"]);
const requiredPlatformRelativePaths = [
  "package.json",
  path.join("packages", "platform-shared", "package.json"),
  path.join("packages", "platform-backend", "package.json"),
  path.join("packages", "platform-frontend", "package.json"),
];

function realpathSafe(targetPath) {
  try {
    return fs.realpathSync.native(targetPath);
  } catch {
    return null;
  }
}

function isValidPlatformRoot(targetPath) {
  return getMissingPlatformPaths(targetPath).length === 0;
}

function getMissingPlatformPaths(targetPath) {
  return requiredPlatformRelativePaths.filter((relativePath) => !fs.existsSync(path.join(targetPath, relativePath)));
}

function isEmptyDirectory(targetPath) {
  try {
    return fs.statSync(targetPath).isDirectory() && fs.readdirSync(targetPath).length === 0;
  } catch {
    return false;
  }
}

function isDisposableInstallScaffold(targetPath) {
  const allowedScaffoldDirectories = new Set([
    "packages",
    "packages/platform-backend",
    "packages/platform-frontend",
    "packages/platform-shared",
  ]);

  try {
    const entries = collectNonDependencyEntries(targetPath);
    return entries.every((entry) => entry.isDirectory && allowedScaffoldDirectories.has(entry.relativePath));
  } catch {
    return false;
  }
}

function collectNonDependencyEntries(rootPath, currentPath = rootPath, entries = []) {
  for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
    if (entry.isDirectory() && blockedDirectoryNames.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(currentPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, "/");
    entries.push({ relativePath, isDirectory: entry.isDirectory() });

    if (entry.isDirectory()) {
      collectNonDependencyEntries(rootPath, fullPath, entries);
    }
  }

  return entries;
}

function getPlatformSourceCandidates() {
  const candidates = [
    ["SEM_PLATFORM_SOURCE_ROOT", process.env.SEM_PLATFORM_SOURCE_ROOT?.trim()],
    ["sibling", path.resolve(repoRoot, "..", "sem_sw_common_web_platform")],
    ["sibling-app-compat", path.resolve(repoRoot, "..", "sem_sw_common_web_platform_app_compat")],
  ].filter(([, candidate]) => Boolean(candidate));

  const seen = new Set();
  return candidates.filter(([, candidate]) => {
    const normalized = path.resolve(candidate).toLowerCase();
    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function inspectPlatformSourceCandidate(label, candidatePath) {
  const resolvedPath = path.resolve(candidatePath);
  const exists = fs.existsSync(resolvedPath);
  const missingPaths = exists ? getMissingPlatformPaths(resolvedPath) : requiredPlatformRelativePaths;

  return {
    label,
    path: resolvedPath,
    exists,
    valid: exists && missingPaths.length === 0,
    missingPaths,
    dirtyOutput: exists ? getPlatformStatusOutput(resolvedPath) : null,
  };
}

function resolvePlatformSourceRoot() {
  for (const [, candidate] of getPlatformSourceCandidates()) {
    if (isValidPlatformRoot(candidate)) {
      return path.resolve(candidate);
    }
  }

  return null;
}

function describePlatformSourceCandidates() {
  return getPlatformSourceCandidates().map(([label, candidate]) => inspectPlatformSourceCandidate(label, candidate));
}

function getPlatformStatusOutput(targetPath) {
  const gitFilePath = path.join(targetPath, ".git");

  if (fs.existsSync(gitFilePath) && fs.statSync(gitFilePath).isDirectory()) {
    try {
      return execFileSync("git", ["status", "--porcelain"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        cwd: targetPath,
      }).trim();
    } catch {
      return null;
    }
  }

  if (fs.existsSync(gitFilePath) && fs.statSync(gitFilePath).isFile()) {
    const gitFileContent = fs.readFileSync(gitFilePath, "utf8");
    const match = gitFileContent.match(/gitdir:\s*(.+)\s*$/m);
    if (match) {
      const gitDirPath = path.resolve(targetPath, match[1].trim());
      try {
        return execFileSync("git", ["--git-dir", gitDirPath, "--work-tree", targetPath, "status", "--porcelain"], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim();
      } catch {
        return null;
      }
    }
  }

  try {
    return execFileSync("git", ["status", "--porcelain", "--", path.relative(repoRoot, targetPath)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      cwd: repoRoot,
    }).trim();
  } catch {
    return null;
  }
}

function removePlatformRoot(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function collectEntries(rootPath, currentPath = rootPath, entries = new Map()) {
  for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
    if (entry.isDirectory() && blockedDirectoryNames.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(currentPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      collectEntries(rootPath, fullPath, entries);
      continue;
    }

    if (entry.isFile()) {
      const stats = fs.statSync(fullPath);
      entries.set(relativePath, { fullPath, size: stats.size });
    }
  }

  return entries;
}

function filesMatch(leftFile, rightFile) {
  if (leftFile.size !== rightFile.size) {
    return false;
  }

  return fs.readFileSync(leftFile.fullPath).equals(fs.readFileSync(rightFile.fullPath));
}

function comparePlatformTrees(leftRoot, rightRoot) {
  const leftEntries = collectEntries(leftRoot);
  const rightEntries = collectEntries(rightRoot);
  const onlyLeft = [];
  const onlyRight = [];
  const different = [];

  for (const [relativePath, leftFile] of leftEntries) {
    const rightFile = rightEntries.get(relativePath);
    if (!rightFile) {
      onlyLeft.push(relativePath);
      continue;
    }

    if (!filesMatch(leftFile, rightFile)) {
      different.push(relativePath);
    }
  }

  for (const relativePath of rightEntries.keys()) {
    if (!leftEntries.has(relativePath)) {
      onlyRight.push(relativePath);
    }
  }

  return {
    onlyLeft,
    onlyRight,
    different,
  };
}

function describePlatformState() {
  const sourceRoot = resolvePlatformSourceRoot();
  const sourceCandidates = describePlatformSourceCandidates();
  const currentRealPath = realpathSafe(platformRoot);
  const sourceRealPath = sourceRoot ? realpathSafe(sourceRoot) || sourceRoot : null;
  const dirtyOutput = fs.existsSync(platformRoot) && isValidPlatformRoot(platformRoot) ? getPlatformStatusOutput(platformRoot) : null;
  const comparison =
    sourceRoot && fs.existsSync(platformRoot) && isValidPlatformRoot(platformRoot) && (!currentRealPath || currentRealPath !== sourceRealPath)
      ? comparePlatformTrees(platformRoot, sourceRoot)
      : null;

  return {
    platformRoot,
    sourceRoot,
    sourceCandidates,
    currentRealPath,
    linkedToSource: Boolean(currentRealPath && sourceRealPath && currentRealPath === sourceRealPath),
    dirtyOutput,
    comparison,
  };
}

function ensurePlatformRoot() {
  if (isValidPlatformRoot(platformRoot)) {
    return {
      status: "present",
      platformRoot,
      sourceRoot: realpathSafe(platformRoot) || platformRoot,
    };
  }

  const sourceRoot = resolvePlatformSourceRoot();
  if (!sourceRoot) {
    return {
      status: "missing-source",
      platformRoot,
      sourceRoot: null,
      sourceCandidates: describePlatformSourceCandidates(),
    };
  }

  if (fs.existsSync(platformRoot)) {
    if (isEmptyDirectory(platformRoot) || isDisposableInstallScaffold(platformRoot)) {
      removePlatformRoot(platformRoot);
      fs.symlinkSync(sourceRoot, platformRoot, process.platform === "win32" ? "junction" : "dir");
      return {
        status: "linked",
        platformRoot,
        sourceRoot,
      };
    }

    return {
      status: "blocked",
      platformRoot,
      sourceRoot,
    };
  }

  fs.symlinkSync(sourceRoot, platformRoot, process.platform === "win32" ? "junction" : "dir");
  return {
    status: "linked",
    platformRoot,
    sourceRoot,
  };
}

function adoptPlatformRoot() {
  const sourceRoot = resolvePlatformSourceRoot();
  if (!sourceRoot) {
    return {
      status: "missing-source",
      platformRoot,
      sourceRoot: null,
      sourceCandidates: describePlatformSourceCandidates(),
    };
  }

  if (!fs.existsSync(platformRoot)) {
    fs.symlinkSync(sourceRoot, platformRoot, process.platform === "win32" ? "junction" : "dir");
    return {
      status: "linked",
      platformRoot,
      sourceRoot,
    };
  }

  const currentRealPath = realpathSafe(platformRoot);
  const sourceRealPath = realpathSafe(sourceRoot) || sourceRoot;
  if (currentRealPath && currentRealPath === sourceRealPath) {
    return {
      status: "present",
      platformRoot,
      sourceRoot,
    };
  }

  if (!isValidPlatformRoot(platformRoot)) {
    if (isEmptyDirectory(platformRoot) || isDisposableInstallScaffold(platformRoot)) {
      removePlatformRoot(platformRoot);
      fs.symlinkSync(sourceRoot, platformRoot, process.platform === "win32" ? "junction" : "dir");
      return {
        status: "linked",
        platformRoot,
        sourceRoot,
      };
    }

    return {
      status: "blocked",
      platformRoot,
      sourceRoot,
    };
  }

  const statusOutput = getPlatformStatusOutput(platformRoot);
  if (statusOutput) {
    return {
      status: "dirty",
      platformRoot,
      sourceRoot,
      details: statusOutput,
    };
  }

  removePlatformRoot(platformRoot);
  fs.symlinkSync(sourceRoot, platformRoot, process.platform === "win32" ? "junction" : "dir");
  return {
    status: "linked",
    platformRoot,
    sourceRoot,
  };
}

function formatCandidateDiagnostics(candidates = []) {
  if (candidates.length === 0) {
    return ["[platform] no platform source candidates were configured or discovered."];
  }

  const lines = [];
  for (const candidate of candidates) {
    if (!candidate.exists) {
      lines.push(`[platform] ${candidate.label}: ${candidate.path} (missing)`);
      continue;
    }

    if (candidate.valid) {
      lines.push(`[platform] ${candidate.label}: ${candidate.path} (valid)`);
      continue;
    }

    lines.push(`[platform] ${candidate.label}: ${candidate.path} (invalid; missing ${candidate.missingPaths.join(", ")})`);

    if (candidate.dirtyOutput) {
      const deletedCount = candidate.dirtyOutput
        .split(/\r?\n/)
        .filter((line) => /^ ?D /.test(line) || /^D  /.test(line))
        .length;
      if (deletedCount > 0) {
        lines.push(`[platform] ${candidate.label}: git status reports ${deletedCount} deleted tracked file(s). Restore or checkout the platform worktree before linking.`);
      }
    }
  }

  return lines;
}

if (require.main === module) {
  if (process.argv.includes("--status")) {
    const result = describePlatformState();
    console.log(`[platform] root: ${result.platformRoot}`);
    console.log(`[platform] source: ${result.sourceRoot || "(not found)"}`);
    console.log(`[platform] current real path: ${result.currentRealPath || "(missing)"}`);
    console.log(`[platform] linked to source: ${result.linkedToSource ? "yes" : "no"}`);
    console.log(`[platform] dirty: ${result.dirtyOutput ? "yes" : "no"}`);

    if (result.dirtyOutput) {
      console.log(result.dirtyOutput);
    }

    for (const line of formatCandidateDiagnostics(result.sourceCandidates)) {
      console.log(line);
    }

    if (result.comparison) {
      console.log(
        `[platform] diff summary: only-here=${result.comparison.onlyLeft.length}, only-source=${result.comparison.onlyRight.length}, changed=${result.comparison.different.length}`,
      );

      for (const label of [
        ["only-here", result.comparison.onlyLeft],
        ["only-source", result.comparison.onlyRight],
        ["changed", result.comparison.different],
      ]) {
        const [name, values] = label;
        if (values.length > 0) {
          console.log(`[platform] sample ${name}:`);
          for (const value of values.slice(0, 10)) {
            console.log(`  ${value}`);
          }
        }
      }
    }

    process.exit(0);
  }

  const command = process.argv.includes("--adopt") ? adoptPlatformRoot : ensurePlatformRoot;
  const result = command();

  if (result.status === "linked") {
    console.log(`[platform] linked ${result.platformRoot} -> ${result.sourceRoot}`);
  } else if (result.status === "present") {
    console.log(`[platform] using existing ${result.sourceRoot}`);
  } else if (result.status === "dirty") {
    console.warn(`[platform] ${result.platformRoot} has uncommitted changes; refusing to replace it with a junction.`);
    console.warn(result.details);
    process.exitCode = 1;
  } else if (result.status === "blocked") {
    console.warn(`[platform] ${result.platformRoot} exists but is not a valid platform workspace; leaving it unchanged.`);
    process.exitCode = 1;
  } else if (result.status === "missing-source") {
    for (const line of formatCandidateDiagnostics(result.sourceCandidates)) {
      console.warn(line);
    }
    console.warn("[platform] no reusable platform source is currently valid. Set SEM_PLATFORM_SOURCE_ROOT or fix the sibling sem_sw_common_web_platform checkout.");
    process.exitCode = 1;
  }
}

module.exports = {
  adoptPlatformRoot,
  comparePlatformTrees,
  describePlatformState,
  ensurePlatformRoot,
  describePlatformSourceCandidates,
  resolvePlatformSourceRoot,
};
