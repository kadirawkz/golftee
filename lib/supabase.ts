import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import type { Database } from "./database.types";
import { supabaseStorage } from "./supabase-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

const missingEnvMessage =
  "Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your environment.";

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
