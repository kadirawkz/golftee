import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { getCourseById } from "../components/course-data";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";

const UPCOMING_BOOKINGS = [
  { courseId: "1", dateTime: "Oct 14, 08:30 AM", players: "4 People" },
  { courseId: "2", dateTime: "Oct 21, 10:15 AM", players: "2 People" },
] as const;

const HISTORY_ITEMS = [
  { id: "4", icon: "golf" as const, date: "September 28, 2023" },
  { id: "5", icon: "water" as const, date: "September 15, 2023" },
  { id: "6", icon: "flag" as const, date: "August 30, 2023" },
];

function BookingCard({
  courseId,
  image,
  title,
  location,
  dateTime,
  players,
  onPressManage,
}: {
  courseId: string;
  image: string;
  title: string;
  location: string;
  dateTime: string;
  players: string;
  onPressManage: (courseId: string, dateTime: string, players: string) => void;
}) {
  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingImageWrap}>
        <AppImage source={{ uri: image }} style={styles.bookingImage} />
        <Text style={styles.confirmedBadge}>CONFIRMED</Text>
      </View>

      <View style={styles.bookingBody}>
        <Text style={styles.bookingTitle}>{title}</Text>
        <View style={styles.bookingLocationRow}>
          <Ionicons name="location" size={12} color={theme.colors.textSoft} />
          <Text style={styles.bookingLocation}>{location}</Text>
        </View>

        <View style={styles.bookingMetaPanel}>
          <View>
            <Text style={styles.metaLabel}>DATE & TIME</Text>
            <Text style={styles.metaValue}>{dateTime}</Text>
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.metaLabel}>PLAYERS</Text>
            <Text style={styles.metaValue}>{players}</Text>
          </View>
        </View>

        <Pressable style={[styles.manageButton]} onPress={() => onPressManage(courseId, dateTime, players)} variant="cta">
          <Text style={styles.manageButtonText}>Manage Booking</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function BookingsScreen() {
  const router = useRouter();
  const { horizontalPadding, screenBottomPadding } = useResponsiveLayout();

  const handleManageBooking = useCallback((courseId: string, dateTime: string, players: string) => {
    router.push({
      pathname: "/manage-booking",
      params: {
        id: courseId,
        dateTime,
        players,
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
            <Text style={styles.sectionRightText}>{UPCOMING_BOOKINGS.length} Rounds Scheduled</Text>
          </View>

          {UPCOMING_BOOKINGS.map((booking) => {
            const course = getCourseById(booking.courseId);

            return (
              <BookingCard
                key={booking.courseId}
                courseId={booking.courseId}
                image={course.image}
                title={course.title}
                location={course.location}
                dateTime={booking.dateTime}
                players={booking.players}
                onPressManage={handleManageBooking}
              />
            );
          })}
        </View>

        <View style={styles.activityPanel}>
          <Text style={styles.activityKicker}>RECENT ACTIVITY</Text>
          <Text style={styles.activityTitle}>Masterful Round at{"\n"}{getCourseById("3").title}</Text>

          <View style={styles.activityStatsRow}>
            <View>
              <Text style={styles.statLabel}>FINAL SCORE</Text>
              <Text style={styles.statValue}>-2 (70)</Text>
            </View>
            <View style={styles.statDivider} />
            <View>
              <Text style={styles.statLabel}>RANK</Text>
              <Text style={styles.statValue}>#1 <Text style={styles.rankSuffix}>/ 12</Text></Text>
            </View>
          </View>

          <View style={styles.mvpWrap}>
            <View style={styles.mvpRing}>
              <Ionicons name="ribbon" size={36} color={theme.colors.accentSoft} />
            </View>
            <Text style={styles.mvpBadge}>MVP Status</Text>
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
            {HISTORY_ITEMS.map((item) => {
              const course = getCourseById(item.id);

              return (
                <Pressable key={item.id} style={[styles.historyItem]} onPress={() => router.push("/booking-history")} variant="card">
                  <View style={styles.historyLeft}>
                    <View style={styles.historyIconWrap}>
                      <Ionicons name={item.icon} size={18} color={theme.colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.historyName}>{course.title}</Text>
                      <Text style={styles.historyDate}>{item.date}</Text>
                    </View>
                  </View>

                  <View style={styles.historyRight}>
                    <Text style={styles.metaLabel}>PRICE</Text>
                    <Text style={styles.historyPrice}>{course.price}.00</Text>
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
    fontSize: theme.typography.h1.fontSize,
    lineHeight: theme.typography.h1.lineHeight,
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
  rankSuffix: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textOnPrimaryMuted,
    fontWeight: "500",
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
});
