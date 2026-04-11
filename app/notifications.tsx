import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";

type NotificationType = "booking" | "promotion" | "achievement" | "system";
type NotificationFilter = "all" | "booking" | "promotion" | "achievement" | "system";

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestampLabel: string;
  occurredAt: string;
  read: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  actionText?: string;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "1",
    type: "booking",
    title: "Booking Confirmed",
    message: "Your tee time at Royal Colombo Golf Club on Oct 24 at 08:15 AM is confirmed.",
    timestampLabel: "2 hours ago",
    occurredAt: "2026-04-09T08:00:00Z",
    read: false,
    icon: "checkmark-circle",
    actionText: "View Booking",
  },
  {
    id: "2",
    type: "promotion",
    title: "Limited Time Offer",
    message: "Get 20% off your next booking at any 5-star course this weekend.",
    timestampLabel: "5 hours ago",
    occurredAt: "2026-04-09T05:00:00Z",
    read: false,
    icon: "gift",
    actionText: "Explore Offers",
  },
  {
    id: "3",
    type: "achievement",
    title: "Milestone Achieved",
    message: "You hit your 50th round and unlocked a Gold member badge.",
    timestampLabel: "1 day ago",
    occurredAt: "2026-04-08T07:30:00Z",
    read: true,
    icon: "trophy",
  },
  {
    id: "4",
    type: "system",
    title: "Course Update",
    message: "Pinewood Summit greens have been renovated. Check out the refreshed layout.",
    timestampLabel: "2 days ago",
    occurredAt: "2026-04-07T09:00:00Z",
    read: true,
    icon: "information-circle",
  },
  {
    id: "5",
    type: "booking",
    title: "Booking Reminder",
    message: "Your round at Victoria Golf & Country Resort is tomorrow at 10:00 AM.",
    timestampLabel: "3 days ago",
    occurredAt: "2026-04-06T08:30:00Z",
    read: true,
    icon: "notifications",
    actionText: "Open Booking",
  },
];

const FILTER_OPTIONS: { label: string; value: NotificationFilter }[] = [
  { label: "All", value: "all" },
  { label: "Bookings", value: "booking" },
  { label: "Offers", value: "promotion" },
  { label: "Achievements", value: "achievement" },
  { label: "System", value: "system" },
];

function getIconColor(type: NotificationType) {
  switch (type) {
    case "booking":
      return theme.colors.primary;
    case "promotion":
      return theme.colors.accentWarm;
    case "achievement":
      return theme.colors.warning;
    case "system":
      return theme.colors.muted;
    default:
      return theme.colors.primary;
  }
}

function getRelativeTimeLabel(occurredAt: string) {
  const elapsedMs = Date.now() - new Date(occurredAt).getTime();

  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return "Just now";
  }

  const minutes = Math.floor(elapsedMs / (1000 * 60));
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return new Date(occurredAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function NotificationCard({
  notification,
  onMarkRead,
  onAction,
}: {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
  onAction: (notification: AppNotification) => void;
}) {
  const iconColor = getIconColor(notification.type);
  const timestampLabel = getRelativeTimeLabel(notification.occurredAt);

  return (
    <View style={[styles.notificationCard, !notification.read && styles.notificationCardUnread]}>
      <View style={[styles.iconWrap, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={notification.icon} size={20} color={iconColor} />
      </View>

      <View style={styles.contentWrap}>
        <View style={styles.headerRow}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          {!notification.read ? <View style={styles.readIndicator} /> : null}
        </View>
        <Text style={styles.notificationMessage}>{notification.message}</Text>
        <View style={styles.footerRow}>
          <Text style={styles.timestamp}>{timestampLabel}</Text>
          <View style={styles.footerActions}>
            {notification.actionText ? (
              <Pressable style={styles.inlineAction} onPress={() => onAction(notification)} variant="chip">
                <Text style={styles.actionText}>{notification.actionText}</Text>
              </Pressable>
            ) : null}
            {!notification.read ? (
              <Pressable style={styles.inlineAction} onPress={() => onMarkRead(notification.id)} variant="chip">
                <Text style={styles.actionText}>Mark Read</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { horizontalPadding, screenBottomPadding } = useResponsiveLayout();
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      ),
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") {
      return sortedNotifications;
    }

    return sortedNotifications.filter((notification) => notification.type === activeFilter);
  }, [activeFilter, sortedNotifications]);

  const unreadNotifications = filteredNotifications.filter((notification) => !notification.read);
  const earlierNotifications = filteredNotifications.filter((notification) => notification.read);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const handleMarkAllRead = () => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  };

  const handleMarkRead = (id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const handleNotificationAction = (notification: AppNotification) => {
    if (!notification.read) {
      handleMarkRead(notification.id);
    }

    if (notification.type === "booking") {
      router.push("/bookings");
      return;
    }

    if (notification.type === "promotion" || notification.type === "system") {
      router.push("/explore");
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: screenBottomPadding },
        ]}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>NOTIFICATIONS</Text>
            <Text style={styles.summaryValue}>{unreadCount} unread updates</Text>
          </View>
          {unreadCount > 0 ? (
            <Pressable style={styles.markAllButton} onPress={handleMarkAllRead} variant="cta">
              <Text style={styles.markAllButtonText}>Mark All Read</Text>
            </Pressable>
          ) : (
            <View style={styles.summaryBadge}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.successText} />
              <Text style={styles.summaryBadgeText}>All Caught Up</Text>
            </View>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          bounces={false}
          overScrollMode="never"
        >
          {FILTER_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.filterChip, activeFilter === option.value && styles.filterChipActive]}
              onPress={() => setActiveFilter(option.value)}
              variant="chip"
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === option.value && styles.filterChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.notificationsSection}>
          {unreadNotifications.length > 0 ? (
            <View style={styles.groupSection}>
              <Text style={styles.sectionLabel}>Unread</Text>
              <View style={styles.notificationsList}>
                {unreadNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onAction={handleNotificationAction}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {earlierNotifications.length > 0 ? (
            <View style={styles.groupSection}>
              <Text style={styles.sectionLabel}>{unreadNotifications.length > 0 ? "Earlier" : "All Notifications"}</Text>
              <View style={styles.notificationsList}>
                {earlierNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onAction={handleNotificationAction}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={24} color={theme.colors.muted} />
              <Text style={styles.emptyStateTitle}>No notifications here</Text>
              <Text style={styles.emptyStateText}>
                Try a different filter or check back after your next booking update.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 160,
    gap: 16,
  },
  summaryCard: {
    borderRadius: 20,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textSoft,
    letterSpacing: 1.2,
    fontWeight: "700",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.success,
  },
  summaryBadgeText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.successText,
    fontWeight: "700",
  },
  markAllButton: {
    height: 34,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  markAllButtonText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.surface,
    fontWeight: "700",
  },
  filterRow: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: theme.colors.surface,
  },
  notificationsSection: {
    gap: 18,
  },
  groupSection: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
  },
  notificationsList: {
    gap: 10,
  },
  notificationCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  notificationCardUnread: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  contentWrap: {
    flex: 1,
    gap: 5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  notificationTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.text,
    fontWeight: "700",
    flex: 1,
  },
  readIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    flexShrink: 0,
  },
  notificationMessage: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inlineAction: {
    minHeight: 24,
    justifyContent: "center",
  },
  timestamp: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.muted,
    fontWeight: "500",
  },
  actionText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 18,
    paddingVertical: 22,
    alignItems: "center",
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  emptyStateText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
    textAlign: "center",
    maxWidth: 280,
  },
});
