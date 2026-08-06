import { createLocalDevConfig, type LocalDevEnv } from "@sem/platform-backend";

export type { LocalDevEnv };

const _config = createLocalDevConfig({
  projectPortKey: "TICKET_SYSTEM_BACKEND_PORT",
  projectHostKey: "TICKET_SYSTEM_BACKEND_HOST",
});

export const getLocalFrontendOrigin = _config.getLocalFrontendOrigin;
export const getCorsOrigin = _config.getCorsOrigin;
export const getBackendPort = _config.getBackendPort;
export const getBackendListenHost = _config.getBackendListenHost;
export const getBackendApiPrefix = _config.getBackendApiPrefix;
export const getSwaggerPath = _config.getSwaggerPath;
export const getSwaggerServers = _config.getSwaggerServers;