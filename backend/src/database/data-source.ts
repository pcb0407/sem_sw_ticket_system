import "reflect-metadata";

import * as path from "node:path";
import { createPlatformCliDataSource } from "@sem/platform-backend";
import { TicketRequestAttachmentEntity } from "../ticket-request/entities/ticket-request-attachment.entity";
import { TicketRequestMasterOptionEntity } from "../ticket-request/entities/ticket-request-master-option.entity";
import { TicketRequestEntity } from "../ticket-request/entities/ticket-request.entity";

const backendRoot = path.resolve(__dirname, "..", "..");
const migrationGlob = path.join(__dirname, "migrations", "*.{ts,js}");

const dataSource = createPlatformCliDataSource({
  backendRoot,
  runtimeProjectName: "sem_sw_ticket_system",
  extraEntities: [TicketRequestMasterOptionEntity, TicketRequestEntity, TicketRequestAttachmentEntity],
  extraMigrationGlobs: [migrationGlob],
});

export default dataSource;
