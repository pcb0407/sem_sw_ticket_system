import { Injectable } from "@nestjs/common";
import type {
  ControllerSoftwareRequestPayload,
  PumpTestRigRequestPayload,
  TicketRequestSubmissionResponse,
} from "@ticket-system/shared";
import { MockJiraTicketGateway } from "./jira/mock-jira.gateway";
import { MockTicketRequestMasterDataRepository } from "./ticket-request.repository";

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
    return this.repository.createPumpTestRigRequest(payload, jiraIssue.issueKey);
  }

  async submitControllerSoftwareRequest(payload: ControllerSoftwareRequestPayload): Promise<TicketRequestSubmissionResponse> {
    const jiraIssue = await this.jiraGateway.createIssue(payload);
    await this.jiraGateway.uploadAttachments(jiraIssue.issueKey, payload.attachments);
    return this.repository.createControllerSoftwareRequest(payload, jiraIssue.issueKey);
  }
}
