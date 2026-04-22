import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const SECURE_STORE_PREFIX = "golftee:supabase:";

function getSecureStoreKey(key: string) {
  return `${SECURE_STORE_PREFIX}${key}`;
}

export const supabaseStorage = {
  async getItem(key: string): Promise<string | null> {
    const secureStoreKey = getSecureStoreKey(key);

    try {
      const secureValue = await SecureStore.getItemAsync(secureStoreKey);
      if (secureValue !== null) {
        return secureValue;
      }
    } catch {
      // Fall back to AsyncStorage if SecureStore is unavailable.
    }

    return AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    const secureStoreKey = getSecureStoreKey(key);

    try {
      await SecureStore.setItemAsync(secureStoreKey, value);
      await AsyncStorage.removeItem(key);
      return;
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    const secureStoreKey = getSecureStoreKey(key);

    try {
      await SecureStore.deleteItemAsync(secureStoreKey);
    } catch {
      // Best effort cleanup.
    }

    await AsyncStorage.removeItem(key);
  },
};
