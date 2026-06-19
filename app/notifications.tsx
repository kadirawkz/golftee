import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState, useCallback } from "react";
import { ScrollView, StyleSheet, Text, View, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { createThemedStyleSheet, useThemedStyles, useAppTheme, theme } from "../components/theme";
import {
  AppNotification,
  NotificationType,
  useNotificationState,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  refreshNotifications,
} from "../services/notifications";

type NotificationFilter = "all" | "booking" | "promotion" | "achievement" | "account";

const FILTER_OPTIONS: { label: string; value: NotificationFilter }[] = [
  { label: "All", value: "all" },
  { label: "Bookings", value: "booking" },
  { label: "Offers & Updates", value: "promotion" },
  { label: "Account Activity", value: "account" },
  { label: "Achievements", value: "achievement" },
];

function getIconColor(type: NotificationType, colors: any) {
  switch (type) {
    case "booking":
      return colors.primary;
    case "promotion":
      return colors.accentWarm;
    case "achievement":
      return colors.warning;
    case "updates":
      return colors.muted;
    case "account":
      return colors.muted;
    default:
      return colors.primary;
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
  onDelete,
}: {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
  onAction: (notification: AppNotification) => void;
  onDelete: (id: string) => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const iconColor = getIconColor(notification.type, colors);
  const timestampLabel = getRelativeTimeLabel(notification.occurredAt);

  return (
    <View style={[styles.notificationCard, !notification.read && styles.notificationCardUnread]}>
      <View style={[styles.iconWrap, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={notification.icon as any} size={20} color={iconColor} />
      </View>

      <View style={styles.contentWrap}>
        <View style={styles.headerRow}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          {!notification.read ? <View style={styles.readIndicator} /> : null}
          <Pressable style={styles.dismissButton} onPress={() => onDelete(notification.id)} variant="icon">
            <Ionicons name="close-outline" size={18} color={colors.muted} />
          </Pressable>
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
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const router = useRouter();
  const { filter } = useLocalSearchParams<{ filter?: NotificationFilter }>();
  const { horizontalPadding, screenBottomPadding } = useResponsiveLayout();
  const { notifications } = useNotificationState();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshNotifications();
    } catch (err) {
      console.warn("Failed to refresh notifications", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (filter) {
      setActiveFilter(filter);
    }
  }, [filter]);

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
    if (activeFilter === "promotion") {
      return sortedNotifications.filter(
        (notification) => notification.type === "promotion" || notification.type === "updates"
      );
    }
    return sortedNotifications.filter((notification) => notification.type === activeFilter);
  }, [activeFilter, sortedNotifications]);

  const unreadNotifications = filteredNotifications.filter((notification) => !notification.read);
  const earlierNotifications = filteredNotifications.filter((notification) => notification.read);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const handleMarkAllRead = () => {
    void markAllAsRead();
  };

  const handleDismissAll = () => {
    void deleteAllNotifications();
  };

  const handleMarkRead = (id: string) => {
    void markAsRead(id);
  };

  const handleDelete = (id: string) => {
    void deleteNotification(id);
  };

  const handleNotificationAction = (notification: AppNotification) => {
    if (!notification.read) {
      void markAsRead(notification.id);
    }

    if (notification.route) {
      router.navigate({
        pathname: notification.route as any,
        params: notification.routeParams,
      });
      return;
    }

    if (notification.type === "booking") {
      router.navigate("/bookings");
      return;
    }

    if (notification.type === "promotion" || notification.type === "updates") {
      router.navigate("/explore");
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: screenBottomPadding },
        ]}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        overScrollMode="never"
      >
        <View style={styles.summaryCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>NOTIFICATIONS</Text>
            <Text style={styles.summaryValue}>{unreadCount} unread updates</Text>
          </View>
          <View style={styles.summaryActionsRow}>
            {unreadCount > 0 ? (
              <Pressable style={styles.summaryActionBtn} onPress={handleMarkAllRead} variant="cta">
                <Text style={styles.summaryActionBtnText}>Mark All Read</Text>
              </Pressable>
            ) : null}
            {notifications.length > 0 ? (
              <Pressable style={[styles.summaryActionBtn, styles.dismissAllButton]} onPress={handleDismissAll} variant="chip">
                <Text style={[styles.summaryActionBtnText, styles.dismissAllButtonText]}>Dismiss All</Text>
              </Pressable>
            ) : (
              <View style={styles.summaryBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.successText} />
                <Text style={styles.summaryBadgeText}>Caught Up</Text>
              </View>
            )}
          </View>
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
                    onDelete={handleDelete}
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
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={24} color={colors.muted} />
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

const themedStyles = createThemedStyleSheet((colors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 160,
    gap: 16,
  },
  summaryCard: {
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryLabel: {
    fontSize: 9,
    lineHeight: 12,
    color: colors.textSoft,
    letterSpacing: 1.2,
    fontWeight: "700",
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.primary,
    fontWeight: "800",
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    height: 28,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.success,
  },
  summaryBadgeText: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.successText,
    fontWeight: "700",
  },
  summaryActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  summaryActionBtn: {
    height: 28,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryActionBtnText: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.surface,
    fontWeight: "700",
  },
  dismissAllButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  dismissAllButtonText: {
    color: colors.text,
  },
  filterRow: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: colors.surface,
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
    color: colors.textSoft,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  notificationCardUnread: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
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
    color: colors.text,
    fontWeight: "700",
    flex: 1,
  },
  readIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationMessage: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
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
    color: colors.muted,
    fontWeight: "500",
  },
  actionText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: colors.primary,
    fontWeight: "700",
  },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 18,
    paddingVertical: 22,
    alignItems: "center",
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: colors.primary,
    fontWeight: "700",
  },
  emptyStateText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
    textAlign: "center",
    maxWidth: 280,
  },
}));
