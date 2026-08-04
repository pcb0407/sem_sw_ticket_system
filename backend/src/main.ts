import "reflect-metadata";

import { Logger } from "@nestjs/common";
import {
  createPlatformApp,
  getConfigNumber,
  getConfigString,
} from "@sem/platform-backend";

import { AppModule } from "./app.module";
import {
  getBackendApiPrefix,
  getBackendListenHost,
  getBackendPort,
  getCorsOrigin,
  getSwaggerPath,
  getSwaggerServers,
} from "./local-dev-url";

async function bootstrap() {
  const logger = new Logger("TicketSystemBootstrap");

  const { app, config } = await createPlatformApp(AppModule, {
    apiPrefix: getBackendApiPrefix(),
    corsOrigin: getCorsOrigin(),
    swaggerPath: getSwaggerPath(),
    swagger: {
      title: "SEM SW Ticket System API",
      description: "Starter API for SEM SW web applications",
      version: "0.1.0",
      servers: getSwaggerServers(),
      cookieAuthName: "sem_sid",
    },
  });

  await app.init();

  const port = getConfigNumber(config, "TICKET_SYSTEM_BACKEND_PORT", getConfigNumber(config, "DEV_BACKEND_PORT", getBackendPort()));
  const host = getConfigString(config, "TICKET_SYSTEM_BACKEND_HOST", getConfigString(config, "DEV_BACKEND_BIND_HOST", getBackendListenHost()))!;
  const apiPrefix = getConfigString(config, "API_PREFIX", getBackendApiPrefix())!;

  await app.listen(port, host);
  logger.log(`Web template backend listening on http://${host}:${port}/${apiPrefix}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[ticket-system] bootstrap failed:", err);
  process.exit(1);
});
