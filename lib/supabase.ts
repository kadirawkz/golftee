import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import type { Database } from "./database.types";
import { supabaseStorage } from "./supabase-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

const missingEnvMessage =
  "Server connection is currently unavailable. Please check your network or try again later.";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigurationError = isSupabaseConfigured ? null : missingEnvMessage;

export function assertSupabaseConfigured() {
  if (supabaseConfigurationError) {
    throw new Error(supabaseConfigurationError);
  }
}

export const supabase = createClient<Database>(
  supabaseUrl ?? "https://placeholder-project.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key",
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
      storage: supabaseStorage,
    },
  },
);
