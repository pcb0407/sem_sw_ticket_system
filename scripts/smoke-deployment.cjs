#!/usr/bin/env node

const DEFAULT_TIMEOUT_MS = 15_000;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for deployment smoke checks.`);
  }
  return trimTrailingSlash(value);
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function joinUrl(origin, pathname) {
  return `${trimTrailingSlash(origin)}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function readPositiveInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readPath(name, fallback) {
  const raw = process.env[name]?.trim();
  return raw || fallback;
}

function readBoolean(name, fallback = false) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return ["1", "true", "yes", "y"].includes(raw);
}

function formatAllowedStatuses(statuses) {
  return statuses.join(", ");
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal, redirect: "manual" });
  } finally {
    clearTimeout(timer);
  }
}

async function expectStatus({ label, url, allowedStatuses, bodyIncludes, timeoutMs }) {
  let response;

  try {
    response = await fetchWithTimeout(url, timeoutMs);
  } catch (error) {
    throw new Error(`${label} failed: ${error instanceof Error ? error.message : String(error)} (${url})`);
  }

  if (!allowedStatuses.includes(response.status)) {
    throw new Error(`${label} returned ${response.status}; expected ${formatAllowedStatuses(allowedStatuses)} (${url})`);
  }

  if (bodyIncludes) {
    const body = await response.text();
    if (!body.includes(bodyIncludes)) {
      throw new Error(`${label} response did not include ${JSON.stringify(bodyIncludes)} (${url})`);
    }
  }

  return response.status;
}

async function main() {
  const frontendUrl = requiredEnv("DEPLOY_SMOKE_FRONTEND_URL");
  const backendUrl = requiredEnv("DEPLOY_SMOKE_BACKEND_URL");
  const timeoutMs = readPositiveInt("DEPLOY_SMOKE_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
  const apiPrefix = readPath("DEPLOY_SMOKE_API_PREFIX", "api").replace(/^\/+|\/+$/g, "");
  const swaggerPath = readPath("DEPLOY_SMOKE_SWAGGER_PATH", "docs").replace(/^\/+|\/+$/g, "");
  const frontendPath = readPath("DEPLOY_SMOKE_FRONTEND_PATH", "/overview/dashboard");
  const expectSwaggerPublic = readBoolean("DEPLOY_SMOKE_EXPECT_SWAGGER_PUBLIC", false);
  const platformApiStatuses = [200, 401, 403];
  const swaggerStatuses = expectSwaggerPublic ? [200, 301, 302] : [401, 403, 404];

  const checks = [
    {
      label: "frontend app route",
      url: joinUrl(frontendUrl, frontendPath),
      allowedStatuses: [200],
      bodyIncludes: "<div id=\"root\">",
    },
    {
      label: "frontend API route",
      url: joinUrl(frontendUrl, `/${apiPrefix}/auth/me`),
      allowedStatuses: platformApiStatuses,
    },
    {
      label: "backend API route",
      url: joinUrl(backendUrl, `/${apiPrefix}/auth/me`),
      allowedStatuses: platformApiStatuses,
    },
    {
      label: expectSwaggerPublic ? "Swagger public route" : "Swagger protected route",
      url: joinUrl(backendUrl, `/${swaggerPath}`),
      allowedStatuses: swaggerStatuses,
    },
  ];

  const results = [];
  for (const check of checks) {
    const status = await expectStatus({ ...check, timeoutMs });
    results.push({ label: check.label, status, url: check.url });
  }

  for (const result of results) {
    console.log(`[deploy-smoke] OK ${result.label}: ${result.status} ${result.url}`);
  }
}

main().catch((error) => {
  console.error(`[deploy-smoke] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
