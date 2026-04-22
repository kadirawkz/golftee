import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";
import type { FavoriteCourseInsert } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import { ensureAuthReady, useAuthSession } from "./auth";

const FAVORITE_COURSES_KEY = "golftee:courses:favorites";

type FavoritesSnapshot = {
  initialized: boolean;
  ids: string[];
  loading: boolean;
  error: string | null;
  userId: string | null;
};

type FavoriteListener = () => void;

const DEFAULT_SNAPSHOT: FavoritesSnapshot = {
  initialized: false,
  ids: [],
  loading: false,
  error: null,
  userId: null,
};

let snapshot = DEFAULT_SNAPSHOT;
let pendingLoad: Promise<string[]> | null = null;
const listeners = new Set<FavoriteListener>();

function emitFavoritesChange() {
  for (const listener of listeners) {
    listener();
  }
}

function updateSnapshot(patch: Partial<FavoritesSnapshot>) {
  snapshot = {
    ...snapshot,
    ...patch,
  };
  emitFavoritesChange();
}

function normalizeFavoriteIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

async function readLegacyFavoriteIds() {
  try {
    const storedValue = await AsyncStorage.getItem(FAVORITE_COURSES_KEY);
    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue)
      ? normalizeFavoriteIds(parsedValue.filter((value): value is string => typeof value === "string"))
      : [];
  } catch {
    return [];
  }
}

async function clearLegacyFavoriteIds() {
  try {
    await AsyncStorage.removeItem(FAVORITE_COURSES_KEY);
  } catch {
    // Best effort cleanup.
  }
}

async function fetchFavoriteIdsForUser(userId: string) {
  const { data, error } = await supabase
    .from("favorite_courses")
    .select("course_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return normalizeFavoriteIds(data.map((item) => item.course_id));
}

async function migrateLegacyFavoritesIfNeeded(userId: string, currentFavoriteIds: string[]) {
  if (currentFavoriteIds.length > 0) {
    await clearLegacyFavoriteIds();
    return currentFavoriteIds;
  }

  const legacyFavoriteIds = await readLegacyFavoriteIds();
  if (!legacyFavoriteIds.length) {
    return currentFavoriteIds;
  }

  const rows: FavoriteCourseInsert[] = legacyFavoriteIds.map((courseId) => ({
    user_id: userId,
    course_id: courseId,
  }));

  const { error } = await supabase.from("favorite_courses").upsert(rows, { onConflict: "user_id,course_id" });
  if (error) {
    throw error;
  }

  await clearLegacyFavoriteIds();
  return legacyFavoriteIds;
}

async function loadFavoriteCourseIds() {
  await ensureAuthReady();

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id ?? null;

  if (!userId) {
    updateSnapshot({
      initialized: true,
      ids: [],
      loading: false,
      error: null,
      userId: null,
    });
    return [];
  }

  updateSnapshot({
    loading: true,
    error: null,
    userId,
  });

  const favoriteIds = await fetchFavoriteIdsForUser(userId);
  const resolvedIds = await migrateLegacyFavoritesIfNeeded(userId, favoriteIds);

  updateSnapshot({
    initialized: true,
    ids: resolvedIds,
    loading: false,
    error: null,
    userId,
  });

  return resolvedIds;
}

export function getCachedFavoriteCourseIds() {
  return snapshot.ids;
}

export function subscribeFavoriteCourseIds(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshFavoriteCourseIds() {
  if (!pendingLoad) {
    pendingLoad = loadFavoriteCourseIds().finally(() => {
      pendingLoad = null;
    });
  }

  return pendingLoad;
}

export async function toggleFavoriteCourse(courseId: string) {
  await ensureAuthReady();

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;

  if (!userId) {
    throw new Error("You need to be signed in to manage favourites.");
  }

  const currentIds = snapshot.userId === userId ? snapshot.ids : await refreshFavoriteCourseIds();
  const isFavorite = currentIds.includes(courseId);
  const optimisticIds = isFavorite
    ? currentIds.filter((id) => id !== courseId)
    : normalizeFavoriteIds([courseId, ...currentIds]);

  updateSnapshot({
    initialized: true,
    ids: optimisticIds,
    loading: false,
    error: null,
    userId,
  });

  if (isFavorite) {
    const { error } = await supabase
      .from("favorite_courses")
      .delete()
      .eq("user_id", userId)
      .eq("course_id", courseId);

    if (error) {
      updateSnapshot({
        ids: currentIds,
        error: error.message,
      });
      throw error;
    }

    return optimisticIds;
  }

  const { error } = await supabase.from("favorite_courses").insert({
    user_id: userId,
    course_id: courseId,
  });

  if (error) {
    updateSnapshot({
      ids: currentIds,
      error: error.message,
    });
    throw error;
  }

  return optimisticIds;
}

export function useFavoriteCourseIds() {
  const auth = useAuthSession();
  const favoriteCourseIds = useSyncExternalStore(
    subscribeFavoriteCourseIds,
    getCachedFavoriteCourseIds,
    getCachedFavoriteCourseIds,
  );

  useEffect(() => {
    if (!auth.initialized) {
      return;
    }

    void refreshFavoriteCourseIds();
  }, [auth.initialized, auth.session?.user.id]);

  return favoriteCourseIds;
}

export function useFavoriteCourseState() {
  const auth = useAuthSession();
  const state = useSyncExternalStore(
    subscribeFavoriteCourseIds,
    () => snapshot,
    () => snapshot,
  );

  useEffect(() => {
    if (!auth.initialized) {
      return;
    }

    void refreshFavoriteCourseIds();
  }, [auth.initialized, auth.session?.user.id]);

  return {
    ids: state.ids,
    loading: state.loading,
    initialized: state.initialized,
    error: state.error,
  };
}

export function useIsFavoriteCourse(courseId: string) {
  const favoriteCourseIds = useFavoriteCourseIds();
  return favoriteCourseIds.includes(courseId);
}
