import React from "react";
import ReactDOM from "react-dom/client";
import { EDWARDS_ICON_SRC } from "@sem/platform-frontend";
import { PlatformAppRoot } from "@sem/platform-frontend/app";
import { App } from "./App";
import "./styles.css";

const faviconRels = ["icon", "shortcut icon", "apple-touch-icon"] as const;

for (const rel of faviconRels) {
  const selector = `link[rel='${rel}']`;
  const existing = document.head.querySelector<HTMLLinkElement>(selector);
  const link = existing ?? document.createElement("link");
  link.rel = rel;
  link.href = EDWARDS_ICON_SRC;
  if (!existing) {
    document.head.appendChild(link);
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <PlatformAppRoot>
    <App />
  </PlatformAppRoot>,
);
