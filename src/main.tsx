import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeDatadog, logger } from "./lib/datadog";
import DatadogLogForwarder from "./components/DatadogLogForwarder";

console.log("main.tsx: Application starting...");

const datadogInitialized = initializeDatadog();
if (!datadogInitialized) {
  console.error("Datadog initialization failed");
}
logger.info("Application starting...");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DatadogLogForwarder>
      <App />
    </DatadogLogForwarder>
  </StrictMode>
);
