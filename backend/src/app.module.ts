import { Logger, Module, OnModuleInit } from "@nestjs/common";
import * as path from "node:path";

import {
  createPlatformBackendModuleSetup,
  formatBackendEnvPrecedence,
  formatLoadedBackendEnvFiles,
  resolvePlatformSeedOptions,
} from "@sem/platform-backend";

const ticketSystemBackendRoot = path.resolve(__dirname, "..");

const platformBackend = createPlatformBackendModuleSetup({
  backendRoot: ticketSystemBackendRoot,
  runtimeProjectName: "sem_sw_ticket_system",
  emailProductName: "SEM SW Ticket System",
  system: {
    packageDescriptors: [
      { area: "ticket-system", name: "@ticket-system/backend", candidatePaths: ["../backend/package.json", "../../backend/package.json"] },
      { area: "ticket-system", name: "@ticket-system/shared", candidatePaths: ["../shared/package.json", "../../shared/package.json"] },
      { area: "platform", name: "@sem/platform-backend", candidatePaths: ["../common-platform/packages/platform-backend/package.json", "../../common-platform/packages/platform-backend/package.json"] },
      { area: "platform", name: "@sem/platform-shared", candidatePaths: ["../common-platform/packages/platform-shared/package.json", "../../common-platform/packages/platform-shared/package.json"] },
    ],
  },
  seed: resolvePlatformSeedOptions({ envPrefix: "TICKETSYSTEM" }),
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
