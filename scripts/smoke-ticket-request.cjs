#!/usr/bin/env node

const { resolveLocalDevConfig } = require("./local-dev-defaults.cjs");

const DEFAULT_TIMEOUT_MS = 10000;

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function joinUrl(origin, pathname) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${trimTrailingSlash(origin)}${normalizedPath}`;
}

function readTimeoutMs() {
  const raw = process.env.SMOKE_TIMEOUT_MS;
  if (!raw) return DEFAULT_TIMEOUT_MS;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function expectJsonResponse(response, label) {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${label} failed with ${response.status}: ${body.slice(0, 300)}`);
  }

  return response.json();
}

function createPumpPayload(masterData) {
  return {
    requester: "smoke-test",
    title: "Smoke Pump Test",
    priorityId: masterData.priorities[0]?.id,
    productId: masterData.products[0]?.id,
    requestSourceId: masterData.requestSources[0]?.id,
    dateFound: "2026-08-05",
    categoryId: masterData.categories[0]?.id,
    rigTypeId: masterData.rigTypes[0]?.id,
    issueTypeId: masterData.issueTypes[0]?.id,
    issuedSiteId: masterData.issuedSites[0]?.id,
    additionalCategoryId: masterData.categories[1]?.id,
    descriptionHtml: "<p>smoke description</p>",
    stepsToReproduceHtml: "<p>smoke steps</p>",
    attachments: [{ fileName: "smoke.txt", sizeBytes: 12, contentType: "text/plain" }],
  };
}

function createControllerPayload(masterData) {
  return {
    requester: "smoke-test",
    title: "Smoke Controller Test",
    priorityId: masterData.priorities[0]?.id,
    productId: masterData.products[0]?.id,
    requestSourceId: masterData.requestSources[0]?.id,
    dateFound: "2026-08-05",
    categoryId: masterData.categories[0]?.id,
    controllerTypeId: masterData.controllerTypes[0]?.id,
    mainVersionId: masterData.softwareMainVersions[0]?.id,
    subVersionId: masterData.softwareSubVersions[0]?.id,
    descriptionHtml: "<p>smoke description</p>",
    stepsToReproduceHtml: "<p>smoke steps</p>",
    attachments: [],
  };
}

function ensureRequiredMasterData(masterData) {
  const requiredKeys = [
    "products",
    "priorities",
    "requestSources",
    "categories",
    "rigTypes",
    "issueTypes",
    "issuedSites",
    "controllerTypes",
    "softwareMainVersions",
    "softwareSubVersions",
  ];

  for (const key of requiredKeys) {
    if (!Array.isArray(masterData[key]) || masterData[key].length === 0) {
      throw new Error(`master-data is missing options for ${key}`);
    }
  }
}

async function main() {
  const config = resolveLocalDevConfig();
  const timeoutMs = readTimeoutMs();
  const backendOrigin = trimTrailingSlash(process.env.SMOKE_BACKEND_URL || config.backend.origin);
  const apiPrefix = config.backend.apiPrefix.replace(/^\/+|\/+$/g, "");
  const basePath = `/${apiPrefix}/ticket-requests`;

  const masterDataUrl = joinUrl(backendOrigin, `${basePath}/master-data`);
  const masterDataResponse = await fetchWithTimeout(masterDataUrl, { method: "GET" }, timeoutMs);
  const masterData = await expectJsonResponse(masterDataResponse, "master-data request");
  ensureRequiredMasterData(masterData);

  const pumpResponse = await fetchWithTimeout(
    joinUrl(backendOrigin, `${basePath}/pump-test-rig`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createPumpPayload(masterData)),
    },
    timeoutMs,
  );
  const pumpResult = await expectJsonResponse(pumpResponse, "pump-test-rig submit");

  const controllerResponse = await fetchWithTimeout(
    joinUrl(backendOrigin, `${basePath}/controller-software`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createControllerPayload(masterData)),
    },
    timeoutMs,
  );
  const controllerResult = await expectJsonResponse(controllerResponse, "controller-software submit");

  for (const result of [pumpResult, controllerResult]) {
    if (!result.requestId || !result.status) {
      throw new Error("submission response missing required fields");
    }
  }

  console.log(`[smoke-ticket-request] OK master-data=${masterDataUrl}`);
  console.log(`[smoke-ticket-request] OK pump-test-rig requestId=${pumpResult.requestId}`);
  console.log(`[smoke-ticket-request] OK controller-software requestId=${controllerResult.requestId}`);
}

main().catch((error) => {
  console.error(`[smoke-ticket-request] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
