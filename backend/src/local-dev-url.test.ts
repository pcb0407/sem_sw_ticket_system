import {
  getBackendApiPrefix,
  getBackendListenHost,
  getBackendPort,
  getCorsOrigin,
  getLocalFrontendOrigin,
  getSwaggerPath,
  getSwaggerServers,
  type LocalDevEnv,
} from "./local-dev-url";

describe("local development URL helpers", () => {
  it("uses the 127.0.0.1 local defaults for React and backend URLs", () => {
    const env: LocalDevEnv = {};

    expect(getLocalFrontendOrigin(env)).toBe("http://127.0.0.1:5173");
    expect(getCorsOrigin(env)).toBe("http://127.0.0.1:5173");
    expect(getBackendPort(env)).toBe(3001);
    expect(getBackendListenHost(env)).toBe("0.0.0.0");
    expect(getBackendApiPrefix(env)).toBe("api");
  });

  it("publishes both HTTP and HTTPS Swagger server origins by default", () => {
    expect(getSwaggerServers({})).toEqual([
      "http://127.0.0.1:3001",
      "https://127.0.0.1:3001",
    ]);
  });

  it("honors explicit Swagger protocol ordering", () => {
    expect(getSwaggerServers({
      DEV_BACKEND_SWAGGER_PROTOCOLS: "https,http",
      DEV_BACKEND_HOST: "api.local.test",
      TICKET_SYSTEM_BACKEND_PORT: "3443",
    })).toEqual([
      "https://api.local.test:3443",
      "http://api.local.test:3443",
    ]);
  });

  it("orders the configured backend protocol first without dropping the alternate protocol", () => {
    expect(getSwaggerServers({
      DEV_BACKEND_PROTOCOL: "https",
      DEV_BACKEND_HOST: "api.local.test",
      TICKET_SYSTEM_BACKEND_PORT: "3443",
    })).toEqual([
      "https://api.local.test:3443",
      "http://api.local.test:3443",
    ]);
  });

  it("normalizes wildcard backend hosts before exposing Swagger browser URLs", () => {
    expect(getSwaggerServers({
      DEV_BACKEND_HOST: "0.0.0.0",
      DEV_BACKEND_PORT: "3002",
    })).toEqual([
      "http://127.0.0.1:3002",
      "https://127.0.0.1:3002",
    ]);
  });

  it("reads Swagger route from shared local backend path settings", () => {
    expect(getSwaggerPath({})).toBe("docs");
    expect(getSwaggerPath({ DEV_BACKEND_SWAGGER_PATH: "/api-docs/" })).toBe("api-docs");
  });
});
