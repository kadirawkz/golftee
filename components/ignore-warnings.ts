import { LogBox } from "react-native";

// Ignore Expo Go push notifications warning/error on SDK 53/54 in LogBox
LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications",
  "`expo-notifications` functionality is not fully supported in Expo Go",
]);

// Since expo-notifications triggers console.error during module evaluation,
// and React Native's Metro handler turns console.error into a red screen overlay,
// we override console.error to intercept and discard this specific warning.
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes("expo-notifications: Android Push notifications")
  ) {
    // Discard the warning to prevent the red screen crash in Expo Go
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
