import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

let deviceSessionIdPromise: Promise<string> | null = null;

export function getDeviceSessionId(): Promise<string> {
  if (deviceSessionIdPromise) {
    return deviceSessionIdPromise;
  }

  deviceSessionIdPromise = (async () => {
    let deviceSessionId = null;
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") {
        deviceSessionId = localStorage.getItem("golftee_device_session_id");
        if (!deviceSessionId) {
          deviceSessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          localStorage.setItem("golftee_device_session_id", deviceSessionId);
        }
      }
    } else {
      // Try SecureStore first
      try {
        deviceSessionId = await SecureStore.getItemAsync("golftee_device_session_id");
      } catch (err) {
        console.warn("SecureStore failed, attempting AsyncStorage fallback:", err);
      }

      // Fallback to AsyncStorage if SecureStore failed or returned null
      if (!deviceSessionId) {
        try {
          deviceSessionId = await AsyncStorage.getItem("golftee_device_session_id");
        } catch {}
      }

      // Generate new ID if not found anywhere
      if (!deviceSessionId) {
        deviceSessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        try {
          await SecureStore.setItemAsync("golftee_device_session_id", deviceSessionId);
        } catch {}
        try {
          await AsyncStorage.setItem("golftee_device_session_id", deviceSessionId);
        } catch {}
      }
    }
    return deviceSessionId || "unknown-session";
  })();

  return deviceSessionIdPromise;
}
