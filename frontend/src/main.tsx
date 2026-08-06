import React from "react";
import ReactDOM from "react-dom/client";
import { setupEdwardsFavicon } from "@sem/platform-frontend";
import { PlatformAppRoot } from "@sem/platform-frontend/app";
import { App } from "./App";
import "./styles.css";

setupEdwardsFavicon();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <PlatformAppRoot>
    <App />
  </PlatformAppRoot>,
);
