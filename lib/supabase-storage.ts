import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SECURE_STORE_PREFIX = "golftee:supabase:";

function getSecureStoreKey(key: string) {
  return `${SECURE_STORE_PREFIX}${key}`;
}

const isServer = typeof window === "undefined";

export const supabaseStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isServer) {
      return null;
    }
    const secureStoreKey = getSecureStoreKey(key);

    try {
      if (Platform.OS !== "web") {
        const secureValue = await SecureStore.getItemAsync(secureStoreKey);
        if (secureValue !== null) {
          return secureValue;
        }
      }
    } catch {
      // Fall back to AsyncStorage if SecureStore is unavailable.
    }

    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isServer) {
      return;
    }
    const secureStoreKey = getSecureStoreKey(key);

    try {
      if (Platform.OS !== "web") {
        await SecureStore.setItemAsync(secureStoreKey, value);
        try {
          await AsyncStorage.removeItem(key);
        } catch {}
        return;
      }
    } catch {
      // Fall back to AsyncStorage
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },

  async removeItem(key: string): Promise<void> {
    if (isServer) {
      return;
    }
    const secureStoreKey = getSecureStoreKey(key);

    try {
      if (Platform.OS !== "web") {
        await SecureStore.deleteItemAsync(secureStoreKey);
      }
    } catch {
      // Best effort cleanup.
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};
