import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const { getPlatformRuntimeAliases } = createRequire(import.meta.url)("../common-platform/scripts/install-consumer-platform.cjs");

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default {
  resolve: {
    alias: [
      ...getPlatformRuntimeAliases(path.resolve(currentDir, "../common-platform")),
      { find: "@ticket-system/shared", replacement: path.resolve(currentDir, "../shared/src/index.ts") },
      { find: "@sem/platform-frontend/services", replacement: path.resolve(currentDir, "../common-platform/packages/platform-frontend/src/services/index.ts") },
    ],
  },
  test: {
    environment: "node",
    fileParallelism: false,
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    pool: "threads",
  },
};
