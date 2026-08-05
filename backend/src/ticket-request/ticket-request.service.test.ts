import type {
  ControllerSoftwareRequestPayload,
  PumpTestRigRequestPayload,
  TicketRequestMasterData,
  TicketRequestSubmissionResponse,
} from "@ticket-system/shared";
import { describe, expect, it, vi } from "vitest";
import { MockJiraTicketGateway } from "./jira/mock-jira.gateway";
import { MockTicketRequestMasterDataRepository } from "./ticket-request.repository";
import { TicketRequestService } from "./ticket-request.service";

describe("TicketRequestService", () => {
  it("submits pump test rig requests through jira then repository persistence", async () => {
    const jiraIssueKey = "TS-100";
    const persisted: TicketRequestSubmissionResponse = {
      requestId: "req-100",
      jiraIssueKey,
      createdAtUtc: "2026-01-01T00:00:00.000Z",
      status: "accepted",
      message: "Pump Test Rig request is accepted and queued for Jira sync.",
    };

    const payload: PumpTestRigRequestPayload = {
      requester: "tester",
      title: "Pump issue",
      priorityId: "pri-high",
      productId: "prd-vacuum-pump",
      requestSourceId: "src-lab",
      dateFound: "2026-01-01",
      categoryId: "cat-defect",
      rigTypeId: "rig-thermal",
      issueTypeId: "issue-functional",
      issuedSiteId: "site-kr-icheon",
      descriptionHtml: "<p>desc</p>",
      stepsToReproduceHtml: "<ol><li>step</li></ol>",
      additionalCategoryId: "cat-question",
      attachments: [{ fileName: "log.txt", sizeBytes: 10, contentType: "text/plain" }],
    };

    const repositoryMock = {
      getMasterData: vi.fn<[], Promise<TicketRequestMasterData>>(),
      createPumpTestRigRequest: vi.fn<[PumpTestRigRequestPayload, string], Promise<TicketRequestSubmissionResponse>>().mockResolvedValue(persisted),
      createControllerSoftwareRequest: vi.fn<[ControllerSoftwareRequestPayload, string], Promise<TicketRequestSubmissionResponse>>(),
    };
    const repository = repositoryMock as unknown as MockTicketRequestMasterDataRepository;

    const jira = {
      createIssue: vi.fn().mockResolvedValue({ issueKey: jiraIssueKey }),
      uploadAttachments: vi.fn().mockResolvedValue(undefined),
    } as unknown as MockJiraTicketGateway;

    const service = new TicketRequestService(repository, jira);
    const response = await service.submitPumpTestRigRequest(payload);

    expect(jira.createIssue).toHaveBeenCalledWith(payload);
    expect(jira.uploadAttachments).toHaveBeenCalledWith(jiraIssueKey, payload.attachments);
    expect(repositoryMock.createPumpTestRigRequest).toHaveBeenCalledWith(payload, jiraIssueKey);
    expect(response).toEqual(persisted);
  });

  it("submits controller software requests through jira then repository persistence", async () => {
    const jiraIssueKey = "TS-200";
    const persisted: TicketRequestSubmissionResponse = {
      requestId: "req-200",
      jiraIssueKey,
      createdAtUtc: "2026-01-01T00:00:00.000Z",
      status: "accepted",
      message: "Controller Software request is accepted and queued for Jira sync.",
    };

    const payload: ControllerSoftwareRequestPayload = {
      requester: "tester",
      title: "Controller issue",
      priorityId: "pri-medium",
      productId: "prd-controller",
      requestSourceId: "src-field",
      dateFound: "2026-01-01",
      categoryId: "cat-defect",
      controllerTypeId: "ctrl-genius",
      mainVersionId: "main-d37001001",
      subVersionId: "sub-a",
      descriptionHtml: "<p>desc</p>",
      stepsToReproduceHtml: "<ol><li>step</li></ol>",
      attachments: [{ fileName: "trace.txt", sizeBytes: 11, contentType: "text/plain" }],
    };

    const repositoryMock = {
      getMasterData: vi.fn<[], Promise<TicketRequestMasterData>>(),
      createPumpTestRigRequest: vi.fn<[PumpTestRigRequestPayload, string], Promise<TicketRequestSubmissionResponse>>(),
      createControllerSoftwareRequest: vi
        .fn<[ControllerSoftwareRequestPayload, string], Promise<TicketRequestSubmissionResponse>>()
        .mockResolvedValue(persisted),
    };
    const repository = repositoryMock as unknown as MockTicketRequestMasterDataRepository;

    const jira = {
      createIssue: vi.fn().mockResolvedValue({ issueKey: jiraIssueKey }),
      uploadAttachments: vi.fn().mockResolvedValue(undefined),
    } as unknown as MockJiraTicketGateway;

    const service = new TicketRequestService(repository, jira);
    const response = await service.submitControllerSoftwareRequest(payload);

    expect(jira.createIssue).toHaveBeenCalledWith(payload);
    expect(jira.uploadAttachments).toHaveBeenCalledWith(jiraIssueKey, payload.attachments);
    expect(repositoryMock.createControllerSoftwareRequest).toHaveBeenCalledWith(payload, jiraIssueKey);
    expect(response).toEqual(persisted);
  });
});
