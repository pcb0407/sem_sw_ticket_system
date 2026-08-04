import "reflect-metadata";

import * as path from "node:path";
import { createPlatformCliDataSource } from "@sem/platform-backend";

const backendRoot = path.resolve(__dirname, "..", "..");

const dataSource = createPlatformCliDataSource({
  backendRoot,
  runtimeProjectName: "sem_sw_ticket_system",
});

export default dataSource;
