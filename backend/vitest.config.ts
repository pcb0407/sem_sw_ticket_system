import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default {
  resolve: {
    alias: [
      { find: "@ticket-system/shared", replacement: path.resolve(currentDir, "../shared/src/index.ts") },
    ],
  },
  test: {
    environment: "node",
    fileParallelism: false,
    globals: true,
    include: ["src/**/*.test.ts"],
    pool: "threads",
  },
};
