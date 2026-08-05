import "reflect-metadata";

import type { ControllerSoftwareRequestPayload, PumpTestRigRequestPayload } from "@ticket-system/shared";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TicketRequestAttachmentEntity } from "./entities/ticket-request-attachment.entity";
import { TicketRequestMasterOptionEntity } from "./entities/ticket-request-master-option.entity";
import { TicketRequestEntity } from "./entities/ticket-request.entity";
import { MockTicketRequestMasterDataRepository } from "./ticket-request.repository";

describe("TicketRequestRepository integration", () => {
  let dataSource: DataSource;
  let repository: MockTicketRequestMasterDataRepository;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: "sqljs",
      entities: [TicketRequestMasterOptionEntity, TicketRequestEntity, TicketRequestAttachmentEntity],
      synchronize: true,
      logging: false,
    });
    await dataSource.initialize();

    repository = new MockTicketRequestMasterDataRepository(
      dataSource.getRepository(TicketRequestMasterOptionEntity),
      dataSource.getRepository(TicketRequestEntity),
      dataSource.getRepository(TicketRequestAttachmentEntity),
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it("seeds master data once and reads grouped options", async () => {
    const firstRead = await repository.getMasterData();
    const secondRead = await repository.getMasterData();

    expect(firstRead.products.length).toBeGreaterThan(0);
    expect(firstRead.priorities.length).toBeGreaterThan(0);

    const optionCount = await dataSource.getRepository(TicketRequestMasterOptionEntity).count();
    const expectedTotal = Object.values(firstRead).reduce((sum, options) => sum + options.length, 0);

    expect(optionCount).toBe(expectedTotal);
    expect(secondRead.products.length).toBe(firstRead.products.length);
  });

  it("persists pump test rig request and attachments transactionally", async () => {
    const payload: PumpTestRigRequestPayload = {
      requester: "repo-integration",
      title: "Pump test request",
      priorityId: "pri-high",
      productId: "prd-vacuum-pump",
      requestSourceId: "src-lab",
      dateFound: "2026-08-05",
      categoryId: "cat-defect",
      rigTypeId: "rig-thermal",
      issueTypeId: "issue-functional",
      issuedSiteId: "site-kr-icheon",
      additionalCategoryId: "cat-question",
      descriptionHtml: "<p>desc</p>",
      stepsToReproduceHtml: "<p>step</p>",
      attachments: [
        { fileName: "a.log", sizeBytes: 20, contentType: "text/plain" },
        { fileName: "b.log", sizeBytes: 30, contentType: "text/plain" },
      ],
    };

    const result = await repository.createPumpTestRigRequest(payload, "TS-300");

    expect(result.requestId).toBeTruthy();
    expect(result.jiraIssueKey).toBe("TS-300");
    expect(result.status).toBe("accepted");

    const ticket = await dataSource.getRepository(TicketRequestEntity).findOneByOrFail({ id: result.requestId });
    expect(ticket.requestType).toBe("pump-test-rig");
    expect(ticket.rigTypeId).toBe("rig-thermal");

    const attachments = await dataSource.getRepository(TicketRequestAttachmentEntity).findBy({ ticketRequestId: result.requestId });
    expect(attachments).toHaveLength(2);
  });

  it("persists controller software request", async () => {
    const payload: ControllerSoftwareRequestPayload = {
      requester: "repo-integration",
      title: "Controller test request",
      priorityId: "pri-medium",
      productId: "prd-controller",
      requestSourceId: "src-field",
      dateFound: "2026-08-05",
      categoryId: "cat-enhancement",
      controllerTypeId: "ctrl-genius",
      mainVersionId: "main-d37001001",
      subVersionId: "sub-a",
      descriptionHtml: "<p>desc</p>",
      stepsToReproduceHtml: "<p>step</p>",
      attachments: [],
    };

    const result = await repository.createControllerSoftwareRequest(payload, "TS-301");
    const ticket = await dataSource.getRepository(TicketRequestEntity).findOneByOrFail({ id: result.requestId });

    expect(ticket.requestType).toBe("controller-software");
    expect(ticket.controllerTypeId).toBe("ctrl-genius");
    expect(ticket.mainVersionId).toBe("main-d37001001");
    expect(ticket.subVersionId).toBe("sub-a");
  });
});
