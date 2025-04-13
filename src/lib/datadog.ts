import { datadogLogs } from "@datadog/browser-logs";
import appVersion from "../../version.json";

export async function initializeDatadog(): Promise<boolean> {
  if (!import.meta.env.VITE_DATADOG_CLIENT_TOKEN) {
    console.warn("Datadog client token not found.");
    return false;
  }
  const token = import.meta.env.VITE_DATADOG_CLIENT_TOKEN;
  
  if (import.meta.env.MODE === "test") {
    console.log("Skipping Datadog initialization in test mode.");
    return false;
  }

  try {
    datadogLogs.init({
      clientToken: token,
      site: import.meta.env.VITE_DATADOG_SITE || "datadoghq.eu",
      forwardErrorsToLogs: true, 
      sessionSampleRate: import.meta.env.VITE_DATADOG_SAMPLE_RATE ? Number(import.meta.env.VITE_DATADOG_SAMPLE_RATE) : 100,
      service: import.meta.env.VITE_SERVICE_NAME || "clicker-game",
      env: import.meta.env.MODE,
      version: appVersion.version
    });

    console.log("Datadog synchronous initialization successful.");
    return true;

  } catch (error: unknown) {
    // This will only catch synchronous errors during init() or the immediate log attempt.
    console.error("Failed to initialize Datadog (synchronous error):", error);
    return false;
  }
}

export const logger = {
  info: (message: string, context: Record<string, unknown> = {}) => {
    if (import.meta.env.VITE_DATADOG_CLIENT_TOKEN && import.meta.env.VITE_DATADOG_CLIENT_TOKEN !== "INVALID") {
      datadogLogs.logger.info(message, context);
    } else {
      console.info(message, context);
    }
  },
  error: (message: string, error: Error, context: Record<string, unknown> = {}) => {
    if (import.meta.env.VITE_DATADOG_CLIENT_TOKEN && import.meta.env.VITE_DATADOG_CLIENT_TOKEN !== "INVALID") {
      datadogLogs.logger.error(message, { error, ...context });
    } else {
      console.error(message, error, context);
    }
  }
};