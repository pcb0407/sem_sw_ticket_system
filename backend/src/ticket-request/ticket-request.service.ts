import { Injectable } from "@nestjs/common";
import type {
  ControllerSoftwareRequestPayload,
  PumpTestRigRequestPayload,
  TicketRequestSubmissionResponse,
} from "@ticket-system/shared";
import { MockJiraTicketGateway } from "./jira/mock-jira.gateway";
import { MockTicketRequestMasterDataRepository } from "./ticket-request.repository";

function requestId(prefix: string) {
  const timestamp = Date.now().toString().slice(-8);
  return `${prefix}-${timestamp}`;
}

@Injectable()
export class TicketRequestService {
  constructor(
    private readonly repository: MockTicketRequestMasterDataRepository,
    private readonly jiraGateway: MockJiraTicketGateway,
  ) {}

  getMasterData() {
    return this.repository.getMasterData();
  }

  async submitPumpTestRigRequest(payload: PumpTestRigRequestPayload): Promise<TicketRequestSubmissionResponse> {
    const jiraIssue = await this.jiraGateway.createIssue(payload);
    await this.jiraGateway.uploadAttachments(jiraIssue.issueKey, payload.attachments);

    return {
      requestId: requestId("PTR"),
      jiraIssueKey: jiraIssue.issueKey,
      createdAtUtc: new Date().toISOString(),
      status: "accepted",
      message: "Pump Test Rig request is accepted and queued for Jira sync.",
    };
  }

  async submitControllerSoftwareRequest(payload: ControllerSoftwareRequestPayload): Promise<TicketRequestSubmissionResponse> {
    const jiraIssue = await this.jiraGateway.createIssue(payload);
    await this.jiraGateway.uploadAttachments(jiraIssue.issueKey, payload.attachments);

    return {
      requestId: requestId("CSR"),
      jiraIssueKey: jiraIssue.issueKey,
      createdAtUtc: new Date().toISOString(),
      status: "accepted",
      message: "Controller Software request is accepted and queued for Jira sync.",
    };
  }
}
