import { Logger, Module, OnModuleInit } from "@nestjs/common";
import * as path from "node:path";

import {
  createPlatformBackendModuleSetup,
  formatBackendEnvPrecedence,
  formatLoadedBackendEnvFiles,
  resolvePlatformSeedOptions,
} from "@sem/platform-backend";
import { TicketRequestAttachmentEntity } from "./ticket-request/entities/ticket-request-attachment.entity";
import { TicketRequestMasterOptionEntity } from "./ticket-request/entities/ticket-request-master-option.entity";
import { TicketRequestEntity } from "./ticket-request/entities/ticket-request.entity";
import { TicketRequestModule } from "./ticket-request/ticket-request.module";

const ticketSystemBackendRoot = path.resolve(__dirname, "..");
const ticketSystemMigrationGlob = path.join(__dirname, "database", "migrations", "*.{ts,js}");

const platformBackend = createPlatformBackendModuleSetup({
  backendRoot: ticketSystemBackendRoot,
  runtimeProjectName: "sem_sw_ticket_system",
  emailProductName: "SEM SW Ticket System",
  typeOrm: {
    buildContext: {
      extraEntities: [TicketRequestMasterOptionEntity, TicketRequestEntity, TicketRequestAttachmentEntity],
      extraMigrationGlobs: [ticketSystemMigrationGlob],
    },
  },
  system: {
    packageDescriptors: [
      { area: "ticket-system", name: "@ticket-system/backend", candidatePaths: ["../backend/package.json", "../../backend/package.json"] },
      { area: "ticket-system", name: "@ticket-system/shared", candidatePaths: ["../shared/package.json", "../../shared/package.json"] },
      { area: "platform", name: "@sem/platform-backend", candidatePaths: ["../common-platform/packages/platform-backend/package.json", "../../common-platform/packages/platform-backend/package.json"] },
      { area: "platform", name: "@sem/platform-shared", candidatePaths: ["../common-platform/packages/platform-shared/package.json", "../../common-platform/packages/platform-shared/package.json"] },
    ],
  },
  rdbAdmin: {
    extraTablePolicies: {
      ticket_request_master_options: { canRead: true, canMutate: true },
      ticket_requests: { canRead: true, canMutate: true },
      ticket_request_attachments: { canRead: true, canMutate: true },
    },
  },
  seed: resolvePlatformSeedOptions({ envPrefix: "TICKETSYSTEM" }),
  domainImports: [TicketRequestModule],
});

@Module({
  imports: platformBackend.imports,
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  onModuleInit(): void {
    this.logger.log(`Backend env precedence: ${formatBackendEnvPrecedence(platformBackend.envResolution)}`);
    this.logger.log(`Loaded backend env files: ${formatLoadedBackendEnvFiles(platformBackend.envResolution)}`);
  }
}
