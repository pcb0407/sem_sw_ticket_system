import { createPlatformTailwindConfig } from "@sem/platform-frontend/tailwind-preset";

export default createPlatformTailwindConfig({
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../common-platform/packages/platform-frontend/src/**/*.{ts,tsx}",
  ],
});
