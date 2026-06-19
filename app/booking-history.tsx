import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { formatBookingDate, getBookingTotal, isHistoricalBooking, useBookingState } from "../services/bookings";
import { getManagedCourseById } from "../services/course-management";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { createThemedStyleSheet, useThemedStyles, useAppTheme, theme } from "../components/theme";
import { getCourseImage } from "../lib/image-mapping";

export default function BookingHistoryScreen() {
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const router = useRouter();
  const { horizontalPadding, screenBottomPadding } = useResponsiveLayout();
  const bookingState = useBookingState();
  const historyBookings = bookingState.bookings.filter(isHistoricalBooking).reverse();
  const completedBookings = historyBookings.filter((booking) => booking.status === "completed");
  const averageSpend = historyBookings.length
    ? historyBookings.reduce((total, booking) => total + getBookingTotal(booking), 0) / historyBookings.length
    : 0;

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: Math.max(screenBottomPadding - 20, 120) },
        ]}
        bounces={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>PAST ROUNDS</Text>
            <Text style={styles.summaryValue}>{historyBookings.length} bookings in history</Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryMetricLabel}>AVG SPEND</Text>
            <Text style={styles.summaryMetricValue}>${averageSpend.toFixed(0)}</Text>
          </View>
        </View>

        {!bookingState.initialized || bookingState.loading ? (
          <Text style={styles.statusText}>Loading booking history...</Text>
        ) : null}
        {bookingState.error ? <Text style={styles.statusText}>{bookingState.error}</Text> : null}
        {!bookingState.loading && bookingState.initialized && !historyBookings.length ? (
          <Text style={styles.statusText}>
            No history yet. Cancelled or past bookings will appear here once you have them.
          </Text>
        ) : null}

        <View style={styles.list}>
          {historyBookings.map((booking) => {
            const course = getManagedCourseById(booking.course_id);
            const badgeText =
              booking.status === "cancelled" ? "CANCELLED" : booking.status === "completed" ? "COMPLETED" : "PAST";

            return (
              <Pressable
                key={booking.id}
                style={styles.historyCard}
                onPress={() => router.navigate({ pathname: "/manage-booking", params: { bookingId: booking.id } })}
                variant="card"
              >
                <View style={styles.historyImageWrap}>
                  <AppImage source={getCourseImage(course.image)} style={styles.historyImage} />
                  <View style={styles.historyOverlay} />
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeText}</Text>
                  </View>
                </View>

                <View style={styles.historyBody}>
                  <View style={styles.historyTopRow}>
                    <View style={styles.historyTitleWrap}>
                      <Text style={styles.historyTitle}>{course.title}</Text>
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={13} color={colors.textSoft} />
                        <Text style={styles.locationText}>{course.location}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </View>

                  <View style={styles.metaPanel}>
                    <View>
                      <Text style={styles.metaLabel}>DATE</Text>
                      <Text style={styles.metaValue}>{formatBookingDate(booking.tee_date)}</Text>
                    </View>
                    <View>
                      <Text style={styles.metaLabel}>PLAYERS</Text>
                      <Text style={styles.metaValue}>{booking.players}</Text>
                    </View>
                    <View>
                      <Text style={styles.metaLabel}>SPEND</Text>
                      <Text style={styles.metaValue}>${getBookingTotal(booking).toFixed(2)}</Text>
                    </View>
                  </View>

                  <Text style={styles.highlightText}>
                    {booking.status === "cancelled"
                      ? "This reservation was cancelled and the tee slot was released."
                      : completedBookings.includes(booking)
                        ? "Completed round stored in your booking history."
                        : "Past booking retained for your account records."}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const themedStyles = createThemedStyleSheet((colors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.page,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 16,
  },
  summaryCard: {
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  summaryLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: colors.textSoft,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: colors.primary,
    fontWeight: "800",
  },
  summaryMetric: {
    alignItems: "flex-end",
  },
  summaryMetricLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: colors.accentWarm,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryMetricValue: {
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    color: colors.primary,
    fontWeight: "800",
  },
  list: {
    gap: 14,
  },
  historyCard: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyImageWrap: {
    height: 156,
    position: "relative",
  },
  historyImage: {
    width: "100%",
    height: "100%",
  },
  historyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlaySoft,
  },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.glass,
    justifyContent: "center",
  },
  badgeText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: colors.primary,
    fontWeight: "800",
    letterSpacing: 1,
  },
  historyBody: {
    padding: 14,
    gap: 12,
  },
  historyTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  historyTitleWrap: {
    flex: 1,
    gap: 5,
  },
  historyTitle: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    color: colors.primary,
    fontWeight: "800",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
  },
  metaPanel: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  metaLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: colors.accentWarm,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: colors.text,
    fontWeight: "700",
  },
  highlightText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
  },
  statusText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
    fontWeight: "600",
  },
}));
