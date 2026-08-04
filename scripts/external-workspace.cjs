const fs = require("node:fs");
const path = require("node:path");
const { resolveLocalProjectRoot } = require("./local-paths.cjs");

const repoRoot = path.resolve(__dirname, "..");
const projectName = path.basename(repoRoot);
const nodeMajor = process.versions.node.split(".")[0];
const layoutName = `${process.platform}-${process.arch}-node${nodeMajor}`;
const externalProjectRoot = resolveLocalProjectRoot(repoRoot);
const externalRoot = path.join(externalProjectRoot, layoutName);
const workspaceRoot = path.join(externalRoot, "workspace");
const cacheRoot = path.join(externalRoot, "cache");
const npmCacheRoot = path.join(cacheRoot, "npm");
const activeFlagName = "SEM_EXTERNAL_WORKSPACE_ACTIVE";
const platformRoot = path.join(repoRoot, "common-platform");

const blockedDirectoryNames = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "out",
  ".vite",
  ".turbo",
  ".cache",
  "coverage",
  "output",
]);

function ensureDirectory(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function removePath(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function ensureJunction(linkPath, targetPath) {
  ensureDirectory(path.dirname(linkPath));
  removePath(linkPath);
  fs.symlinkSync(targetPath, linkPath, "junction");
}

function isBlockedPath(sourcePath) {
  const relativePath = path.relative(repoRoot, sourcePath);
  if (!relativePath || relativePath === "") {
    return false;
  }

  const pathParts = relativePath.split(path.sep);
  if (pathParts[0] === "common-platform") {
    return true;
  }

  if (pathParts.some((part) => blockedDirectoryNames.has(part))) {
    return true;
  }

  if (relativePath === path.join("backend", "data", "platform.sqlite")) {
    return true;
  }

  const leafName = path.basename(sourcePath);
  if (/\.tsbuildinfo$/i.test(leafName)) {
    return true;
  }

  return false;
}

function writeExternalNpmRc() {
  ensureDirectory(workspaceRoot);
  ensureDirectory(npmCacheRoot);

  const npmRcPath = path.join(workspaceRoot, ".npmrc");
  const npmRcContent = [
    `cache=${npmCacheRoot}`,
    "audit=false",
    "fund=false",
    "update-notifier=false",
    "",
  ].join("\n");

  fs.writeFileSync(npmRcPath, npmRcContent, "utf8");
}

function prepareExternalWorkspace() {
  ensureDirectory(externalRoot);
  ensureDirectory(workspaceRoot);

  removePath(path.join(workspaceRoot, "common-platform"));

  fs.cpSync(repoRoot, workspaceRoot, {
    recursive: true,
    force: true,
    filter: (sourcePath) => !isBlockedPath(sourcePath),
  });

  if (fs.existsSync(platformRoot)) {
    ensureJunction(path.join(workspaceRoot, "common-platform"), platformRoot);
  }

  writeExternalNpmRc();
}

module.exports = {
  activeFlagName,
  cacheRoot,
  externalProjectRoot,
  externalRoot,
  npmCacheRoot,
  prepareExternalWorkspace,
  projectName,
  repoRoot,
  workspaceRoot,
};
