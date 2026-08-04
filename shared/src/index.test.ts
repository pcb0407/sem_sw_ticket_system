import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

describe("shared package exports", () => {
  it("does not export the removed sample contract", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(path.join(currentDir, "index.ts"), "utf-8");

    expect(source).not.toContain("ticket-system");
  });
});
