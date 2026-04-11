import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

const FAVORITE_COURSES_KEY = "golftee:courses:favorites";
const DEFAULT_FAVORITE_COURSE_IDS = ["1", "3", "6"];

let favoriteCourseIdsCache: string[] | null = null;
const listeners = new Set<() => void>();

function normalizeFavoriteIds(ids: string[]) {
  return Array.from(new Set(ids));
}

function emitFavoritesChange() {
  listeners.forEach((listener) => listener());
}

async function persistFavoriteCourseIds(ids: string[]) {
  try {
    await AsyncStorage.setItem(FAVORITE_COURSES_KEY, JSON.stringify(ids));
  } catch {
    // Keep the in-memory state responsive even if persistence fails.
  }
}

export function getCachedFavoriteCourseIds() {
  return favoriteCourseIdsCache ?? DEFAULT_FAVORITE_COURSE_IDS;
}

export async function loadFavoriteCourseIds() {
  if (favoriteCourseIdsCache !== null) {
    return favoriteCourseIdsCache;
  }

  try {
    const storedValue = await AsyncStorage.getItem(FAVORITE_COURSES_KEY);
    if (!storedValue) {
      favoriteCourseIdsCache = DEFAULT_FAVORITE_COURSE_IDS;
      await persistFavoriteCourseIds(favoriteCourseIdsCache);
      emitFavoritesChange();
      return favoriteCourseIdsCache;
    }

    const parsedValue = JSON.parse(storedValue);
    favoriteCourseIdsCache = Array.isArray(parsedValue)
      ? normalizeFavoriteIds(parsedValue.filter((value): value is string => typeof value === "string"))
      : DEFAULT_FAVORITE_COURSE_IDS;
  } catch {
    favoriteCourseIdsCache = DEFAULT_FAVORITE_COURSE_IDS;
  }

  emitFavoritesChange();
  return favoriteCourseIdsCache;
}

export function subscribeFavoriteCourseIds(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function toggleFavoriteCourse(courseId: string) {
  const currentIds = await loadFavoriteCourseIds();
  const nextIds = currentIds.includes(courseId)
    ? currentIds.filter((id) => id !== courseId)
    : [...currentIds, courseId];

  favoriteCourseIdsCache = nextIds;
  emitFavoritesChange();
  await persistFavoriteCourseIds(nextIds);
  return nextIds;
}

export function useFavoriteCourseIds() {
  const favoriteCourseIds = useSyncExternalStore(
    subscribeFavoriteCourseIds,
    getCachedFavoriteCourseIds,
    getCachedFavoriteCourseIds
  );

  useEffect(() => {
    void loadFavoriteCourseIds();
  }, []);

  return favoriteCourseIds;
}

export function useIsFavoriteCourse(courseId: string) {
  const favoriteCourseIds = useFavoriteCourseIds();
  return favoriteCourseIds.includes(courseId);
}
