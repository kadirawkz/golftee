import { useEffect, useSyncExternalStore } from "react";
import type { GolfCourseRow } from "../lib/database.types";
import { supabase } from "../lib/supabase";
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
  maxPlayers: number;
  teeTime: string;
  timePeriod: "MORNING" | "AFTERNOON";
};

type CourseCatalogListener = () => void;

const DEFAULT_SNAPSHOT: CourseCatalogSnapshot = {
  courses: [],
  error: null,
  initialized: false,
  loading: false,
};

let snapshot = DEFAULT_SNAPSHOT;
let pendingCourseLoad: Promise<CourseRecord[]> | null = null;
const listeners = new Set<CourseCatalogListener>();

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

function mapRowToCourse(row: GolfCourseRow): CourseRecord {
  return {
    id: row.id,
    title: row.title,
    price: `$${Math.round(row.price)}`,
    rating: row.rating.toFixed(1),
    location: row.location,
    placeQuery: row.place_query,
    placeId: row.place_id ?? undefined,
    image: row.image,
    style: row.style as CourseStyle,
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
  updateSnapshot({
    loading: true,
    error: null,
  });

  const { data, error } = await supabase
    .from("golf_courses")
    .select("*")
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

export async function getAvailableTeeSlots(courseId: string, teeDate: string) {
  const { data, error } = await supabase.rpc("get_available_tee_slots", {
    target_course_id: courseId,
    target_tee_date: teeDate,
  });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    isAvailable: item.is_available,
    maxPlayers: item.max_players,
    teeTime: item.tee_time.slice(0, 5),
    timePeriod: item.time_period as "MORNING" | "AFTERNOON",
  })) satisfies TeeSlot[];
}

export type { TeeSlot };
