import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const AUTH_STATE_KEY = "golftee:auth:logged-in";
let authState: boolean | null = null;
let pendingAuthStateRead: Promise<boolean> | null = null;

async function readPersistedAuthState(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_STATE_KEY);
  } catch {
    return await AsyncStorage.getItem(AUTH_STATE_KEY);
  }
}

async function persistAuthState(value: boolean): Promise<void> {
  if (value) {
    try {
      await SecureStore.setItemAsync(AUTH_STATE_KEY, "true");
      await AsyncStorage.removeItem(AUTH_STATE_KEY);
      return;
    } catch {
      await AsyncStorage.setItem(AUTH_STATE_KEY, "true");
      return;
    }
  }

  try {
    await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
  } catch {
    // Best effort delete. Fall through to AsyncStorage cleanup.
  }
  await AsyncStorage.removeItem(AUTH_STATE_KEY);
}

async function migrateLegacyAuthStateIfNeeded() {
  let migratedToSecureStore = false;

  try {
    const legacyValue = await AsyncStorage.getItem(AUTH_STATE_KEY);
    if (legacyValue === "true") {
      await SecureStore.setItemAsync(AUTH_STATE_KEY, "true");
      migratedToSecureStore = true;
    }
  } catch {
    // Ignore migration failures and keep current storage as source of truth.
  }

  if (migratedToSecureStore) {
    try {
      await AsyncStorage.removeItem(AUTH_STATE_KEY);
    } catch {
      // Ignore legacy cleanup failures.
    }
  }
}

export async function getIsLoggedIn(): Promise<boolean> {
  if (authState !== null) {
    return authState;
  }

  if (pendingAuthStateRead) {
    return pendingAuthStateRead;
  }

  pendingAuthStateRead = (async () => {
    try {
      const value = await readPersistedAuthState();
      authState = value === "true";
      if (authState) {
        await migrateLegacyAuthStateIfNeeded();
      }
      return authState;
    } catch {
      authState = false;
      return false;
    } finally {
      pendingAuthStateRead = null;
    }
  })();

  return pendingAuthStateRead;
}

export async function setIsLoggedIn(value: boolean, rememberMe = false): Promise<void> {
  try {
    if (!value) {
      await persistAuthState(false);
      authState = false;
      return;
    }

    if (rememberMe) {
      await persistAuthState(true);
      authState = true;
      return;
    }

    await persistAuthState(false);
    authState = true;
  } catch {
    authState = value;
  }
}
