#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = process.cwd();

function readJson(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function normalizeTaskLabels(tasksJson) {
  const tasks = Array.isArray(tasksJson.tasks) ? tasksJson.tasks : [];
  return new Set(tasks.map((task) => task && task.label).filter(Boolean));
}

function checkLaunchAndTasks() {
  const launch = readJson('.vscode/launch.json');
  const tasks = readJson('.vscode/tasks.json');
  const labels = normalizeTaskLabels(tasks);

  const configurations = Array.isArray(launch.configurations) ? launch.configurations : [];
  assert(configurations.length > 0, 'launch.json must include at least one debug configuration.');

  const validPostTasks = new Set([
    'apphost:cleanup-apphost:docker',
    'apphost:cleanup-frontend:docker',
    'apphost:cleanup-backend-debug',
    'apphost:cleanup-backend-debug:docker'
  ]);

  for (const config of configurations) {
    assert(typeof config.postDebugTask === 'string' && config.postDebugTask.trim().length > 0,
      `Configuration "${config.name}" is missing postDebugTask.`);

    assert(validPostTasks.has(config.postDebugTask),
      `Configuration "${config.name}" uses unsupported postDebugTask "${config.postDebugTask}".`);

    assert(labels.has(config.postDebugTask),
      `Configuration "${config.name}" postDebugTask "${config.postDebugTask}" does not exist in tasks.json.`);
  }

  const compounds = Array.isArray(launch.compounds) ? launch.compounds : [];
  for (const compound of compounds) {
    assert(compound.stopAll === true,
      `Compound "${compound.name}" must set stopAll=true to avoid orphan debug sessions.`);
  }

  const cleanupDockerTask = labels.has('apphost:cleanup-apphost:docker');
  const cleanupFrontendTask = labels.has('apphost:cleanup-frontend:docker');
  assert(cleanupDockerTask, 'tasks.json must define apphost:cleanup-apphost:docker.');
  assert(cleanupFrontendTask, 'tasks.json must define apphost:cleanup-frontend:docker.');

  const allTasks = Array.isArray(tasks.tasks) ? tasks.tasks : [];
  const killEdgeTask = allTasks.find((task) => task && task.label === 'apphost:kill-edge-debug-profile');
  assert(!!killEdgeTask, 'tasks.json must define apphost:kill-edge-debug-profile.');
  assert(typeof killEdgeTask.command === 'string' && killEdgeTask.command.includes('kill-edge-debug-profile.ps1'),
    'apphost:kill-edge-debug-profile must call kill-edge-debug-profile.ps1.');
}

function checkCleanupScripts() {
  const cleanupScript = readText('common-platform/scripts/apphost/cleanup-local-debug.ps1');
  const killEdgeScript = readText('common-platform/scripts/apphost/kill-edge-debug-profile.ps1');

  const cleanupMustContain = [
    'Stop-TrackedConsoleStates',
    'Stop-EdgeProfiles',
    "kill-local-dev-target.ps1') -Target backend",
    "kill-local-dev-target.ps1') -Target frontend",
    "kill-local-dev-target.ps1') -Target backend-debug"
  ];

  for (const token of cleanupMustContain) {
    assert(cleanupScript.includes(token),
      `cleanup-local-debug.ps1 is missing required cleanup token: ${token}`);
  }

  const killEdgeMustContain = [
    "Name = 'msedge.exe'",
    'Stop-Process -Id',
    '.edge-debug-profile',
    '.edge-desktop-profile',
    '.edge-swagger-profile',
    'common-platform\\.vscode\\.edge-debug-profile',
    'common-platform\\.vscode\\.edge-desktop-profile'
  ];

  for (const token of killEdgeMustContain) {
    assert(killEdgeScript.includes(token),
      `kill-edge-debug-profile.ps1 is missing required browser cleanup token: ${token}`);
  }
}

function main() {
  checkLaunchAndTasks();
  checkCleanupScripts();
  console.log('Debug-stop auto cleanup checks passed.');
}

main();
