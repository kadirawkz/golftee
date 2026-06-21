import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getDeviceSessionId } from "./device";

// Configure how notifications are displayed when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationType = "booking" | "promotion" | "achievement" | "updates" | "account";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  occurredAt: string;
  read: boolean;
  icon: string;
  actionText?: string;
  route?: string;
  routeParams?: Record<string, string>;
}

type NotificationSnapshot = {
  notifications: AppNotification[];
  initialized: boolean;
  loading: boolean;
};

type NotificationListener = () => void;

const DEFAULT_SNAPSHOT: NotificationSnapshot = {
  notifications: [],
  initialized: false,
  loading: false,
};

let snapshot = DEFAULT_SNAPSHOT;
const listeners = new Set<NotificationListener>();
let currentUserId: string | null = null;
let isBootstrapping = false;
let realtimeChannel: RealtimeChannel | null = null;

// Request notification permissions from the device
export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === "granted";
  } catch (err) {
    console.warn("Failed to request notification permissions", err);
    return false;
  }
}

function emitNotificationsChange() {
  for (const listener of listeners) {
    listener();
  }
}

function updateSnapshot(patch: Partial<NotificationSnapshot>) {
  snapshot = {
    ...snapshot,
    ...patch,
  };
  emitNotificationsChange();
}

function getStorageKey(userId: string | null) {
  return userId ? `golftee:notifications:${userId}` : "golftee:notifications:anonymous";
}

function mapDbNotification(db: any): AppNotification {
  return {
    id: db.id,
    type: db.type as NotificationType,
    title: db.title,
    message: db.message,
    occurredAt: db.occurred_at,
    read: db.read,
    icon: db.icon,
    actionText: db.action_text || undefined,
    route: db.route || undefined,
    routeParams: db.route_params || undefined,
  };
}

function shouldShowNotification(notif: AppNotification, currentId: string | null): boolean {
  if (!currentId) return true;

  const params = notif.routeParams;
  if (params && typeof params === "object") {
    const target = (params as Record<string, any>).target_device_id;
    const exclude = (params as Record<string, any>).exclude_device_id || 
                    (notif.title === "New Login Detected" ? (params as Record<string, any>).device_session_id : null);

    if (target && target !== currentId) {
      return false;
    }
    if (exclude && exclude === currentId) {
      return false;
    }
  }
  return true;
}

let bootstrapPromise: Promise<void> | null = null;

export function bootstrapNotifications(): Promise<void> {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }
  if (snapshot.initialized) {
    return Promise.resolve();
  }

  bootstrapPromise = (async () => {
    const userId = currentUserId;
    const storageKey = getStorageKey(userId);

    if (userId) {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("occurred_at", { ascending: false });

        if (error) {
          throw error;
        }

        const mapped = (data || []).map(mapDbNotification);
        const currentId = await getDeviceSessionId().catch(() => null);
        const filtered = mapped.filter(n => shouldShowNotification(n, currentId));
        updateSnapshot({
          notifications: filtered,
          initialized: true,
          loading: false,
        });
        await AsyncStorage.setItem(storageKey, JSON.stringify(filtered));
        return;
      } catch (dbError) {
        console.warn("Failed to load notifications from Supabase, falling back to local cache", dbError);
      }
    }

    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as AppNotification[];
        const currentId = await getDeviceSessionId().catch(() => null);
        const filtered = parsed.filter(n => shouldShowNotification(n, currentId));
        updateSnapshot({
          notifications: filtered,
          initialized: true,
          loading: false,
        });
      } else {
        // Seed default/initial welcome notification for a clean start
        const welcomeNotif: AppNotification = {
          id: `welcome-${userId || "anon"}`,
          type: "updates",
          title: "Welcome to GolfTee!",
          message: "Explore world-class signature courses and book tee times in seconds.",
          occurredAt: new Date().toISOString(),
          read: false,
          icon: "checkmark-circle",
          actionText: "Book Tee Time",
          route: "/explore",
        };
        const welcomeList = [welcomeNotif];
        await AsyncStorage.setItem(storageKey, JSON.stringify(welcomeList));
        updateSnapshot({
          notifications: welcomeList,
          initialized: true,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Failed to load notifications from AsyncStorage", error);
      updateSnapshot({
        notifications: [],
        initialized: true,
        loading: false,
      });
    }
  })().finally(() => {
    bootstrapPromise = null;
  });

  return bootstrapPromise;
}

export function setNotificationsUser(userId: string | null) {
  if (userId !== currentUserId) {
    currentUserId = userId;
    // Force reload for the new user profile
    snapshot = {
      notifications: [],
      initialized: false,
      loading: false,
    };
    emitNotificationsChange();

    if (realtimeChannel) {
      void realtimeChannel.unsubscribe();
      realtimeChannel = null;
    }

    if (userId) {
      realtimeChannel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          async (payload) => {
            const { eventType, new: newRow, old: oldRow } = payload;
            if (eventType === "INSERT" && newRow) {
              const mapped = mapDbNotification(newRow);
              if (!snapshot.notifications.some((n) => n.id === mapped.id)) {
                const currentId = await getDeviceSessionId().catch(() => null);
                if (!shouldShowNotification(mapped, currentId)) {
                  return;
                }

                const nextNotifications = [mapped, ...snapshot.notifications];
                updateSnapshot({ notifications: nextNotifications });
                void saveNotifications(nextNotifications);

                // Show local system notification
                void requestNotificationPermissions().then((hasPermission) => {
                  if (hasPermission) {
                    void Notifications.scheduleNotificationAsync({
                      content: {
                        title: mapped.title,
                        body: mapped.message,
                        data: {
                          route: mapped.route,
                          routeParams: mapped.routeParams,
                        },
                      },
                      trigger: null,
                    });
                  }
                });
              }
            } else if (eventType === "UPDATE" && newRow) {
              const mapped = mapDbNotification(newRow);
              const nextNotifications = snapshot.notifications.map((n) =>
                n.id === mapped.id ? mapped : n
              );
              updateSnapshot({ notifications: nextNotifications });
              void saveNotifications(nextNotifications);
            } else if (eventType === "DELETE" && oldRow) {
              const nextNotifications = snapshot.notifications.filter(
                (n) => n.id !== oldRow.id
              );
              updateSnapshot({ notifications: nextNotifications });
              void saveNotifications(nextNotifications);
            }
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.warn(`Supabase Realtime notifications subscription error:`, err);
          } else {
            console.log(`Supabase Realtime notifications subscription status: ${status}`);
          }
        });
    }

    void bootstrapNotifications();
  }
}

// Subscribe to auth state changes to reload notifications when user changes.
// Keep currentUserId in sync without calling async getSession() inside the callback to prevent deadlocks.
supabase.auth.onAuthStateChange((_event, session) => {
  const nextUserId = session?.user?.id ?? null;
  setNotificationsUser(nextUserId);
});

async function saveNotifications(notifications: AppNotification[]) {
  try {
    const storageKey = getStorageKey(currentUserId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(notifications));
  } catch (error) {
    console.error("Failed to save notifications to AsyncStorage", error);
  }
}

export function subscribeNotifications(listener: NotificationListener) {
  listeners.add(listener);
  void bootstrapNotifications();
  return () => {
    listeners.delete(listener);
  };
}

export function useNotificationState() {
  return useSyncExternalStore(
    subscribeNotifications,
    () => snapshot,
    () => snapshot
  );
}

// Function to add in-app notification and optionally trigger a local OS system notification immediately
export async function addNotification(
  type: NotificationType,
  title: string,
  message: string,
  icon: string,
  options?: {
    actionText?: string;
    route?: string;
    routeParams?: Record<string, string>;
    triggerSystemNotification?: boolean;
  }
) {
  // Bootstrap if not initialized yet
  if (!snapshot.initialized) {
    await bootstrapNotifications();
  }

  const newNotif: AppNotification = {
    id: Math.random().toString(36).substring(2, 9),
    type,
    title,
    message,
    occurredAt: new Date().toISOString(),
    read: false,
    icon,
    actionText: options?.actionText,
    route: options?.route,
    routeParams: options?.routeParams,
  };

  const currentId = await getDeviceSessionId().catch(() => null);
  const isTargeted = shouldShowNotification(newNotif, currentId);

  if (isTargeted) {
    const nextNotifications = [newNotif, ...snapshot.notifications];
    updateSnapshot({ notifications: nextNotifications });
    await saveNotifications(nextNotifications);
  }

  // Sync to database if logged in
  if (currentUserId) {
    void supabase
      .from("notifications")
      .insert({
        id: newNotif.id,
        user_id: currentUserId,
        type: newNotif.type,
        title: newNotif.title,
        message: newNotif.message,
        occurred_at: newNotif.occurredAt,
        read: newNotif.read,
        icon: newNotif.icon,
        action_text: newNotif.actionText || null,
        route: newNotif.route || null,
        route_params: newNotif.routeParams || null,
      })
      .then(({ error }) => {
        if (error) console.error("Failed to sync new notification to Supabase", error);
      });
  }

  // Trigger real OS system notification immediately if requested (only if targeted for this device)
  if (options?.triggerSystemNotification && isTargeted) {
    const hasPermission = await requestNotificationPermissions();
    if (hasPermission) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: title,
            body: message,
            data: {
              route: options?.route,
              routeParams: options?.routeParams,
            },
          },
          trigger: null, // trigger immediately
        });
      } catch (err) {
        console.warn("Failed to schedule instant system notification", err);
      }
    }
  }
}

export async function markAsRead(id: string) {
  const nextNotifications = snapshot.notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  updateSnapshot({ notifications: nextNotifications });
  await saveNotifications(nextNotifications);

  if (currentUserId) {
    void supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Failed to sync markAsRead to Supabase", error);
      });
  }
}

export async function markAllAsRead() {
  const nextNotifications = snapshot.notifications.map((n) => ({ ...n, read: true }));
  updateSnapshot({ notifications: nextNotifications });
  await saveNotifications(nextNotifications);

  if (currentUserId) {
    void supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", currentUserId)
      .then(({ error }) => {
        if (error) console.error("Failed to sync markAllAsRead to Supabase", error);
      });
  }
}

export async function deleteNotification(id: string) {
  const nextNotifications = snapshot.notifications.filter((n) => n.id !== id);
  updateSnapshot({ notifications: nextNotifications });
  await saveNotifications(nextNotifications);

  if (currentUserId) {
    void supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Failed to sync deleteNotification to Supabase", error);
      });
  }
}

export async function deleteAllNotifications() {
  updateSnapshot({ notifications: [] });
  await saveNotifications([]);

  if (currentUserId) {
    void supabase
      .from("notifications")
      .delete()
      .eq("user_id", currentUserId)
      .then(({ error }) => {
        if (error) console.error("Failed to sync deleteAllNotifications to Supabase", error);
      });
  }
}

export async function refreshNotifications() {
  if (isBootstrapping) return;

  updateSnapshot({ loading: true });
  isBootstrapping = true;

  const userId = currentUserId;
  const storageKey = getStorageKey(userId);

  if (userId) {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false });

      if (error) {
        throw error;
      }

      const mapped = (data || []).map(mapDbNotification);
      const currentId = await getDeviceSessionId().catch(() => null);
      const filtered = mapped.filter(n => shouldShowNotification(n, currentId));
      updateSnapshot({
        notifications: filtered,
        initialized: true,
        loading: false,
      });
      await saveNotifications(filtered);
      return;
    } catch (dbError) {
      console.warn("Failed to refresh notifications from Supabase", dbError);
    } finally {
      isBootstrapping = false;
    }
  } else {
    isBootstrapping = false;
    updateSnapshot({ loading: false });
  }
}

