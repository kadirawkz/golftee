import { LogBox } from "react-native";
import { telemetry, IS_PRODUCTION } from "./telemetry";

if (!IS_PRODUCTION) {
  // Suppress warnings in LogBox during development
  LogBox.ignoreLogs([
    "expo-notifications: Android Push notifications",
    "`expo-notifications` functionality is not fully supported in Expo Go",
  ]);

  // Intercept console.error to discard Metro red-screen overlay for known expo-notifications issues in Dev
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("expo-notifications: Android Push notifications")
    ) {
      return;
    }
    originalConsoleError(...args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("expo-notifications")
    ) {
      return;
    }
    originalConsoleWarn(...args);
  };
} else {
  // In production, capture unexpected console logs and route them to telemetry
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const message = typeof args[0] === "string" ? args[0] : "Console error captured";
    telemetry.logException(new Error(message), { args });
    originalConsoleError(...args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = typeof args[0] === "string" ? args[0] : "Console warning captured";
    telemetry.logWarning(message, { args });
    originalConsoleWarn(...args);
  };
}
