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

  it("registers the help center portal route and navigation entry", () => {
    const source = readFileSync(path.join(currentDir, "App.tsx"), "utf-8");

    expect(source).toContain('helpCenter: "/help-center"');
    expect(source).toContain('label: "Help Center"');
    expect(source).toContain("{ path: ROUTE_PATHS.helpCenter, element: <HelpCenterPage /> }");
  });

  it("renders the portal request type picker and both request forms", () => {
    const source = readFileSync(path.join(currentDir, "App.tsx"), "utf-8");

    expect(source).toContain("What can we help you with?");
    expect(source).toContain("Edit request type");
    expect(source).toContain("<PumpTestRigRequestForm");
    expect(source).toContain("<ControllerSoftwareRequestForm");
  });

  it("uses the portal field labels on the pump test rig form", () => {
    const source = readFileSync(path.join(currentDir, "App.tsx"), "utf-8");

    expect(source).toContain("Raise this request on behalf of");
    expect(source).toContain('htmlFor="pump-requester"');
    expect(source).not.toContain('<span className="request-label">Requester *</span>');
  });
});
