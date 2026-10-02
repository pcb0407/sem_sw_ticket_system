import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const source = [
  "App.tsx",
  "features/tickets/ticketNavigation.tsx",
  "features/tickets/TicketPortal.tsx",
  "features/tickets/PumpRequest.tsx",
  "features/tickets/ControllerRequest.tsx",
].map((file) => readFileSync(path.join(currentDir, file), "utf-8")).join("\n");

describe("App navigation", () => {
  it("does not include the removed sample route", () => {
    const removedLabel = ["Template", "Records"].join(" ");
    const removedPath = ["/overview", "ticket-systems"].join("/");

    expect(source).not.toContain(removedLabel);
    expect(source).not.toContain(removedPath);
  });

  it("contains ticket request navigation entries", () => {

    expect(source).toContain("Ticket Request");
    expect(source).toContain("Pump Test Rig Request");
    expect(source).toContain("Controller Software Request");
  });

  it("registers the help center portal route and navigation entry", () => {

    expect(source).toContain('helpCenter: "/help-center"');
    expect(source).toContain('label: "Help Center"');
    expect(source).toContain("{ path: ROUTE_PATHS.helpCenter, element: <HelpCenterPage /> }");
  });

  it("renders the portal request type picker and both request forms", () => {

    expect(source).toContain("What can we help you with?");
    expect(source).toContain("Edit request type");
    expect(source).toContain("<PumpTestRigRequestForm");
    expect(source).toContain("<ControllerSoftwareRequestForm");
  });

  it("uses the portal field labels on the pump test rig form", () => {

    expect(source).toContain("Raise this request on behalf of");
    expect(source).toContain('htmlFor="pump-requester"');
    expect(source).not.toContain('<span className="request-label">Requester *</span>');
  });

  it("loads ticket feature pages through lazy routes", () => {
    const entry = readFileSync(path.join(currentDir, "App.tsx"), "utf-8");
    expect(entry).toContain('lazy(() => import("./features/tickets/PumpRequest")');
    expect(entry).toContain('lazy(() => import("./features/tickets/TicketSettings")');
    expect(entry).not.toContain("function PumpTestRigRequestForm");
  });
});
