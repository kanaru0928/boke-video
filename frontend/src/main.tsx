import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { appConfig } from "./shared/config/config";
import "./styles.css";

const app = document.querySelector("#app");
if (!(app instanceof HTMLElement)) {
  throw new Error("app element is missing");
}

createRoot(app).render(
  <StrictMode>
    <App config={appConfig} />
  </StrictMode>,
);
