import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Socket } from "node:net";

const require = createRequire(import.meta.url);
const postcssImport = require("postcss-import");
const tailwindcss = require("tailwindcss");
const autoprefixer = require("autoprefixer");
const { loadLocalDevDefaults } = require("../scripts/local-dev-defaults.cjs") as {
  loadLocalDevDefaults: (workspaceRoot?: string) => {
    frontend: { protocol: string; host: string; bindHost?: string; port: number };
    backend: { protocol: string; host: string; proxyHost?: string; port: number; apiPrefix: string };
  };
};

const fallbackNodeModules = path.resolve(__dirname, "../node_modules");
const workspaceNodeModules = resolveNodeModulesWithPackage("react", fallbackNodeModules);
const workspacePackages = [
  { area: "Root", packageJson: readPackageJson("../package.json") },
  { area: "Shared", packageJson: readPackageJson("../shared/package.json") },
  { area: "Backend", packageJson: readPackageJson("../backend/package.json") },
  { area: "Frontend", packageJson: readPackageJson("package.json") },
];
const libraryInfo = workspacePackages
  .flatMap(({ area, packageJson }) => [
    ...Object.entries(packageJson.dependencies ?? {}).map(([name, version]) => ({ area, type: "dependency", name, version })),
    ...Object.entries(packageJson.devDependencies ?? {}).map(([name, version]) => ({ area, type: "devDependency", name, version })),
  ])
  .sort((a, b) => a.area.localeCompare(b.area) || a.name.localeCompare(b.name));

type PackageJson = {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
};

function readPackageJson(relativePath: string) {
  return JSON.parse(readFileSync(path.resolve(__dirname, relativePath), "utf-8")) as PackageJson;
}

function resolveNodeModulesWithPackage(packageName: string, fallback: string) {
  const candidates = [
    fallback,
    ...String(process.env.NODE_PATH || "")
      .split(path.delimiter)
      .map((entry) => entry.trim())
      .filter(Boolean),
  ];

  return candidates.find((candidate) => existsSync(path.join(candidate, packageName, "package.json"))) ?? fallback;
}

function readPort(env: Record<string, string>, key: string, fallback: number) {
  const raw = env[key]?.trim();
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readString(env: Record<string, string>, key: string, fallback: string) {
  const value = env[key]?.trim();
  return value ? value : fallback;
}

function isServerResponse(res: ServerResponse | Socket | undefined): res is ServerResponse {
  return Boolean(res && "writeHead" in res);
}

function writeProxyUnavailable(_err: Error, _req: IncomingMessage, res?: ServerResponse | Socket) {
  if (!isServerResponse(res) || res.headersSent) return;

  res.writeHead(503, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    success: false,
    error: {
      code: "Backend Unavailable",
      message: "The backend development server is still starting. Retry after it is ready.",
    },
  }));
}

export default defineConfig(({ mode }) => {
  const workspaceRoot = path.resolve(process.env.SEM_APP_WORKSPACE_ROOT || process.env.TICKET_SYSTEM_WORKSPACE_ROOT || path.resolve(__dirname, ".."));
  const localDevDefaults = loadLocalDevDefaults(workspaceRoot);
  const rootEnv = loadEnv(mode, workspaceRoot, "");
  const frontendHost = readString(rootEnv, "DEV_FRONTEND_HOST", localDevDefaults.frontend.host);
  const frontendBindHost = readString(rootEnv, "DEV_FRONTEND_BIND_HOST", localDevDefaults.frontend.bindHost ?? frontendHost);
  const frontendPort = readPort(rootEnv, "DEV_FRONTEND_PORT", localDevDefaults.frontend.port);
  const backendProtocol = readString(rootEnv, "DEV_BACKEND_PROTOCOL", localDevDefaults.backend.protocol);
  const backendHost = readString(rootEnv, "DEV_BACKEND_HOST", localDevDefaults.backend.host);
  const backendProxyHost = readString(rootEnv, "DEV_BACKEND_PROXY_HOST", localDevDefaults.backend.proxyHost ?? backendHost);
  const backendPort = readPort(rootEnv, "DEV_BACKEND_PORT", localDevDefaults.backend.port);
  const backendApiPrefix = readString(rootEnv, "DEV_BACKEND_API_PREFIX", localDevDefaults.backend.apiPrefix);

  return {
    envDir: workspaceRoot,
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(workspacePackages.find(({ area }) => area === "Frontend")?.packageJson.version ?? "0.0.0"),
      __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      __PLATFORM_PACKAGES__: JSON.stringify(
        workspacePackages.map(({ area, packageJson }) => ({
          area,
          name: packageJson.name,
          version: packageJson.version,
          engines: packageJson.engines ?? {},
        })),
      ),
      __PLATFORM_LIBRARIES__: JSON.stringify(libraryInfo),
    },
    css: {
      postcss: {
        plugins: [
          postcssImport(),
          tailwindcss({ config: path.resolve(__dirname, "tailwind.config.js") }),
          autoprefixer(),
        ],
      },
    },
    resolve: {
      preserveSymlinks: true,
      alias: [
        { find: /^@$/, replacement: path.resolve(__dirname, "src") },
        { find: "@sem/platform-frontend/styles/index.css", replacement: path.resolve(workspaceRoot, "common-platform/packages/platform-frontend/src/styles/index.css") },
        { find: "@sem/platform-frontend/app", replacement: path.resolve(workspaceRoot, "common-platform/packages/platform-frontend/src/app/index.ts") },
        { find: "@sem/platform-frontend/components", replacement: path.resolve(workspaceRoot, "common-platform/packages/platform-frontend/src/components/index.ts") },
        { find: "@sem/platform-frontend/features/auth", replacement: path.resolve(workspaceRoot, "common-platform/packages/platform-frontend/src/features/auth/index.ts") },
        { find: "@sem/platform-frontend/features/navigation", replacement: path.resolve(workspaceRoot, "common-platform/packages/platform-frontend/src/features/navigation/index.ts") },
        { find: "@sem/platform-frontend/features/notifications", replacement: path.resolve(workspaceRoot, "common-platform/packages/platform-frontend/src/features/notifications/index.ts") },
        { find: "@sem/platform-frontend/layouts", replacement: path.resolve(workspaceRoot, "common-platform/packages/platform-frontend/src/layouts/index.ts") },
        { find: "@sem/platform-frontend/pages", replacement: path.resolve(workspaceRoot, "common-platform/packages/platform-frontend/src/pages/index.ts") },
        { find: "@sem/platform-frontend/services", replacement: path.resolve(workspaceRoot, "common-platform/packages/platform-frontend/src/services/index.ts") },
        { find: "@ticket-system/shared", replacement: path.resolve(workspaceRoot, "shared/src/index.ts") },
        { find: /^@sem\/platform-frontend$/, replacement: path.resolve(workspaceRoot, "common-platform/packages/platform-frontend/src/index.ts") },
        { find: "@sem/platform-shared", replacement: path.resolve(workspaceRoot, "common-platform/packages/platform-shared/src/index.ts") },
        { find: /^axios$/, replacement: path.join(workspaceNodeModules, "axios") },
        { find: /^clsx$/, replacement: path.join(workspaceNodeModules, "clsx") },
        { find: /^html2canvas$/, replacement: path.join(workspaceNodeModules, "html2canvas") },
        { find: /^lucide-react$/, replacement: path.join(workspaceNodeModules, "lucide-react") },
        { find: /^react$/, replacement: path.join(workspaceNodeModules, "react") },
        { find: /^react\/jsx-runtime$/, replacement: path.join(workspaceNodeModules, "react/jsx-runtime.js") },
        { find: /^react\/jsx-dev-runtime$/, replacement: path.join(workspaceNodeModules, "react/jsx-dev-runtime.js") },
        { find: /^react-dom$/, replacement: path.join(workspaceNodeModules, "react-dom") },
        { find: /^react-dom\/client$/, replacement: path.join(workspaceNodeModules, "react-dom/client.js") },
        { find: /^react-router$/, replacement: path.join(workspaceNodeModules, "react-router") },
        { find: /^react-router-dom$/, replacement: path.join(workspaceNodeModules, "react-router-dom") },
        { find: "@tanstack/react-query", replacement: path.join(workspaceNodeModules, "@tanstack/react-query") },
      ],
      dedupe: ["react", "react-dom", "react-router", "react-router-dom", "@tanstack/react-query"],
    },
    server: {
      host: frontendBindHost,
      port: frontendPort,
      strictPort: true,
      proxy: {
        [`/${backendApiPrefix}`]: {
          target: `${backendProtocol}://${backendProxyHost}:${backendPort}`,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on("error", writeProxyUnavailable);
          },
        },
      },
    },
    build: {
      outDir: "dist",
    },
  };
});
