import type { PostgrestError } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useEffect, useSyncExternalStore } from "react";
import type { TeeTimeBookingRow } from "../lib/database.types";
import { assertSupabaseConfigured, supabase } from "../lib/supabase";
import { getColomboDateKey, getColomboMinutes } from "../utils/colombo-time";
import { ensureAuthReady, useAuthSession } from "./auth";
import { getManagedCourseById } from "./course-management";
import { addNotification } from "./notifications";

type PaymentMethod = "wallet" | "card";
type TimePeriod = "MORNING" | "AFTERNOON";

type BookingSnapshot = {
  bookings: TeeTimeBookingRow[];
  error: string | null;
  initialized: boolean;
  loading: boolean;
  userId: string | null;
};

type BookingListener = () => void;

export type BookingMutationInput = {
  courseId: string;
  paymentMethod: PaymentMethod;
  players: number;
  teeDate: string;
  teeTime: string;
  timePeriod: TimePeriod;
};

const DEFAULT_SNAPSHOT: BookingSnapshot = {
  bookings: [],
  error: null,
  initialized: false,
  loading: false,
  userId: null,
};

let snapshot = DEFAULT_SNAPSHOT;
let pendingLoad: Promise<TeeTimeBookingRow[]> | null = null;
const listeners = new Set<BookingListener>();

// Helper to cancel OS-scheduled tee time reminders
export async function cancelTeeTimeReminders(bookingId: string) {
  try {
    const key = `golftee:reminders:${bookingId}`;
    const rawIds = await AsyncStorage.getItem(key);
    if (rawIds) {
      const ids = JSON.parse(rawIds) as string[];
      for (const id of ids) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
      await AsyncStorage.removeItem(key);
    }
  } catch (err) {
    console.warn("Failed to cancel scheduled reminders for booking " + bookingId, err);
  }
}

// Helper to schedule OS-level tee time reminders at 24h, 12h, and 2h before the round
export async function scheduleTeeTimeReminders(
  bookingId: string,
  courseTitle: string,
  teeDate: string,
  teeTime: string
) {
  // Always clear existing reminders for this booking ID first
  await cancelTeeTimeReminders(bookingId);

  try {
    // Parse booking datetime
    const teeDateTime = new Date(`${teeDate}T${teeTime}`);
    if (Number.isNaN(teeDateTime.getTime())) {
      return;
    }

    const intervals = [
      { hoursBefore: 24, label: "24 hours" },
      { hoursBefore: 12, label: "12 hours" },
      { hoursBefore: 2, label: "2 hours" },
    ];

    const scheduledIds: string[] = [];

    for (const interval of intervals) {
      const triggerTime = new Date(teeDateTime.getTime() - interval.hoursBefore * 60 * 60 * 1000);

      // Only schedule if the trigger time is in the future
      if (triggerTime.getTime() > Date.now()) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Tee Time Reminder - ${interval.label} to go!`,
            body: `Reminder: Your round at ${courseTitle} is in ${interval.label} (${formatBookingDate(teeDate)} at ${formatBookingTime(teeTime)}).`,
            data: {
              route: "/manage-booking",
              routeParams: { bookingId },
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerTime,
          },
        });
        scheduledIds.push(id);
      }
    }

    if (scheduledIds.length > 0) {
      await AsyncStorage.setItem(`golftee:reminders:${bookingId}`, JSON.stringify(scheduledIds));
    }
  } catch (err) {
    console.warn("Failed to schedule reminders for booking " + bookingId, err);
  }
}

function emitBookingsChange() {
  for (const listener of listeners) {
    listener();
  }
}

function updateSnapshot(patch: Partial<BookingSnapshot>) {
  snapshot = {
    ...snapshot,
    ...patch,
  };
  emitBookingsChange();
}

function compareBookings(a: TeeTimeBookingRow, b: TeeTimeBookingRow) {
  return getBookingDateTime(a).getTime() - getBookingDateTime(b).getTime();
}

function normalizeBookings(bookings: TeeTimeBookingRow[]) {
  return [...bookings].sort(compareBookings);
}

function translateBookingError(error: PostgrestError | Error) {
  if ("code" in error && error.code === "23505") {
    return "That tee time has already been booked. Please choose another slot.";
  }

  return error.message || "Unable to complete the booking request.";
}

function translateLoadError(error: PostgrestError | Error) {
  const msg = error.message || "";
  if (msg.includes("PGRST205") || msg.includes("Could not find the table") || msg.includes("tee_time_bookings")) {
    return "Booking service is temporarily unavailable. Please try again later.";
  }

  return error.message || "Unable to load bookings.";
}

async function getCurrentUserId() {
  assertSupabaseConfigured();
  await ensureAuthReady();
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

async function fetchBookingsForUser(userId: string) {
  const { data, error } = await supabase
    .from("tee_time_bookings")
    .select("*")
    .eq("user_id", userId)
    .order("tee_date", { ascending: true })
    .order("tee_time", { ascending: true });

  if (error) {
    throw error;
  }

  return normalizeBookings(data);
}

async function loadBookings() {
  let userId: string | null = null;

  try {
    userId = await getCurrentUserId();
  } catch (error) {
    const message = translateLoadError(error instanceof Error ? error : new Error(String(error)));
    updateSnapshot({
      bookings: [],
      error: message,
      initialized: true,
      loading: false,
      userId: null,
    });
    return [];
  }

  if (!userId) {
    updateSnapshot({
      bookings: [],
      error: null,
      initialized: true,
      loading: false,
      userId: null,
    });
    return [];
  }

  updateSnapshot({
    error: null,
    loading: true,
    userId,
  });

  try {
    const bookings = await fetchBookingsForUser(userId);
    updateSnapshot({
      bookings,
      error: null,
      initialized: true,
      loading: false,
      userId,
    });

    return bookings;
  } catch (error) {
    const message = translateLoadError(error instanceof Error ? error : new Error(String(error)));
    updateSnapshot({
      bookings: [],
      error: message,
      initialized: true,
      loading: false,
      userId,
    });

    return [];
  }
}

export function getBookingDateTime(booking: Pick<TeeTimeBookingRow, "tee_date" | "tee_time">) {
  return new Date(`${booking.tee_date}T${booking.tee_time}`);
}

export function isUpcomingBooking(booking: TeeTimeBookingRow) {
  if (booking.status !== "confirmed") {
    return false;
  }

  const colomboDateKey = getColomboDateKey();
  if (booking.tee_date !== colomboDateKey) {
    return booking.tee_date > colomboDateKey;
  }

  return Number(booking.tee_time.slice(0, 2)) * 60 + Number(booking.tee_time.slice(3, 5)) >= getColomboMinutes();
}

export function isHistoricalBooking(booking: TeeTimeBookingRow) {
  return !isUpcomingBooking(booking);
}

export function isEditableBooking(booking: TeeTimeBookingRow) {
  return isUpcomingBooking(booking);
}

export function isCancellableBooking(booking: TeeTimeBookingRow) {
  return isUpcomingBooking(booking);
}

export function formatBookingDate(teeDate: string) {
  return new Date(`${teeDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function formatBookingDay(teeDate: string) {
  return new Date(`${teeDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
  }).toUpperCase();
}

export function formatBookingTime(teeTime: string) {
  return new Date(`1970-01-01T${teeTime}`).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBookingDateTime(booking: Pick<TeeTimeBookingRow, "tee_date" | "tee_time">) {
  return `${formatBookingDate(booking.tee_date)}, ${formatBookingTime(booking.tee_time)}`;
}

export function getBookingTotal(booking: Pick<TeeTimeBookingRow, "green_fee" | "service_fee" | "caddy_fee" | "taxes">) {
  return booking.green_fee + booking.service_fee + booking.caddy_fee + booking.taxes;
}

export function subscribeBookings(listener: BookingListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshBookings() {
  if (!pendingLoad) {
    pendingLoad = loadBookings().finally(() => {
      pendingLoad = null;
    });
  }

  return pendingLoad;
}

export async function createBooking(input: BookingMutationInput) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("You need to be signed in to place a booking.");
  }

  const { data, error } = await supabase.rpc("save_tee_time_booking", {
    target_booking_id: null,
    target_course_id: input.courseId,
    target_payment_method: input.paymentMethod,
    target_players: input.players,
    target_tee_date: input.teeDate,
    target_tee_time: input.teeTime,
    target_time_period: input.timePeriod,
  });

  if (error) {
    throw new Error(translateBookingError(error));
  }

  const nextBookings = normalizeBookings([...snapshot.bookings.filter((item) => item.id !== data.id), data]);
  updateSnapshot({
    bookings: nextBookings,
    error: null,
    initialized: true,
    loading: false,
    userId,
  });

  try {
    const course = getManagedCourseById(data.course_id);
    const formattedTime = new Date(`1970-01-01T${data.tee_time}`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    void addNotification(
      "booking",
      "Booking Confirmed",
      `Your round at ${course.title} is scheduled for ${formatBookingDate(data.tee_date)} at ${formattedTime}.`,
      "checkmark-circle",
      {
        actionText: "View Booking",
        route: "/manage-booking",
        routeParams: { bookingId: data.id },
        triggerSystemNotification: true,
      }
    );
    // Schedule multi-stage offline reminders
    void scheduleTeeTimeReminders(data.id, course.title, data.tee_date, data.tee_time);
  } catch (err) {
    console.warn("Failed to dispatch booking notification", err);
  }

  return data;
}

export async function updateBooking(bookingId: string, input: BookingMutationInput) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("You need to be signed in to modify a booking.");
  }

  const { data, error } = await supabase.rpc("save_tee_time_booking", {
    target_booking_id: bookingId,
    target_course_id: input.courseId,
    target_payment_method: input.paymentMethod,
    target_players: input.players,
    target_tee_date: input.teeDate,
    target_tee_time: input.teeTime,
    target_time_period: input.timePeriod,
  });

  if (error) {
    throw new Error(translateBookingError(error));
  }

  const nextBookings = normalizeBookings(snapshot.bookings.map((item) => (item.id === bookingId ? data : item)));
  updateSnapshot({
    bookings: nextBookings,
    error: null,
    initialized: true,
    loading: false,
    userId,
  });

  try {
    const course = getManagedCourseById(data.course_id);
    const formattedTime = new Date(`1970-01-01T${data.tee_time}`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    void addNotification(
      "booking",
      "Booking Updated",
      `Your tee time at ${course.title} has been moved to ${formatBookingDate(data.tee_date)} at ${formattedTime}.`,
      "calendar",
      {
        actionText: "View Booking",
        route: "/manage-booking",
        routeParams: { bookingId: data.id },
        triggerSystemNotification: true,
      }
    );
    // Reschedule multi-stage offline reminders
    void scheduleTeeTimeReminders(data.id, course.title, data.tee_date, data.tee_time);
  } catch (err) {
    console.warn("Failed to dispatch update notification", err);
  }

  return data;
}

export async function cancelBooking(bookingId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("You need to be signed in to cancel a booking.");
  }

  const { data, error } = await supabase.rpc("cancel_tee_time_booking", {
    target_booking_id: bookingId,
  });

  if (error) {
    throw new Error(translateBookingError(error));
  }

  const nextBookings = normalizeBookings(snapshot.bookings.map((item) => (item.id === bookingId ? data : item)));
  updateSnapshot({
    bookings: nextBookings,
    error: null,
    initialized: true,
    loading: false,
    userId,
  });

  try {
    const course = getManagedCourseById(data.course_id);
    void addNotification(
      "booking",
      "Booking Cancelled",
      `Your round at ${course.title} on ${formatBookingDate(data.tee_date)} has been cancelled.`,
      "close-circle",
      {
        actionText: "Book Again",
        route: "/tee-time-booking",
        routeParams: { courseId: course.id },
        triggerSystemNotification: true,
      }
    );
    // Cancel any scheduled offline reminders
    void cancelTeeTimeReminders(data.id);
  } catch (err) {
    console.warn("Failed to dispatch cancellation notification", err);
  }

  return data;
}

export function useBookingState() {
  const auth = useAuthSession();
  const state = useSyncExternalStore(
    subscribeBookings,
    () => snapshot,
    () => snapshot,
  );

  useEffect(() => {
    if (!auth.initialized) {
      return;
    }

    void refreshBookings();
  }, [auth.initialized, auth.session?.user.id]);

  return state;
}
