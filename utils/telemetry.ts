import Constants from "expo-constants";

export const ENVIRONMENT = process.env.EXPO_PUBLIC_ENVIRONMENT || (__DEV__ ? "development" : "production");
export const IS_PRODUCTION = ENVIRONMENT === "production";

/**
 * Enterprise Telemetry and Incident Logging Helper
 */
export const telemetry = {
  /**
   * Log exception errors to Sentry or central logging console.
   */
  logException: (error: Error | unknown, extra?: Record<string, any>) => {
    const errorInstance = error instanceof Error ? error : new Error(String(error));

    if (IS_PRODUCTION) {
      // PLUG: Connect Sentry or crashlytics here
      // Sentry.Native.captureException(errorInstance, { extra });
      console.log("[TELEMETRY EXCEPTION]", errorInstance.message, JSON.stringify(extra || {}));
    } else {
      console.error("[DEV TELEMETRY EXCEPTION]", errorInstance.stack || errorInstance.message, extra);
    }
  },

  /**
   * Log warnings to standard console or telemetry log streams.
   */
  logWarning: (message: string, extra?: Record<string, any>) => {
    if (IS_PRODUCTION) {
      // PLUG: Sentry.Native.captureMessage(message, "warning", { extra });
      console.log("[TELEMETRY WARNING]", message, JSON.stringify(extra || {}));
    } else {
      console.warn("[DEV TELEMETRY WARNING]", message, extra);
    }
  },

  /**
   * Log analytics and clickstream events.
   */
  logEvent: (eventName: string, data?: Record<string, any>) => {
    if (IS_PRODUCTION) {
      // PLUG: Analytics service wrapper
      console.log("[TELEMETRY EVENT]", eventName, JSON.stringify(data || {}));
    } else {
      console.log("[DEV TELEMETRY EVENT]", eventName, data);
    }
  },
};
