import type { Session } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import type { ProfileInsert, ProfileRow, ProfileUpdate } from "../lib/database.types";
import { supabase, supabaseConfigurationError } from "../lib/supabase";

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
    .select("*")
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

async function applySession(session: Session | null) {
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
    return;
  }

  try {
    await loadProfile(session.user.id);
  } catch {
    // Keep the active session and last known profile data when profile refresh fails.
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

  const { data, error } = await supabase.auth.getSession();

  if (error) {
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
}: {
  email: string;
  password: string;
}) {
  if (supabaseConfigurationError) {
    throw new Error(supabaseConfigurationError);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw error;
  }

  await applySession(data.session);
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

  await applySession(data.session);
  return {
    ...data,
    requiresEmailVerification: !data.session,
  };
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

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }

  await clearAuthState();
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

  const payload: ProfileInsert = {
    ...profileUpdate,
    id: userId,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
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
