// Marks the dist/esm folder as ESM while the package root stays CommonJS.
const fs = require("node:fs");
const path = require("node:path");

const target = path.resolve(__dirname, "..", "dist", "esm", "package.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify({ type: "module" }, null, 2) + "\n");
console.log("Wrote", target);
