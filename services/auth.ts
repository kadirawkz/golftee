import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { Session, RealtimeChannel } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { getCachedUserLocation } from "./course-data";
import type { ProfileRow, ProfileUpdate } from "../lib/database.types";
import { supabase, supabaseConfigurationError } from "../lib/supabase";
import { addNotification, setNotificationsUser } from "./notifications";

type AuthSnapshot = {
  initialized: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  profile: ProfileRow | null;
  profileLoading: boolean;
  profileError: string | null;
};

type AuthListener = () => void;

const DEFAULT_SNAPSHOT: AuthSnapshot = {
  initialized: false,
  isAuthenticated: false,
  session: null,
  profile: null,
  profileLoading: false,
  profileError: null,
};

let snapshot = DEFAULT_SNAPSHOT;
let initPromise: Promise<void> | null = null;
let authListenerAttached = false;
const listeners = new Set<AuthListener>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function updateSnapshot(patch: Partial<AuthSnapshot>) {
  snapshot = {
    ...snapshot,
    ...patch,
  };
  emitChange();
}

function formatAuthErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

async function loadProfile(userId: string) {
  updateSnapshot({ profileLoading: true, profileError: null });

  const { data, error } = await supabase
    .from("profiles")
    .select("*, membership_tiers(name)")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    const message = formatAuthErrorMessage(error, "Unable to load your profile.");
    updateSnapshot({
      profile: snapshot.profile,
      profileLoading: false,
      profileError: message,
    });
    throw new Error(message);
  }

  updateSnapshot({
    profile: data,
    profileLoading: false,
    profileError: null,
  });

  return data;
}

let sessionRealtimeChannel: RealtimeChannel | null = null;
let sessionRealtimeGeneration = 0;

async function unsubscribeSessionRealtime() {
  const channel = sessionRealtimeChannel;
  sessionRealtimeChannel = null;
  if (channel) {
    await supabase.removeChannel(channel);
  }
}

async function subscribeSessionRealtime(userId: string) {
  const generation = ++sessionRealtimeGeneration;
  await unsubscribeSessionRealtime();

  const deviceSessionId = await getDeviceSessionId();
  if (generation !== sessionRealtimeGeneration) {
    return;
  }

  const channel = supabase
    .channel(`user_sessions_sync:${userId}:${deviceSessionId}`)
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "user_sessions",
        filter: `device_session_id=eq.${deviceSessionId}`,
      },
      async () => {
        console.log("Active device session was remotely logged out. Signing out...");
        try {
          await signOut();
        } catch (err) {
          console.warn("Failed to sign out after remote revocation:", err);
        }
      }
    );

  sessionRealtimeChannel = channel;
  channel.subscribe();
}

async function applySession(session: Session | null) {
  setNotificationsUser(session?.user?.id ?? null);
  updateSnapshot({
    initialized: true,
    isAuthenticated: Boolean(session),
    session,
    profile: session ? snapshot.profile : null,
    profileError: null,
  });

  if (!session?.user?.id) {
    updateSnapshot({
      profile: null,
      profileLoading: false,
    });
    unsubscribeSessionRealtime();
    return;
  }

  try {
    await loadProfile(session.user.id);
    void trackSession(session);
    void subscribeSessionRealtime(session.user.id);
  } catch {
    // Keep the active session and last known profile data when profile refresh fails.
  }
}

import { getDeviceSessionId } from "./device";
export { getDeviceSessionId };

async function fetchIpLocation(): Promise<string> {
  const providers = [
    { url: "https://ipapi.co/json/", key: "city" },
    { url: "https://ip-api.com/json/", key: "city" },
    { url: "https://ipinfo.io/json", key: "city" }
  ];

  for (const provider of providers) {
    try {
      const response = await fetch(provider.url);
      if (response.ok) {
        const data = await response.json();
        if (data && data[provider.key]) {
          return data[provider.key];
        }
      }
    } catch (e) {
      console.warn(`IP location provider ${provider.url} failed:`, e);
    }
  }
  return "Unknown";
}

export async function trackSession(session: Session) {
  try {
    const userId = session.user.id;
    const deviceSessionId = await getDeviceSessionId();

    const clientType = Platform.OS === "web" ? "web" : "mobile";
    let osName = Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Web";
    let deviceName = Constants.deviceName ?? (Platform.OS === "ios" ? "iPhone" : Platform.OS === "android" ? "Android Device" : "Browser");

    if (Platform.OS === "web" && typeof window !== "undefined" && window.navigator) {
      const ua = window.navigator.userAgent;
      if (ua.indexOf("Win") !== -1) osName = "Windows";
      else if (ua.indexOf("Mac") !== -1) osName = "macOS";
      else if (ua.indexOf("Linux") !== -1) osName = "Linux";
      else if (ua.indexOf("Android") !== -1) osName = "Android";
      else if (ua.indexOf("like Mac") !== -1) osName = "iOS";

      if (ua.indexOf("Chrome") !== -1) deviceName = "Chrome Browser";
      else if (ua.indexOf("Safari") !== -1) deviceName = "Safari Browser";
      else if (ua.indexOf("Firefox") !== -1) deviceName = "Firefox Browser";
      else if (ua.indexOf("Edge") !== -1) deviceName = "Edge Browser";
      else deviceName = "Web Browser";
    }

    let locationStr = "Unknown";
    const cached = getCachedUserLocation();
    if (cached) {
      try {
        if (Platform.OS === "web") {
          // On Web, reverseGeocodeAsync is not supported or requires configuration, use Nominatim API
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${cached.latitude}&lon=${cached.longitude}`,
            {
              headers: {
                "User-Agent": "GolfTeeApp/1.0",
              },
            }
          );
          if (response.ok) {
            const data = await response.json();
            const addr = data.address;
            if (addr) {
              locationStr = addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? addr.state ?? addr.country ?? "Unknown";
            }
          }
        } else {
          const address = await Location.reverseGeocodeAsync(cached);
          if (address && address[0]) {
            locationStr = address[0].city ?? address[0].subregion ?? address[0].region ?? "Sri Lanka";
          }
        }
      } catch {
        // Fallback to IP geolocation if coordinate geocoding fails
        locationStr = await fetchIpLocation();
      }
    } else {
      // If GPS coordinates are not yet available/granted, fetch IP-based location
      locationStr = await fetchIpLocation();
    }

    const { error } = await supabase.from("user_sessions").upsert({
      user_id: userId,
      device_session_id: deviceSessionId,
      device_name: deviceName,
      os_name: osName,
      client_type: clientType,
      location: locationStr,
      last_active_at: new Date().toISOString(),
    }, {
      onConflict: "user_id,device_session_id"
    });

    if (error) {
      throw error;
    }
  } catch (err) {
    console.warn("Failed to track active session:", err);
  }
}

export async function getActiveSessions() {
  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .order("last_active_at", { ascending: false });

  if (error) {
    throw error;
  }
  return data;
}

export async function deleteActiveSession(id: string) {
  const { error } = await supabase
    .from("user_sessions")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

async function bootstrapAuth() {
  if (snapshot.initialized) {
    return;
  }

  if (supabaseConfigurationError) {
    updateSnapshot({
      initialized: true,
      isAuthenticated: false,
      session: null,
      profile: null,
      profileLoading: false,
      profileError: supabaseConfigurationError,
    });
    return;
  }

  let rememberMe = true;
  try {
    const flag = await SecureStore.getItemAsync("golftee:remember_me");
    if (flag === "false") {
      rememberMe = false;
    }
  } catch {
    try {
      const flag = await AsyncStorage.getItem("golftee:remember_me");
      if (flag === "false") {
        rememberMe = false;
      }
    } catch {}
  }

  if (!rememberMe) {
    try {
      await supabase.auth.signOut();
    } catch {}
    updateSnapshot({
      initialized: true,
      isAuthenticated: false,
      session: null,
      profile: null,
      profileLoading: false,
      profileError: null,
    });

    if (!authListenerAttached) {
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        void applySession(nextSession);
      });
      authListenerAttached = true;
    }
    return;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    try {
      await supabase.auth.signOut();
    } catch {}
    updateSnapshot({
      initialized: true,
      isAuthenticated: false,
      session: null,
      profile: null,
      profileLoading: false,
      profileError: formatAuthErrorMessage(error, "Unable to restore your session."),
    });
  } else {
    await applySession(data.session);
  }

  if (!authListenerAttached) {
    supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    authListenerAttached = true;
  }
}

export async function ensureAuthReady() {
  if (!initPromise) {
    initPromise = bootstrapAuth().finally(() => {
      initPromise = null;
    });
  }

  await initPromise;
}

export async function getIsLoggedIn(): Promise<boolean> {
  await ensureAuthReady();
  return snapshot.isAuthenticated;
}

export async function signInWithEmail({
  email,
  password,
  rememberMe = true,
}: {
  email: string;
  password: string;
  rememberMe?: boolean;
}) {
  if (supabaseConfigurationError) {
    throw new Error(supabaseConfigurationError);
  }

  try {
    await SecureStore.setItemAsync("golftee:remember_me", rememberMe ? "true" : "false");
  } catch {
    try {
      await AsyncStorage.setItem("golftee:remember_me", rememberMe ? "true" : "false");
    } catch {}
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw error;
  }

  await applySession(data.session);
 
  // Dispatch Secure Login and New Login Detected notifications
  try {
    const username = data.session?.user?.user_metadata?.username ?? data.session?.user?.email ?? "Golfer";
    const deviceSessionId = await getDeviceSessionId();
    
    // 1. "Secure Login" notification targeting ONLY this device
    void addNotification(
      "account",
      "Secure Login",
      `Successful login detected for user ${username}.`,
      "shield-checkmark",
      {
        actionText: "View Profile",
        route: "/profile",
        triggerSystemNotification: true,
        routeParams: { target_device_id: deviceSessionId },
      }
    );

    // Get device details for the warning notification
    let deviceName = Constants.deviceName ?? (Platform.OS === "ios" ? "iPhone" : Platform.OS === "android" ? "Android Device" : "Browser");
    let osName = Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Web";
    if (Platform.OS === "web" && typeof window !== "undefined" && window.navigator) {
      const ua = window.navigator.userAgent;
      if (ua.indexOf("Win") !== -1) osName = "Windows";
      else if (ua.indexOf("Mac") !== -1) osName = "macOS";
      else if (ua.indexOf("Linux") !== -1) osName = "Linux";
      else if (ua.indexOf("Android") !== -1) osName = "Android";
      else if (ua.indexOf("like Mac") !== -1) osName = "iOS";

      if (ua.indexOf("Chrome") !== -1) deviceName = "Chrome Browser";
      else if (ua.indexOf("Safari") !== -1) deviceName = "Safari Browser";
      else if (ua.indexOf("Firefox") !== -1) deviceName = "Firefox Browser";
      else if (ua.indexOf("Edge") !== -1) deviceName = "Edge Browser";
    }

    let locationStr = "Unknown Location";
    const cached = getCachedUserLocation();
    if (cached) {
      try {
        if (Platform.OS === "web") {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${cached.latitude}&lon=${cached.longitude}`,
            { headers: { "User-Agent": "GolfTeeApp/1.0" } }
          );
          if (response.ok) {
            const data = await response.json();
            const addr = data.address;
            if (addr) locationStr = addr.city ?? addr.town ?? addr.village ?? "Colombo";
          }
        } else {
          const address = await Location.reverseGeocodeAsync(cached);
          if (address && address[0]) {
            locationStr = address[0].city ?? address[0].subregion ?? "Colombo";
          }
        }
      } catch {
        locationStr = await fetchIpLocation().catch(() => "Colombo");
      }
    } else {
      locationStr = await fetchIpLocation().catch(() => "Colombo");
    }

    // 2. "New Login Detected" warning notification EXCLUDING this device
    void addNotification(
      "account",
      "New Login Detected",
      `A new ${osName} device (${deviceName}) logged in from ${locationStr}. If this wasn't you, change your password immediately.`,
      "warning",
      {
        actionText: "Review Devices",
        route: "/settings",
        triggerSystemNotification: true,
        routeParams: { exclude_device_id: deviceSessionId },
      }
    );
  } catch (err) {
    console.warn("Failed to dispatch login notification", err);
  }
 
  return data;
}

export async function signUpWithEmail({
  email,
  password,
  username,
  handicap,
}: {
  email: string;
  password: string;
  username: string;
  handicap?: number | null;
}) {
  if (supabaseConfigurationError) {
    throw new Error(supabaseConfigurationError);
  }

  const normalizedUsername = username.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        username: normalizedUsername,
        full_name: username.trim(),
        handicap: handicap == null ? null : handicap.toFixed(1),
      },
    },
  });

  if (error) {
    throw error;
  }

  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error("An account with this email already exists. Please log in instead.");
  }

  await applySession(data.session);

  // Dispatch Welcome notification if session is active immediately
  if (data.session) {
    try {
      void addNotification(
        "updates",
        "Welcome to GolfTee!",
        `Hey ${username.trim()}, explore world-class courses and book your first tee time today!`,
        "golf",
        {
          actionText: "Explore Courses",
          route: "/explore",
          triggerSystemNotification: true,
        }
      );
    } catch (err) {
      console.warn("Failed to dispatch signup notification", err);
    }
  }

  return {
    ...data,
    requiresEmailVerification: !data.session,
  };
}

export async function resendVerificationEmail(email: string) {
  if (supabaseConfigurationError) {
    throw new Error(supabaseConfigurationError);
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
  });

  if (error) {
    throw error;
  }
}


export async function sendPasswordResetEmail(email: string) {
  if (supabaseConfigurationError) {
    throw new Error(supabaseConfigurationError);
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());

  if (error) {
    throw error;
  }
}

export async function signOut() {
  if (supabaseConfigurationError) {
    await clearAuthState();
    return;
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn("Supabase auth.signOut returned error:", error);
    }
  } catch (err) {
    console.warn("Supabase auth.signOut failed:", err);
  } finally {
    await clearAuthState();
  }
}

export async function refreshProfile() {
  await ensureAuthReady();

  const userId = snapshot.session?.user?.id;
  if (!userId) {
    updateSnapshot({
      profile: null,
      profileLoading: false,
      profileError: null,
    });
    return null;
  }

  return loadProfile(userId);
}

export async function updateProfile(profileUpdate: ProfileUpdate) {
  if (supabaseConfigurationError) {
    throw new Error(supabaseConfigurationError);
  }

  await ensureAuthReady();

  const userId = snapshot.session?.user?.id;
  if (!userId) {
    throw new Error("You need to be signed in to update your profile.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  updateSnapshot({
    profile: data,
    profileError: null,
    profileLoading: false,
  });

  // Dispatch Profile update notification
  try {
    const updatedFields = Object.keys(profileUpdate);
    let title = "Profile Updated";
    let message = "Your profile information has been successfully updated.";
    let icon = "person";

    if (updatedFields.includes("handicap")) {
      title = "Handicap Updated";
      message = `Your handicap has been updated to ${profileUpdate.handicap ?? "N/A"}.`;
      icon = "golf";
    }

    void addNotification("account", title, message, icon, {
      actionText: "View Profile",
      route: "/profile",
    });
  } catch (err) {
    console.warn("Failed to dispatch profile update notification", err);
  }

  return data;
}

export function getAuthConfigurationError() {
  return supabaseConfigurationError;
}

export function useAuthSession() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      void ensureAuthReady();

      return () => {
        listeners.delete(listener);
      };
    },
    () => snapshot,
    () => snapshot,
  );
}

let clearAuthState = async () => {
  snapshot = {
    initialized: true,
    isAuthenticated: false,
    session: null,
    profile: null,
    profileLoading: false,
    profileError: null,
  };
  emitChange();
};
