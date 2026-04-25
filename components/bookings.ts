import type { PostgrestError } from "@supabase/supabase-js";
import { useEffect, useSyncExternalStore } from "react";
import type { TeeTimeBookingRow } from "../lib/database.types";
import { assertSupabaseConfigured, supabase } from "../lib/supabase";
import { getColomboDateKey, getColomboMinutes } from "./colombo-time";
import { ensureAuthReady, useAuthSession } from "./auth";

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
  if ("code" in error && error.code === "PGRST205") {
    return "Booking data is unavailable because the tee time bookings table is missing from Supabase.";
  }

  if (error.message.includes("Could not find the table 'public.tee_time_bookings'")) {
    return "Booking data is unavailable because the tee time bookings table is missing from Supabase.";
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
