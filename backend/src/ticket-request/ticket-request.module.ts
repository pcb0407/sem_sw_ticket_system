import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MockJiraTicketGateway } from "./jira/mock-jira.gateway";
import { TicketRequestAttachmentEntity } from "./entities/ticket-request-attachment.entity";
import { TicketRequestMasterOptionEntity } from "./entities/ticket-request-master-option.entity";
import { TicketRequestEntity } from "./entities/ticket-request.entity";
import { TicketRequestController } from "./ticket-request.controller";
import { MockTicketRequestMasterDataRepository } from "./ticket-request.repository";
import { TicketRequestService } from "./ticket-request.service";

@Module({
  imports: [TypeOrmModule.forFeature([TicketRequestMasterOptionEntity, TicketRequestEntity, TicketRequestAttachmentEntity])],
  controllers: [TicketRequestController],
  providers: [
    MockTicketRequestMasterDataRepository,
    MockJiraTicketGateway,
    TicketRequestService,
  ],
})
export class TicketRequestModule {}
