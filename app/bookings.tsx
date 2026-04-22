import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import {
  formatBookingDate,
  formatBookingDateTime,
  isHistoricalBooking,
  isUpcomingBooking,
  useBookingState,
} from "../components/bookings";
import { getManagedCourseById } from "../components/course-management";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";

function BookingCard({
  bookingId,
  courseId,
  dateTime,
  players,
  status,
  onPressManage,
}: {
  bookingId: string;
  courseId: string;
  dateTime: string;
  players: number;
  status: string;
  onPressManage: (bookingId: string) => void;
}) {
  const course = getManagedCourseById(courseId);

  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingImageWrap}>
        <AppImage source={{ uri: course.image }} style={styles.bookingImage} />
        <Text style={styles.confirmedBadge}>{status.toUpperCase()}</Text>
      </View>

      <View style={styles.bookingBody}>
        <Text style={styles.bookingTitle}>{course.title}</Text>
        <View style={styles.bookingLocationRow}>
          <Ionicons name="location" size={12} color={theme.colors.textSoft} />
          <Text style={styles.bookingLocation}>{course.location}</Text>
        </View>

        <View style={styles.bookingMetaPanel}>
          <View>
            <Text style={styles.metaLabel}>DATE & TIME</Text>
            <Text style={styles.metaValue}>{dateTime}</Text>
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.metaLabel}>PLAYERS</Text>
            <Text style={styles.metaValue}>{players} People</Text>
          </View>
        </View>

        <Pressable style={styles.manageButton} onPress={() => onPressManage(bookingId)} variant="cta">
          <Text style={styles.manageButtonText}>Manage Booking</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function BookingsScreen() {
  const router = useRouter();
  const { horizontalPadding, screenBottomPadding } = useResponsiveLayout();
  const bookingState = useBookingState();
  const upcomingBookings = bookingState.bookings.filter(isUpcomingBooking);
  const historyBookings = bookingState.bookings.filter(isHistoricalBooking).slice(-3).reverse();

  const handleManageBooking = useCallback((bookingId: string) => {
    router.push({
      pathname: "/manage-booking",
      params: {
        bookingId,
      },
    });
  }, [router]);

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
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
            <Text style={styles.sectionRightText}>{upcomingBookings.length} Rounds Scheduled</Text>
          </View>

          {!bookingState.initialized || bookingState.loading ? (
            <Text style={styles.emptyText}>Loading your bookings...</Text>
          ) : null}
          {bookingState.error ? <Text style={styles.emptyText}>{bookingState.error}</Text> : null}

          {upcomingBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              bookingId={booking.id}
              courseId={booking.course_id}
              dateTime={formatBookingDateTime(booking)}
              players={booking.players}
              status={booking.status}
              onPressManage={handleManageBooking}
            />
          ))}

          {bookingState.initialized && !bookingState.loading && !upcomingBookings.length ? (
            <Text style={styles.emptyText}>No upcoming bookings yet. Book a tee time to get started.</Text>
          ) : null}
        </View>

        <View style={styles.activityPanel}>
          <Text style={styles.activityKicker}>BOOKING SYSTEM</Text>
          <Text style={styles.activityTitle}>Supabase-backed tee times with secure owner-only access.</Text>

          <View style={styles.activityStatsRow}>
            <View>
              <Text style={styles.statLabel}>ACTIVE</Text>
              <Text style={styles.statValue}>{upcomingBookings.length}</Text>
            </View>
            <View style={styles.statDivider} />
            <View>
              <Text style={styles.statLabel}>HISTORY</Text>
              <Text style={styles.statValue}>{historyBookings.length}</Text>
            </View>
          </View>

          <View style={styles.mvpWrap}>
            <View style={styles.mvpRing}>
              <Ionicons name="shield-checkmark" size={36} color={theme.colors.accentSoft} />
            </View>
            <Text style={styles.mvpBadge}>RLS Protected</Text>
          </View>
        </View>

        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Booking History</Text>
            <Pressable style={styles.viewAllButton} onPress={() => router.push("/booking-history")} variant="chip">
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
            </Pressable>
          </View>

          <View style={styles.historyList}>
            {historyBookings.map((booking) => {
              const course = getManagedCourseById(booking.course_id);

              return (
                <Pressable
                  key={booking.id}
                  style={styles.historyItem}
                  onPress={() => router.push({ pathname: "/manage-booking", params: { bookingId: booking.id } })}
                  variant="card"
                >
                  <View style={styles.historyLeft}>
                    <View style={styles.historyIconWrap}>
                      <Ionicons
                        name={booking.status === "cancelled" ? "close-circle" : "golf"}
                        size={18}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View>
                      <Text style={styles.historyName}>{course.title}</Text>
                      <Text style={styles.historyDate}>{formatBookingDate(booking.tee_date)}</Text>
                    </View>
                  </View>

                  <View style={styles.historyRight}>
                    <Text style={styles.metaLabel}>TOTAL</Text>
                    <Text style={styles.historyPrice}>${booking.total.toFixed(2)}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
                </Pressable>
              );
            })}
          </View>
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
    paddingTop: 10,
    paddingBottom: 160,
    gap: 16,
  },
  sectionWrap: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    alignSelf: "flex-end",
    paddingHorizontal: 11,
    height: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  viewAllText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  sectionTitle: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.text,
    fontWeight: "700",
  },
  sectionRightText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.accentWarm,
    fontWeight: "700",
  },
  bookingCard: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bookingImageWrap: {
    height: 140,
    position: "relative",
  },
  bookingImage: {
    width: "100%",
    height: "100%",
  },
  confirmedBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: theme.colors.primary,
    color: theme.colors.surface,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "700",
    letterSpacing: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  bookingBody: {
    padding: 12,
    gap: 10,
  },
  bookingTitle: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    color: theme.colors.text,
    fontWeight: "800",
  },
  bookingLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bookingLocation: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
  },
  bookingMetaPanel: {
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaRight: {
    alignItems: "flex-end",
  },
  metaLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.accentWarm,
    letterSpacing: 0.9,
    fontWeight: "700",
  },
  metaValue: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
    fontWeight: "700",
  },
  manageButton: {
    height: 46,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  manageButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "700",
  },
  activityPanel: {
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    padding: 18,
    gap: 12,
  },
  activityKicker: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.accentSoft,
    letterSpacing: 2,
    fontWeight: "700",
  },
  activityTitle: {
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    color: theme.colors.surface,
    fontWeight: "800",
  },
  activityStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textOnPrimaryMuted,
    letterSpacing: 1,
    fontWeight: "600",
  },
  statValue: {
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    color: theme.colors.surface,
    fontWeight: "800",
  },
  statDivider: {
    width: 1,
    height: 44,
    backgroundColor: theme.colors.overlaySoft,
  },
  mvpWrap: {
    alignItems: "center",
    marginTop: 4,
  },
  mvpRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 5,
    borderColor: theme.colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  mvpBadge: {
    marginTop: -10,
    backgroundColor: theme.colors.accentWarm,
    color: theme.colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "700",
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  historyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  historyName: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
    fontWeight: "700",
  },
  historyDate: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textSoft,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  historyPrice: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.accentWarm,
    fontWeight: "800",
  },
  emptyText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },
});
