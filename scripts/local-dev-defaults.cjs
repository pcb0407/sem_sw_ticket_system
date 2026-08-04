const fs = require('node:fs');
const path = require('node:path');

function getWorkspaceRoot(workspaceRoot) {
  return path.resolve(workspaceRoot || process.env.SEM_APP_WORKSPACE_ROOT || process.env.TICKET_SYSTEM_WORKSPACE_ROOT || path.resolve(__dirname, ".."));
}

let cachedDefaults;

function readEnvFile(filePath) {
  const values = {};
  if (!fs.existsSync(filePath)) {
    return values;
  }

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function mergeSettings(target, source) {
  for (const [key, value] of Object.entries(source)) {
    target[key] = value;
  }
}

function getSettingValue(values, name, fallback) {
  const environmentValue = process.env[name];
  if (environmentValue) {
    return environmentValue;
  }

  if (values[name]) {
    return values[name];
  }

  return fallback;
}

function getSettingPort(values, name, fallback) {
  const raw = getSettingValue(values, name, String(fallback));
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getSettingChoice(values, name, allowedValues, fallback) {
  const raw = getSettingValue(values, name, fallback);
  if (!raw) {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  return allowedValues.find((value) => value.toLowerCase() === normalized) ?? fallback;
}

function getDefaultsPath(workspaceRoot = getWorkspaceRoot()) {
  return path.join(getWorkspaceRoot(workspaceRoot), 'scripts', 'local-dev-defaults.json');
}

function loadLocalDevDefaults(workspaceRoot = getWorkspaceRoot()) {
  if (cachedDefaults) {
    return cachedDefaults;
  }

  const defaultsPath = getDefaultsPath(workspaceRoot);
  cachedDefaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
  return cachedDefaults;
}

function resolveLocalDevConfig(workspaceRoot = getWorkspaceRoot()) {
  const resolvedWorkspaceRoot = getWorkspaceRoot(workspaceRoot);
  const defaults = loadLocalDevDefaults(resolvedWorkspaceRoot);
  const values = {};

  mergeSettings(values, readEnvFile(path.join(resolvedWorkspaceRoot, '.env.development.example')));
  mergeSettings(values, readEnvFile(path.join(resolvedWorkspaceRoot, '.env.development')));
  mergeSettings(values, readEnvFile(path.join(resolvedWorkspaceRoot, '.env.development.local')));
  mergeSettings(values, readEnvFile(path.join(resolvedWorkspaceRoot, 'backend', '.env.backend')));
  mergeSettings(values, readEnvFile(path.join(resolvedWorkspaceRoot, 'backend', '.env.backend.local')));

  const nodeEnv = getSettingValue(values, 'NODE_ENV', defaults.nodeEnv);
  const apphostRuntime = getSettingChoice(values, 'DEV_APPHOST_RUNTIME', ['local', 'docker'], defaults.apphostRuntime);
  const dockerComposeFile = getSettingValue(values, 'DEV_DOCKER_COMPOSE_FILE', defaults.dockerComposeFile);
  const dockerProjectName = getSettingValue(values, 'DEV_DOCKER_PROJECT_NAME', defaults.dockerProjectName);
  const dockerApiVersion = getSettingValue(values, 'DEV_DOCKER_API_VERSION', defaults.dockerApiVersion);
  const localNodeModulesRoot = getSettingValue(values, 'DEV_LOCAL_NODE_MODULES_ROOT', defaults.localNodeModulesRoot);
  const buildOutputRoot = getSettingValue(values, 'DEV_LOCAL_BUILD_OUTPUT_ROOT', path.join(localNodeModulesRoot || resolvedWorkspaceRoot, 'output'));
  const syncedStorageRoots = getSettingValue(values, 'DEV_SYNCED_STORAGE_ROOTS', defaults.syncedStorageRoots || []);
  const syncedStorageSegments = getSettingValue(values, 'DEV_SYNCED_STORAGE_SEGMENTS', defaults.syncedStorageSegments || []);

  const frontendProtocol = getSettingValue(values, 'DEV_FRONTEND_PROTOCOL', defaults.frontend.protocol);
  const frontendHost = getSettingValue(values, 'DEV_FRONTEND_HOST', defaults.frontend.host);
  const frontendPort = getSettingPort(values, 'DEV_FRONTEND_PORT', defaults.frontend.port);

  const backendProtocol = getSettingValue(values, 'DEV_BACKEND_PROTOCOL', defaults.backend.protocol);
  const backendHost = getSettingValue(values, 'DEV_BACKEND_HOST', defaults.backend.host);
  const backendPort = getSettingPort(values, 'DEV_BACKEND_PORT', getSettingPort(values, 'PORT', defaults.backend.port));
  const backendApiPrefix = getSettingValue(values, 'API_PREFIX', getSettingValue(values, 'DEV_BACKEND_API_PREFIX', defaults.backend.apiPrefix));
  const backendSwaggerPath = getSettingValue(values, 'DEV_BACKEND_SWAGGER_PATH', defaults.backend.swaggerPath);
  const backendDebugPort = getSettingPort(values, 'DEV_BACKEND_DEBUG_PORT', defaults.backend.debugPort);

  const frontendUrl = `${frontendProtocol}://${frontendHost}:${frontendPort}`;
  const backendOrigin = `${backendProtocol}://${backendHost}:${backendPort}`;
  const backendHttpOrigin = `http://${backendHost}:${backendPort}`;
  const normalizedBackendSwaggerPath = backendSwaggerPath.replace(/^\//, '');

  return {
    workspaceRoot: resolvedWorkspaceRoot,
    nodeEnv,
    isDevelopmentMode: nodeEnv === 'development',
    apphostRuntime,
    dockerComposeFile: path.resolve(resolvedWorkspaceRoot, dockerComposeFile),
    dockerProjectName,
    dockerApiVersion,
    localNodeModulesRoot,
    buildOutputRoot,
    syncedStorageRoots,
    syncedStorageSegments,
    frontend: {
      protocol: frontendProtocol,
      host: frontendHost,
      port: frontendPort,
      url: frontendUrl,
    },
    backend: {
      protocol: backendProtocol,
      host: backendHost,
      port: backendPort,
      origin: backendOrigin,
      httpOrigin: backendHttpOrigin,
      apiPrefix: backendApiPrefix,
      apiUrl: `${backendOrigin}/${backendApiPrefix.replace(/^\//, '')}`,
      swaggerPath: backendSwaggerPath,
      swaggerUrl: `${backendOrigin}/${normalizedBackendSwaggerPath}`,
      swaggerHttpUrl: `${backendHttpOrigin}/${normalizedBackendSwaggerPath}`,
      debugPort: backendDebugPort,
    },
  };
}

module.exports = {
  getDefaultsPath,
  loadLocalDevDefaults,
  readEnvFile,
  resolveLocalDevConfig,
};
