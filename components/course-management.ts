import { useEffect, useSyncExternalStore } from "react";
import type { CourseContentRow, CourseDetailItemRow, CourseReviewRow, GolfCourseRow } from "../lib/database.types";
import { assertSupabaseConfigured, supabase } from "../lib/supabase";
import {
    type CourseRecord,
    type CourseStyle,
} from "./course-data";

type CourseCatalogSnapshot = {
  courses: CourseRecord[];
  error: string | null;
  initialized: boolean;
  loading: boolean;
};

type TeeSlot = {
  isAvailable: boolean;
  isPast: boolean;
  maxPlayers: number;
  teeTime: string;
  timePeriod: "MORNING" | "AFTERNOON";
};

type NextBookableTeeSlot = {
  maxPlayers: number;
  teeDate: string;
  teeTime: string;
  timePeriod: "MORNING" | "AFTERNOON";
};

type CourseDetails = {
  content: CourseContentRow | null;
  detailItems: CourseDetailItemRow[];
  reviews: CourseReviewRow[];
};

type CourseDetailsSnapshot = {
  error: string | null;
  initialized: boolean;
  loading: boolean;
  value: CourseDetails | null;
};

const DEFAULT_COURSE_DETAILS_SNAPSHOT: CourseDetailsSnapshot = {
  error: null,
  initialized: false,
  loading: false,
  value: null,
};

type CourseCatalogListener = () => void;
type CourseDetailsListener = () => void;

const DEFAULT_SNAPSHOT: CourseCatalogSnapshot = {
  courses: [],
  error: null,
  initialized: false,
  loading: false,
};

let snapshot = DEFAULT_SNAPSHOT;
let pendingCourseLoad: Promise<CourseRecord[]> | null = null;
const listeners = new Set<CourseCatalogListener>();
const courseDetailsSnapshots = new Map<string, CourseDetailsSnapshot>();
const courseDetailsListeners = new Map<string, Set<CourseDetailsListener>>();
const pendingCourseDetailsLoads = new Map<string, Promise<CourseDetails>>();

function emitCourseCatalogChange() {
  for (const listener of listeners) {
    listener();
  }
}

function updateSnapshot(patch: Partial<CourseCatalogSnapshot>) {
  snapshot = {
    ...snapshot,
    ...patch,
  };
  emitCourseCatalogChange();
}

function mapRowToCourse(row: any): CourseRecord {
  return {
    id: row.id,
    title: row.title,
    price: `$${Math.round(row.price)}`,
    rating: row.rating.toFixed(1),
    location: row.locations?.city_name ?? "Unknown",
    placeQuery: row.place_query,
    placeId: row.place_id ?? undefined,
    image: row.image,
    style: (row.course_styles?.name ?? "PARKLAND") as CourseStyle,
    coordinates: {
      latitude: row.latitude,
      longitude: row.longitude,
    },
  };
}

function createPlaceholderCourse(id?: string): CourseRecord {
  return {
    id: id ?? "unknown",
    title: "Course Unavailable",
    price: "$0",
    rating: "0.0",
    location: "Sri Lanka",
    placeQuery: "Sri Lanka",
    image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=1200&q=80",
    style: "PARKLAND",
    coordinates: {
      latitude: 6.9271,
      longitude: 79.8612,
    },
  };
}

export function getCourseCatalog() {
  return snapshot.courses;
}

export function getManagedCourseById(id: string | undefined) {
  const course = snapshot.courses.find((item) => item.id === id);
  return course ?? createPlaceholderCourse(id);
}

async function loadCourseCatalogInternal() {
  try {
    assertSupabaseConfigured();
  } catch (error) {
    updateSnapshot({
      courses: [],
      error: error instanceof Error ? error.message : "Unable to load courses.",
      initialized: true,
      loading: false,
    });
    return [];
  }

  updateSnapshot({
    loading: true,
    error: null,
  });

  const { data, error } = await supabase
    .from("golf_courses")
    .select("*, locations(city_name), course_styles(name)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    updateSnapshot({
      courses: [],
      error: error.message,
      initialized: true,
      loading: false,
    });
    return [];
  }

  const nextCourses = data.map(mapRowToCourse);
  updateSnapshot({
    courses: nextCourses,
    error: null,
    initialized: true,
    loading: false,
  });

  return nextCourses;
}

export async function refreshCourseCatalog() {
  if (!pendingCourseLoad) {
    pendingCourseLoad = loadCourseCatalogInternal().finally(() => {
      pendingCourseLoad = null;
    });
  }

  return pendingCourseLoad;
}

export function subscribeCourseCatalog(listener: CourseCatalogListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getDefaultCourseDetailsSnapshot(): CourseDetailsSnapshot {
  return DEFAULT_COURSE_DETAILS_SNAPSHOT;
}

function getCourseDetailsSnapshot(courseId: string) {
  return courseDetailsSnapshots.get(courseId) ?? getDefaultCourseDetailsSnapshot();
}

function emitCourseDetailsChange(courseId: string) {
  const scopedListeners = courseDetailsListeners.get(courseId);
  if (!scopedListeners) {
    return;
  }

  for (const listener of scopedListeners) {
    listener();
  }
}

function updateCourseDetailsSnapshot(courseId: string, patch: Partial<CourseDetailsSnapshot>) {
  const nextSnapshot = {
    ...getCourseDetailsSnapshot(courseId),
    ...patch,
  };

  courseDetailsSnapshots.set(courseId, nextSnapshot);
  emitCourseDetailsChange(courseId);
}

function sortCourseDetailItems(items: CourseDetailItemRow[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
}

function sortCourseReviews(reviews: CourseReviewRow[]) {
  return [...reviews].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }

    return new Date(b.review_date).getTime() - new Date(a.review_date).getTime();
  });
}

async function loadCourseDetailsInternal(courseId: string) {
  try {
    assertSupabaseConfigured();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load course details.";
    updateCourseDetailsSnapshot(courseId, {
      error: message,
      initialized: true,
      loading: false,
      value: null,
    });
    throw new Error(message);
  }

  updateCourseDetailsSnapshot(courseId, {
    loading: true,
    error: null,
  });

  const [{ data: content, error: contentError }, { data: detailItems, error: detailItemsError }, { data: reviews, error: reviewsError }] =
    await Promise.all([
      supabase
        .from("course_content")
        .select("*")
        .eq("course_id", courseId)
        .maybeSingle(),
      supabase
        .from("course_detail_items")
        .select("*")
        .eq("course_id", courseId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("course_reviews")
        .select("*")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("review_date", { ascending: false }),
    ]);

  const error = contentError ?? detailItemsError ?? reviewsError;
  if (error) {
    updateCourseDetailsSnapshot(courseId, {
      error: error.message,
      initialized: true,
      loading: false,
      value: null,
    });
    throw error;
  }

  const resolvedValue = {
    content: content ?? null,
    detailItems: sortCourseDetailItems(detailItems ?? []),
    reviews: sortCourseReviews(reviews ?? []),
  };

  updateCourseDetailsSnapshot(courseId, {
    error: null,
    initialized: true,
    loading: false,
    value: resolvedValue,
  });

  return resolvedValue;
}

export async function refreshCourseDetails(courseId: string) {
  const normalizedCourseId = courseId.trim();
  const existingPromise = pendingCourseDetailsLoads.get(normalizedCourseId);
  if (existingPromise) {
    return existingPromise;
  }

  const nextPromise = loadCourseDetailsInternal(normalizedCourseId).finally(() => {
    pendingCourseDetailsLoads.delete(normalizedCourseId);
  });

  pendingCourseDetailsLoads.set(normalizedCourseId, nextPromise);
  return nextPromise;
}

export function subscribeCourseDetails(courseId: string, listener: CourseDetailsListener) {
  const normalizedCourseId = courseId.trim();
  const scopedListeners = courseDetailsListeners.get(normalizedCourseId) ?? new Set<CourseDetailsListener>();
  scopedListeners.add(listener);
  courseDetailsListeners.set(normalizedCourseId, scopedListeners);

  return () => {
    const currentListeners = courseDetailsListeners.get(normalizedCourseId);
    if (!currentListeners) {
      return;
    }

    currentListeners.delete(listener);
    if (!currentListeners.size) {
      courseDetailsListeners.delete(normalizedCourseId);
    }
  };
}

export function useCourseCatalog() {
  const state = useSyncExternalStore(
    subscribeCourseCatalog,
    () => snapshot,
    () => snapshot,
  );

  useEffect(() => {
    if (!state.initialized) {
      void refreshCourseCatalog();
    }
  }, [state.initialized]);

  return state;
}

export function useCourseDetails(courseId: string | undefined) {
  const resolvedCourseId = courseId?.trim() ?? "";
  const state = useSyncExternalStore(
    (listener) => {
      if (!resolvedCourseId) {
        return () => undefined;
      }

      return subscribeCourseDetails(resolvedCourseId, listener);
    },
    () => (resolvedCourseId ? getCourseDetailsSnapshot(resolvedCourseId) : getDefaultCourseDetailsSnapshot()),
    () => (resolvedCourseId ? getCourseDetailsSnapshot(resolvedCourseId) : getDefaultCourseDetailsSnapshot()),
  );

  useEffect(() => {
    if (!resolvedCourseId || state.initialized || state.loading) {
      return;
    }

    void refreshCourseDetails(resolvedCourseId).catch(() => {
      // The snapshot already captures load errors for the UI.
    });
  }, [resolvedCourseId, state.initialized, state.loading]);

  return state;
}

export async function getAvailableTeeSlots(courseId: string, teeDate: string) {
  assertSupabaseConfigured();
  const { data, error } = await supabase.rpc("get_available_tee_slots", {
    target_course_id: courseId,
    target_tee_date: teeDate,
  });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    isAvailable: item.is_available,
    isPast: item.is_past,
    maxPlayers: item.max_players,
    teeTime: item.tee_time.slice(0, 5),
    timePeriod: item.time_period as "MORNING" | "AFTERNOON",
  })) satisfies TeeSlot[];
}

export async function getNextBookableTeeSlot(courseId: string, startDate?: string) {
  assertSupabaseConfigured();
  const { data, error } = await supabase.rpc("get_next_bookable_tee_slot", {
    target_course_id: courseId,
    target_start_date: startDate ?? null,
  });

  if (error) {
    throw error;
  }

  const nextSlot = data?.[0];
  if (!nextSlot) {
    return null;
  }

  return {
    maxPlayers: nextSlot.max_players,
    teeDate: nextSlot.tee_date,
    teeTime: nextSlot.tee_time.slice(0, 5),
    timePeriod: nextSlot.time_period as "MORNING" | "AFTERNOON",
  } satisfies NextBookableTeeSlot;
}

export type { NextBookableTeeSlot, TeeSlot };
