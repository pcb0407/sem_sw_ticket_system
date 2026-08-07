import { Injectable } from "@nestjs/common";
import type {
  ControllerSoftwareRequestPayload,
  CreateMasterDataOptionInput,
  PumpTestRigRequestPayload,
  TicketRequestSubmissionResponse,
  UpdateMasterDataOptionInput,
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

  getOptionsByGroup(group: string) {
    return this.repository.getOptionsByGroup(group);
  }

  createOption(input: CreateMasterDataOptionInput) {
    return this.repository.createOption(input);
  }

  updateOption(id: string, input: UpdateMasterDataOptionInput) {
    return this.repository.updateOption(id, input);
  }

  deleteOption(id: string) {
    return this.repository.deleteOption(id);
  }

  toggleOptionActive(id: string) {
    return this.repository.toggleOptionActive(id);
  }
}
