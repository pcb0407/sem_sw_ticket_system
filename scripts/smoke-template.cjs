#!/usr/bin/env node

const { resolveLocalDevConfig } = require("./local-dev-defaults.cjs");

const DEFAULT_TIMEOUT_MS = 10_000;

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function joinUrl(origin, pathname) {
  return `${trimTrailingSlash(origin)}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function readTimeoutMs() {
  const raw = process.env.SMOKE_TIMEOUT_MS;
  if (!raw) return DEFAULT_TIMEOUT_MS;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
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

function formatAllowedStatuses(statuses) {
  return statuses.join(", ");
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
  const config = resolveLocalDevConfig();
  const timeoutMs = readTimeoutMs();
  const frontendUrl = trimTrailingSlash(process.env.SMOKE_FRONTEND_URL || config.frontend.url);
  const backendOrigin = trimTrailingSlash(process.env.SMOKE_BACKEND_URL || config.backend.origin);
  const apiPrefix = config.backend.apiPrefix.replace(/^\/+|\/+$/g, "");
  const swaggerPath = config.backend.swaggerPath.replace(/^\/+|\/+$/g, "");

  const checks = [
    {
      label: "frontend app route",
      url: joinUrl(frontendUrl, "/overview/dashboard"),
      allowedStatuses: [200],
      bodyIncludes: "<div id=\"root\">",
    },
    {
      label: "frontend API proxy route",
      url: joinUrl(frontendUrl, `/${apiPrefix}/auth/me`),
      allowedStatuses: [200, 401, 403],
    },
    {
      label: "backend platform API route",
      url: joinUrl(backendOrigin, `/${apiPrefix}/auth/me`),
      allowedStatuses: [200, 401, 403],
    },
    {
      label: "backend Swagger route",
      url: joinUrl(backendOrigin, `/${swaggerPath}`),
      allowedStatuses: [200, 301, 302],
    },
  ];

  const results = [];
  for (const check of checks) {
    const status = await expectStatus({ ...check, timeoutMs });
    results.push({ label: check.label, status, url: check.url });
  }

  for (const result of results) {
    console.log(`[smoke] OK ${result.label}: ${result.status} ${result.url}`);
  }
}

main().catch((error) => {
  console.error(`[smoke] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
