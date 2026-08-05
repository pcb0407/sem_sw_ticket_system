import { Module } from "@nestjs/common";
import { MockJiraTicketGateway } from "./jira/mock-jira.gateway";
import { TicketRequestController } from "./ticket-request.controller";
import { MockTicketRequestMasterDataRepository } from "./ticket-request.repository";
import { TicketRequestService } from "./ticket-request.service";

@Module({
  controllers: [TicketRequestController],
  providers: [
    MockTicketRequestMasterDataRepository,
    MockJiraTicketGateway,
    TicketRequestService,
  ],
})
export class TicketRequestModule {}
