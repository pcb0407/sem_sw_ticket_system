import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  ControllerSoftwareRequestPayload,
  MasterDataOption,
  PumpTestRigRequestPayload,
  TicketRequestMasterData,
  TicketRequestMasterDataRepository,
  TicketRequestSubmissionResponse,
} from "@ticket-system/shared";
import { randomUUID } from "node:crypto";
import { Repository } from "typeorm";
import { TICKET_REQUEST_MASTER_DATA_SEED } from "./mock-seed.data";
import { TicketRequestAttachmentEntity } from "./entities/ticket-request-attachment.entity";
import { TicketRequestMasterOptionEntity } from "./entities/ticket-request-master-option.entity";
import { TicketRequestEntity } from "./entities/ticket-request.entity";
import { MASTER_DATA_GROUPS, type MasterDataGroupKey } from "./ticket-request.types";

@Injectable()
export class MockTicketRequestMasterDataRepository implements TicketRequestMasterDataRepository {
  constructor(
    @InjectRepository(TicketRequestMasterOptionEntity)
    private readonly masterOptionRepository: Repository<TicketRequestMasterOptionEntity>,
    @InjectRepository(TicketRequestEntity)
    private readonly ticketRequestRepository: Repository<TicketRequestEntity>,
    @InjectRepository(TicketRequestAttachmentEntity)
    private readonly attachmentRepository: Repository<TicketRequestAttachmentEntity>,
  ) {}

  async getMasterData(): Promise<TicketRequestMasterData> {
    await this.ensureMasterDataSeeded();

    const rows = await this.masterOptionRepository.find({
      order: {
        optionGroup: "ASC",
        sortOrder: "ASC",
        name: "ASC",
      },
    });

    return {
      products: this.byGroup(rows, "products"),
      controllerTypes: this.byGroup(rows, "controllerTypes"),
      rigTypes: this.byGroup(rows, "rigTypes"),
      requestSources: this.byGroup(rows, "requestSources"),
      categories: this.byGroup(rows, "categories"),
      issueTypes: this.byGroup(rows, "issueTypes"),
      issuedSites: this.byGroup(rows, "issuedSites"),
      priorities: this.byGroup(rows, "priorities"),
      softwareMainVersions: this.byGroup(rows, "softwareMainVersions"),
      softwareSubVersions: this.byGroup(rows, "softwareSubVersions"),
    };
  }

  async createPumpTestRigRequest(
    payload: PumpTestRigRequestPayload,
    jiraIssueKey: string,
  ): Promise<TicketRequestSubmissionResponse> {
    const ticketId = randomUUID();

    await this.ticketRequestRepository.save(
      this.ticketRequestRepository.create({
        id: ticketId,
        requestType: "pump-test-rig",
        requester: payload.requester,
        title: payload.title,
        priorityId: payload.priorityId,
        productId: payload.productId,
        requestSourceId: payload.requestSourceId,
        categoryId: payload.categoryId,
        dateFound: payload.dateFound ?? null,
        rigTypeId: payload.rigTypeId,
        issueTypeId: payload.issueTypeId,
        issuedSiteId: payload.issuedSiteId,
        controllerTypeId: null,
        mainVersionId: null,
        mainVersionOther: null,
        subVersionId: null,
        subVersionOther: null,
        additionalCategoryId: payload.additionalCategoryId ?? null,
        descriptionHtml: payload.descriptionHtml,
        stepsToReproduceHtml: payload.stepsToReproduceHtml,
        jiraIssueKey,
        status: "accepted",
        message: "Pump Test Rig request is accepted and queued for Jira sync.",
      }),
    );

    await this.saveAttachments(ticketId, payload.attachments);

    return {
      requestId: ticketId,
      jiraIssueKey,
      createdAtUtc: new Date().toISOString(),
      status: "accepted",
      message: "Pump Test Rig request is accepted and queued for Jira sync.",
    };
  }

  async createControllerSoftwareRequest(
    payload: ControllerSoftwareRequestPayload,
    jiraIssueKey: string,
  ): Promise<TicketRequestSubmissionResponse> {
    const ticketId = randomUUID();

    await this.ticketRequestRepository.save(
      this.ticketRequestRepository.create({
        id: ticketId,
        requestType: "controller-software",
        requester: payload.requester,
        title: payload.title,
        priorityId: payload.priorityId,
        productId: payload.productId,
        requestSourceId: payload.requestSourceId,
        categoryId: payload.categoryId,
        dateFound: payload.dateFound ?? null,
        rigTypeId: null,
        issueTypeId: null,
        issuedSiteId: null,
        controllerTypeId: payload.controllerTypeId,
        mainVersionId: payload.mainVersionId,
        mainVersionOther: payload.mainVersionOther ?? null,
        subVersionId: payload.subVersionId,
        subVersionOther: payload.subVersionOther ?? null,
        additionalCategoryId: payload.additionalCategoryId ?? null,
        descriptionHtml: payload.descriptionHtml,
        stepsToReproduceHtml: payload.stepsToReproduceHtml,
        jiraIssueKey,
        status: "accepted",
        message: "Controller Software request is accepted and queued for Jira sync.",
      }),
    );

    await this.saveAttachments(ticketId, payload.attachments);

    return {
      requestId: ticketId,
      jiraIssueKey,
      createdAtUtc: new Date().toISOString(),
      status: "accepted",
      message: "Controller Software request is accepted and queued for Jira sync.",
    };
  }

  private async ensureMasterDataSeeded(): Promise<void> {
    const existingCount = await this.masterOptionRepository.count();
    if (existingCount > 0) {
      return;
    }

    const seedRows = this.flattenSeedOptions();
    await this.masterOptionRepository.save(seedRows.map((row) => this.masterOptionRepository.create(row)));
  }

  private flattenSeedOptions(): Array<
    Pick<TicketRequestMasterOptionEntity, "id" | "optionGroup" | "code" | "name" | "description" | "sortOrder" | "isActive">
  > {
    const rows: Array<
      Pick<TicketRequestMasterOptionEntity, "id" | "optionGroup" | "code" | "name" | "description" | "sortOrder" | "isActive">
    > = [];

    const pushGroup = (groupKey: MasterDataGroupKey, options: MasterDataOption[]) => {
      for (const option of options) {
        rows.push({
          id: option.id,
          optionGroup: MASTER_DATA_GROUPS[groupKey],
          code: option.code,
          name: option.name,
          description: option.description ?? null,
          sortOrder: option.sortOrder,
          isActive: option.isActive,
        });
      }
    };

    pushGroup("products", TICKET_REQUEST_MASTER_DATA_SEED.products);
    pushGroup("controllerTypes", TICKET_REQUEST_MASTER_DATA_SEED.controllerTypes);
    pushGroup("rigTypes", TICKET_REQUEST_MASTER_DATA_SEED.rigTypes);
    pushGroup("requestSources", TICKET_REQUEST_MASTER_DATA_SEED.requestSources);
    pushGroup("categories", TICKET_REQUEST_MASTER_DATA_SEED.categories);
    pushGroup("issueTypes", TICKET_REQUEST_MASTER_DATA_SEED.issueTypes);
    pushGroup("issuedSites", TICKET_REQUEST_MASTER_DATA_SEED.issuedSites);
    pushGroup("priorities", TICKET_REQUEST_MASTER_DATA_SEED.priorities);
    pushGroup("softwareMainVersions", TICKET_REQUEST_MASTER_DATA_SEED.softwareMainVersions);
    pushGroup("softwareSubVersions", TICKET_REQUEST_MASTER_DATA_SEED.softwareSubVersions);

    return rows;
  }

  private byGroup(rows: TicketRequestMasterOptionEntity[], groupKey: MasterDataGroupKey): MasterDataOption[] {
    const optionGroup = MASTER_DATA_GROUPS[groupKey];
    return rows
      .filter((row) => row.optionGroup === optionGroup)
      .map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description ?? undefined,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
      }));
  }

  private async saveAttachments(
    ticketRequestId: string,
    attachments: Array<{ fileName: string; sizeBytes: number; contentType: string }>,
  ): Promise<void> {
    if (attachments.length === 0) {
      return;
    }

    const entities = attachments.map((attachment) =>
      this.attachmentRepository.create({
        id: randomUUID(),
        ticketRequestId,
        fileName: attachment.fileName,
        sizeBytes: attachment.sizeBytes,
        contentType: attachment.contentType,
      }),
    );

    await this.attachmentRepository.save(entities);
  }
}
