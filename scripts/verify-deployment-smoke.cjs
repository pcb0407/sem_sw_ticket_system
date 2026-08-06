"use strict";

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(
  process.env.SEM_APP_WORKSPACE_ROOT ||
    process.env.TICKET_SYSTEM_WORKSPACE_ROOT ||
    process.env.INIT_CWD ||
    path.resolve(__dirname, ".."),
);

const failures = [];
const options = parseArgs(process.argv.slice(2));
const evidence = readEvidence(options.evidenceFile || process.env.TICKET_SYSTEM_READINESS_EVIDENCE_FILE || "");
const frontendUrl = options.frontendUrl || process.env.TICKET_SYSTEM_DEPLOYMENT_FRONTEND_URL || evidence?.deployment?.frontendUrl || "";
const apiUrl = options.apiUrl || process.env.TICKET_SYSTEM_DEPLOYMENT_API_URL || evidence?.deployment?.apiUrl || "";
const apiHealthPath = options.apiHealthPath || process.env.TICKET_SYSTEM_DEPLOYMENT_API_HEALTH_PATH || "";
const timeoutMs = readPositiveInteger(options.timeoutMs || process.env.TICKET_SYSTEM_DEPLOYMENT_SMOKE_TIMEOUT_MS, 8000);
const maxResponseMs = readPositiveInteger(options.maxResponseMs || process.env.TICKET_SYSTEM_DEPLOYMENT_SMOKE_MAX_RESPONSE_MS, 5000);
const allowHttp = options.allowHttp || process.env.TICKET_SYSTEM_DEPLOYMENT_SMOKE_ALLOW_HTTP === "1";
const allowLocalhost = options.allowLocalhost || process.env.TICKET_SYSTEM_DEPLOYMENT_SMOKE_ALLOW_LOCALHOST === "1";

main().catch((error) => {
  failures.push(error?.message || String(error));
  reportAndExit();
});

async function main() {
  requireUrl("frontend URL", frontendUrl);
  requireUrl("API URL", apiUrl);
  if (failures.length > 0) {
    reportAndExit();
  }

  const frontend = await fetchWithTiming(frontendUrl, { method: "GET" });
  validateFrontendResponse(frontend);

  const apiProbeUrl = buildApiProbeUrl(apiUrl, apiHealthPath);
  requireUrl(apiHealthPath ? "API health URL" : "API URL", apiProbeUrl);
  if (failures.length > 0) {
    reportAndExit();
  }

  const api = await fetchWithTiming(apiProbeUrl, { method: "GET" });
  validateApiResponse(api, Boolean(apiHealthPath));

  reportAndExit();
}

function parseArgs(rawArgs) {
  const parsed = {
    allowHttp: false,
    allowLocalhost: false,
    apiHealthPath: "",
    apiUrl: "",
    evidenceFile: "",
    frontendUrl: "",
    maxResponseMs: "",
    timeoutMs: "",
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    if (arg === "--allow-http") {
      parsed.allowHttp = true;
      continue;
    }
    if (arg === "--allow-localhost") {
      parsed.allowLocalhost = true;
      continue;
    }

    const optionNames = new Set([
      "api-health-path",
      "api-url",
      "evidence-file",
      "frontend-url",
      "max-response-ms",
      "timeout-ms",
    ]);
    if (arg.startsWith("--")) {
      const [rawName, inlineValue] = arg.slice(2).split("=", 2);
      if (!optionNames.has(rawName)) {
        failures.push(`unknown argument: ${arg}`);
        continue;
      }
      const value = inlineValue ?? rawArgs[index + 1] ?? "";
      if (inlineValue === undefined) {
        index += 1;
      }
      parsed[toCamelCase(rawName)] = value;
      continue;
    }

    failures.push(`unknown argument: ${arg}`);
  }

  return parsed;
}

function printUsage() {
  console.log("Usage: set TICKET_SYSTEM_DEPLOYMENT_FRONTEND_URL=https://...");
  console.log("       set TICKET_SYSTEM_DEPLOYMENT_API_URL=https://...");
  console.log("       set TICKET_SYSTEM_DEPLOYMENT_API_HEALTH_PATH=/health");
  console.log("       npm run verify:deployment-smoke");
  console.log("Alternatively set TICKET_SYSTEM_READINESS_EVIDENCE_FILE=path/to/readiness-evidence.json.");
}

function readEvidence(filePath) {
  if (!filePath) {
    return null;
  }

  const fullPath = path.resolve(repoRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`readiness evidence file does not exist: ${fullPath}`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    failures.push(`readiness evidence file is not valid JSON: ${error.message}`);
    return null;
  }
}

async function fetchWithTiming(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "user-agent": "sem-sw-ticket-system-readiness-smoke/1.0",
        ...(init.headers || {}),
      },
      redirect: "follow",
      signal: controller.signal,
    });
    const body = await response.text();
    return {
      body,
      elapsedMs: Math.round(performance.now() - startedAt),
      headers: response.headers,
      ok: response.ok,
      status: response.status,
      url: response.url,
    };
  } catch (error) {
    failures.push(`request failed for ${url}: ${error?.message || String(error)}`);
    return {
      body: "",
      elapsedMs: Math.round(performance.now() - startedAt),
      headers: new Headers(),
      ok: false,
      status: 0,
      url,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function validateFrontendResponse(response) {
  validateResponseTime("frontend", response);
  if (!response.ok) {
    failures.push(`frontend smoke expected HTTP 2xx but got ${response.status} from ${response.url}`);
    return;
  }

  const contentType = response.headers.get("content-type") || "";
  const looksLikeHtml = contentType.includes("text/html") || /<html[\s>]/i.test(response.body);
  if (!looksLikeHtml) {
    failures.push("frontend smoke did not receive an HTML response");
  }
  if (isPlaceholderBody(response.body)) {
    failures.push("frontend smoke response contains local or placeholder values");
  }
}

function validateApiResponse(response, healthPathRequired) {
  validateResponseTime("API", response);
  if (healthPathRequired) {
    if (!response.ok) {
      failures.push(`API health smoke expected HTTP 2xx but got ${response.status} from ${response.url}`);
    }
    return;
  }

  if (response.status >= 500 || response.status === 0) {
    failures.push(`API smoke expected reachable non-5xx response but got ${response.status} from ${response.url}`);
  }
}

function validateResponseTime(name, response) {
  if (response.elapsedMs > maxResponseMs) {
    failures.push(`${name} smoke response exceeded ${maxResponseMs} ms: ${response.elapsedMs} ms`);
  }
}

function requireUrl(name, value) {
  if (!value) {
    failures.push(`${name} is required for deployment smoke verification`);
    return;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    failures.push(`${name} must be a valid URL`);
    return;
  }

  if (!allowHttp && parsed.protocol !== "https:") {
    failures.push(`${name} must use https for production deployment smoke verification`);
  }
  if ((!allowLocalhost && isLocalHost(parsed.hostname)) || isPlaceholderUrlValue(value)) {
    failures.push(`${name} must not use local or placeholder hosts`);
  }
}

function readPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function buildApiProbeUrl(baseUrl, healthPath) {
  const trimmedHealthPath = String(healthPath || "").trim();
  if (!trimmedHealthPath) {
    return baseUrl;
  }

  const relativeHealthPath = trimmedHealthPath.replace(/^\/+/, "");
  return new URL(relativeHealthPath, ensureTrailingSlash(baseUrl)).toString();
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function isLocalHost(hostname) {
  const normalized = String(hostname || "").trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1" || normalized.endsWith(".local");
}

function isPlaceholderValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return (
    normalized.includes("<") ||
    normalized.includes(">") ||
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1") ||
    normalized.includes("example") ||
    normalized.includes("contoso") ||
    normalized.includes("changeme") ||
    normalized.includes("replace-me")
  );
}

function isPlaceholderUrlValue(value) {
  if (!allowLocalhost) {
    return isPlaceholderValue(value);
  }

  return isPlaceholderValue(
    String(value || "")
      .replace(/localhost/gi, "local-test-host")
      .replace(/127\.0\.0\.1/g, "local-test-host")
      .replace(/\[::1\]|::1/g, "local-test-host"),
  );
}

function isPlaceholderBody(body) {
  return /\b(localhost|127\.0\.0\.1|contoso|example|changeme|replace-me)\b/i.test(body);
}

function reportAndExit() {
  if (failures.length > 0) {
    console.error("[deployment-smoke] Verification failed.");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("[deployment-smoke] Deployment smoke verification passed.");
}
