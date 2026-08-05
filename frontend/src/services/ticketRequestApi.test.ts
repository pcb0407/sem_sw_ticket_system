import type { PumpTestRigRequestPayload } from "@ticket-system/shared";
import {
  fetchTicketRequestMasterData,
  submitControllerSoftwareRequest,
  submitPumpTestRigRequest,
} from "./ticketRequestApi";

describe("ticketRequestApi", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("loads master data from backend API", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: [], priorities: [] }),
    } as Response);

    await fetchTicketRequestMasterData();

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/ticket-requests/master-data", expect.any(Object));
  });

  it("submits pump test rig payload to pump endpoint", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ requestId: "PTR-11111111" }),
    } as Response);

    const payload: PumpTestRigRequestPayload = {
      requester: "user01",
      title: "Pump issue",
      priorityId: "pri-high",
      productId: "prd-vacuum-pump",
      requestSourceId: "src-field",
      categoryId: "cat-defect",
      rigTypeId: "rig-endurance",
      issueTypeId: "issue-functional",
      issuedSiteId: "site-kr-icheon",
      descriptionHtml: "<p>Description</p>",
      stepsToReproduceHtml: "<p>Step</p>",
      attachments: [],
    };

    await submitPumpTestRigRequest(payload);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/ticket-requests/pump-test-rig",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("submits controller software payload to controller endpoint", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ requestId: "CSR-11111111" }),
    } as Response);

    await submitControllerSoftwareRequest({
      requester: "user01",
      title: "Controller issue",
      priorityId: "pri-high",
      productId: "prd-controller",
      requestSourceId: "src-field",
      categoryId: "cat-defect",
      controllerTypeId: "ctrl-atlas",
      mainVersionId: "main-d37001001",
      subVersionId: "sub-a",
      descriptionHtml: "<p>Description</p>",
      stepsToReproduceHtml: "<p>Step</p>",
      attachments: [],
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/ticket-requests/controller-software",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
