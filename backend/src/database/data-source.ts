import "reflect-metadata";

import * as path from "node:path";
import { config as loadEnv } from "dotenv";
import { createPlatformCliDataSource } from "@sem/platform-backend";
import { resolveBackendEnvFiles } from "@sem/platform-backend";
import { TicketRequestAttachmentEntity } from "../ticket-request/entities/ticket-request-attachment.entity";
import { TicketRequestMasterOptionEntity } from "../ticket-request/entities/ticket-request-master-option.entity";
import { TicketRequestEntity } from "../ticket-request/entities/ticket-request.entity";

const backendRoot = path.resolve(__dirname, "..", "..");
const backendEnvResolution = resolveBackendEnvFiles(backendRoot);

for (const envFile of backendEnvResolution.existingFiles) {
  loadEnv({ path: envFile, override: false });
}

const migrationGlob = path.join(
  __dirname,
  "migrations",
  getTicketMigrationDbType(),
  "*.{ts,js}",
);

function getTicketMigrationDbType(): string {
  const dbType = process.env.DB_TYPE?.trim().toLowerCase() ?? "";
  if (dbType === "better-sqlite3" || dbType === "sqljs" || !dbType) {
    return "sqlite";
  }
  if (["sqlite", "mssql", "postgres", "mysql", "mariadb"].includes(dbType)) {
    return dbType;
  }

  return "sqlite";
}

const dataSource = createPlatformCliDataSource({
  backendRoot,
  runtimeProjectName: "sem_sw_ticket_system",
  extraEntities: [TicketRequestMasterOptionEntity, TicketRequestEntity, TicketRequestAttachmentEntity],
  extraMigrationGlobs: [migrationGlob],
});

export default dataSource;
