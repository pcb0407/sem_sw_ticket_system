import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

describe("App navigation", () => {
  it("does not include the removed sample route", () => {
    const source = readFileSync(path.join(currentDir, "App.tsx"), "utf-8");
    const removedLabel = ["Template", "Records"].join(" ");
    const removedPath = ["/overview", "ticket-systems"].join("/");

    expect(source).not.toContain(removedLabel);
    expect(source).not.toContain(removedPath);
  });

  it("contains ticket request navigation entries", () => {
    const source = readFileSync(path.join(currentDir, "App.tsx"), "utf-8");

    expect(source).toContain("Ticket Request");
    expect(source).toContain("Pump Test Rig Request");
    expect(source).toContain("Controller Software Request");
  });
});
