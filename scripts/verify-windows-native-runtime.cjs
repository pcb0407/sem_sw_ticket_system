"use strict";

const { scrypt } = require("node:crypto");

const failures = [];
const warnings = [];

if (process.platform !== "win32") {
  warnings.push(`running on ${process.platform}; Windows native runtime checks are informational only`);
}

if (!new Set(["x64", "arm64"]).has(process.arch)) {
  failures.push(`unsupported Node architecture: ${process.arch}`);
}

const sqlJs = canLoad("sql.js");
if (!sqlJs.ok) {
  failures.push(`sql.js fallback is not loadable: ${sqlJs.error}`);
}

const argon2 = canLoad("argon2");
if (!argon2.ok && typeof scrypt !== "function") {
  failures.push(`argon2 is not loadable and node:crypto.scrypt is unavailable: ${argon2.error}`);
} else if (!argon2.ok) {
  warnings.push(`argon2 is not loadable; platform scrypt fallback must be used: ${argon2.error}`);
}

const sqliteDrivers = [
  ["better-sqlite3", canLoad("better-sqlite3")],
  ["sqlite3", canLoad("sqlite3")],
];
const loadableSqliteDrivers = sqliteDrivers.filter(([, result]) => result.ok).map(([name]) => name);
if (loadableSqliteDrivers.length === 0) {
  warnings.push("native sqlite drivers are not loadable; sql.js fallback must be used for local sqlite runtime");
}

console.log(`[windows-native-runtime] platform=${process.platform} arch=${process.arch} node=${process.version}`);
console.log(`[windows-native-runtime] sql.js=${sqlJs.ok ? "ok" : "missing"}`);
console.log(`[windows-native-runtime] argon2=${argon2.ok ? "ok" : "fallback"}`);
console.log(`[windows-native-runtime] native sqlite=${loadableSqliteDrivers.join(", ") || "fallback"}`);

for (const warning of warnings) {
  console.warn(`[windows-native-runtime] warning: ${warning}`);
}

if (failures.length > 0) {
  console.error("[windows-native-runtime] Verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

function canLoad(packageName) {
  try {
    require(packageName);
    return { ok: true, error: "" };
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
}
