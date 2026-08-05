import { Injectable } from "@nestjs/common";
import type {
  ControllerSoftwareRequestPayload,
  JiraTicketGateway,
  PumpTestRigRequestPayload,
  TicketAttachmentInput,
} from "@ticket-system/shared";

@Injectable()
export class MockJiraTicketGateway implements JiraTicketGateway {
  async createIssue(_payload: PumpTestRigRequestPayload | ControllerSoftwareRequestPayload): Promise<{ issueKey: string }> {
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return { issueKey: `SEM-${randomNumber}` };
  }

  async uploadAttachments(_issueKey: string, _attachments: TicketAttachmentInput[]): Promise<void> {
    return;
  }

  async updateIssue(_issueKey: string, _payload: unknown): Promise<void> {
    return;
  }

  async syncStatus(_issueKey: string): Promise<{ status: string }> {
    return { status: "mock-open" };
  }

  async getComments(_issueKey: string): Promise<Array<{ author: string; body: string; createdAtUtc: string }>> {
    return [];
  }
}
