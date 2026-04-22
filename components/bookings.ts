import type { PostgrestError } from "@supabase/supabase-js";
import { useEffect, useSyncExternalStore } from "react";
import type { TeeTimeBookingInsert, TeeTimeBookingRow, TeeTimeBookingUpdate } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import { ensureAuthReady, useAuthSession } from "./auth";

type BookingStatus = "confirmed" | "cancelled" | "completed";
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
  caddyFee: number;
  courseId: string;
  greenFee: number;
  paymentMethod: PaymentMethod;
  players: number;
  serviceFee: number;
  status?: BookingStatus;
  taxes: number;
  teeDate: string;
  teeTime: string;
  timePeriod: TimePeriod;
  total: number;
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
  const userId = await getCurrentUserId();

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
  return booking.status === "confirmed" && getBookingDateTime(booking).getTime() >= Date.now();
}

export function isHistoricalBooking(booking: TeeTimeBookingRow) {
  return booking.status !== "confirmed" || getBookingDateTime(booking).getTime() < Date.now();
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

  const payload: TeeTimeBookingInsert = {
    caddy_fee: input.caddyFee,
    course_id: input.courseId,
    green_fee: input.greenFee,
    payment_method: input.paymentMethod,
    players: input.players,
    service_fee: input.serviceFee,
    status: input.status ?? "confirmed",
    taxes: input.taxes,
    tee_date: input.teeDate,
    tee_time: input.teeTime,
    time_period: input.timePeriod,
    total: input.total,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from("tee_time_bookings")
    .insert(payload)
    .select("*")
    .single();

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

  const payload: TeeTimeBookingUpdate = {
    caddy_fee: input.caddyFee,
    course_id: input.courseId,
    green_fee: input.greenFee,
    payment_method: input.paymentMethod,
    players: input.players,
    service_fee: input.serviceFee,
    status: input.status ?? "confirmed",
    taxes: input.taxes,
    tee_date: input.teeDate,
    tee_time: input.teeTime,
    time_period: input.timePeriod,
    total: input.total,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from("tee_time_bookings")
    .update(payload)
    .eq("id", bookingId)
    .eq("user_id", userId)
    .select("*")
    .single();

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

  const { data, error } = await supabase
    .from("tee_time_bookings")
    .update({
      canceled_at: new Date().toISOString(),
      status: "cancelled",
      user_id: userId,
    })
    .eq("id", bookingId)
    .eq("user_id", userId)
    .select("*")
    .single();

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
