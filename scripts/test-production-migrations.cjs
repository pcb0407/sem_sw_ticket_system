#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(
  process.env.SEM_APP_WORKSPACE_ROOT ||
    process.env.TICKET_SYSTEM_WORKSPACE_ROOT ||
    process.env.PUMP_WORKSPACE_ROOT ||
    process.env.BUNDLE_WORKSPACE_ROOT ||
    process.env.WEB_TEMPLATE_WORKSPACE_ROOT ||
    path.resolve(__dirname, ".."),
);
const verifierPath = path.join(repoRoot, "scripts", "verify-production-migrations.cjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ticket-production-migrations-test-"));
const productionDbTypes = ["mssql", "postgres", "mysql", "mariadb"];
let passed = 0;

function writeEnv(name, values, { bom = false } = {}) {
  const filePath = path.join(tempRoot, name);
  const lines = Object.entries(values).map(([key, value]) => `${key}=${quoteEnvValue(value)}`);
  fs.writeFileSync(filePath, `${bom ? "\uFEFF" : ""}${lines.join("\n")}\n`, "utf8");
  return filePath;
}

function quoteEnvValue(value) {
  const text = String(value);
  return /[\s#"'\\]/.test(text) ? JSON.stringify(text) : text;
}

function runVerifier(args = [], env = {}) {
  return spawnSync(process.execPath, [verifierPath, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: "utf8",
    windowsHide: true,
  });
}

function expectPass(label, args, env) {
  const result = runVerifier(args, env);
  if (result.status !== 0) {
    fail(label, result);
  }
  pass(label);
}

function expectFail(label, args, expectedPattern, env) {
  const result = runVerifier(args, env);
  if (result.status === 0 || !expectedPattern.test(`${result.stdout}\n${result.stderr}`)) {
    fail(label, result);
  }
  pass(label);
}

function pass(label) {
  passed += 1;
  console.log(`[production-migrations-test] PASS ${label}`);
}

function fail(label, result) {
  console.error(`[production-migrations-test] FAIL ${label}`);
  if (result?.stdout) {
    console.error(result.stdout.trim());
  }
  if (result?.stderr) {
    console.error(result.stderr.trim());
  }
  process.exit(1);
}

try {
  for (const dbType of productionDbTypes) {
    expectPass(`process env db type ${dbType}`, [], { DB_TYPE: dbType });
    expectPass(
      `env file db type ${dbType}`,
      ["--env-file", writeEnv(`${dbType}.env`, { DB_TYPE: dbType })],
      { DB_TYPE: "" },
    );
  }

  expectPass(
    "utf8 bom env file is parsed",
    ["--env-file", writeEnv("mssql-bom.env", { DB_TYPE: "mssql" }, { bom: true })],
    { DB_TYPE: "" },
  );

  expectFail("sqlite is rejected", [], /DB_TYPE=sqlite is not acceptable/, { DB_TYPE: "sqlite" });
  expectFail("missing db type fails", [], /DB_TYPE, --db-type, or database\.type/, { DB_TYPE: "" });
  expectFail("unknown argument fails", ["--unknown"], /unknown argument: --unknown/, { DB_TYPE: "mssql" });
  expectFail(
    "disagreeing sources fail",
    ["--db-type", "postgres"],
    /production DB type sources disagree: --db-type=postgres, DB_TYPE=mysql/,
    { DB_TYPE: "mysql" },
  );
  expectFail(
    "missing env file fails",
    ["--env-file", writeEnv("invalid.env", { DB_TYPE: "mssql" }).replace(/\.env$/, "")],
    /production env file does not exist/,
    { DB_TYPE: "" },
  );

  const invalidEnvPath = path.join(tempRoot, "invalid-format.env");
  fs.writeFileSync(invalidEnvPath, "DB_TYPE\n", "utf8");
  expectFail(
    "invalid env file format is rejected",
    ["--env-file", invalidEnvPath],
    /invalid env file line 1: expected KEY=value/,
    { DB_TYPE: "" },
  );

  console.log(`[production-migrations-test] production migration verifier tests passed: ${passed}`);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
