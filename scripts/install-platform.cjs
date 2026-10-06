"use strict";

const path = require("node:path");
const { ensurePlatformRoot } = require("./ensure-platform-root.cjs");

function installPlatform() {
  const result = ensurePlatformRoot();
  if (!["linked", "present"].includes(result.status)) {
    throw new Error(`Common platform is not ready (${result.status}). Run npm run platform:link.`);
  }
  const workspaceRoot = path.resolve(__dirname, "..");
  const { installConsumerPlatform } = require(path.join(workspaceRoot, "common-platform", "scripts", "install-consumer-platform.cjs"));
  installConsumerPlatform({ workspaceRoot });
}

module.exports = { installPlatform };

if (require.main === module) installPlatform();