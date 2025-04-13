import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeDatadog, logger } from "./lib/datadog";
import DatadogLogForwarder from "./components/DatadogLogForwarder";
import { PostHogProvider } from 'posthog-js/react';

console.log("main.tsx: Application starting...");

const datadogInitialized = initializeDatadog();
if (!datadogInitialized) {
  console.error("Datadog initialization failed");
}
logger.info("Application starting...");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={{api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST}}
    >
      <DatadogLogForwarder>
        <App />
      </DatadogLogForwarder>
    </PostHogProvider>
  </StrictMode>
);
