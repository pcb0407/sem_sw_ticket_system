import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPlatformTailwindConfig } from "@sem/platform-frontend/tailwind-preset";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const dependencyWorkspaceRoot = path.resolve(frontendRoot, "..");
const platformFrontendRoot = path.resolve(dependencyWorkspaceRoot, "node_modules", "@sem/platform-frontend");

export default createPlatformTailwindConfig({
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    path.join(platformFrontendRoot, "src/**/*.{ts,tsx}"),
    path.join(platformFrontendRoot, "dist/**/*.{js,jsx,ts,tsx}"),
  ],
});
