import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { setIsLoggedIn } from "../components/auth";
import { allCourses, getCourseById } from "../components/course-data";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";

const PROFILE_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAtvP2yhWDyZzMmfqZm-64GbAQU1leygJR4XvWNEjNG-Y8v081n1CW6IT037D9o6EKGbW_KzlgUSeCaCsuls8kaOf3CWCfDCpuRg8mTqgE-TvlTlJ199VKcyl-HIuK5JNRGgRMDI0MCL7rrfrId46EMJzwDzPgyJ6MBXm5NL-UpL9rSHD-IMzKPu2uHWDcsyttzykYhj97m06K2Ih3V4L9cOmmEglnPOpkQSsXlM-Q66XRa4f4pJiywM7snw8CbQmvG5e7G8ASXoJA";

function BookingPreviewCard({
  courseId,
  title,
  location,
  image,
  date,
  teeTime,
  players,
  cart,
  code,
  onPress,
}: {
  courseId: string;
  title: string;
  location: string;
  image: string;
  date: string;
  teeTime: string;
  players: string;
  cart: string;
  code: string;
  onPress: (courseId: string, date: string, teeTime: string, players: string) => void;
}) {
  return (
    <Pressable style={styles.previewCard} onPress={() => onPress(courseId, date, teeTime, players)} variant="card">
      <View style={styles.previewImageWrap}>
        <AppImage source={{ uri: image }} style={styles.previewImage} />
        <View style={styles.previewOverlay} />

        <View style={styles.confirmedPill}>
          <View style={styles.confirmDot} />
          <Text style={styles.confirmedText}>CONFIRMED</Text>
        </View>

        <View style={styles.previewTextWrap}>
          <Text style={styles.previewTitle}>{title}</Text>
          <View style={styles.previewLocationRow}>
            <Ionicons name="location" size={12} color={theme.colors.textOnPrimarySoft} />
            <Text style={styles.previewLocation}>{location}</Text>
          </View>
        </View>
      </View>

      <View style={styles.previewMetaWrap}>
        <View style={styles.previewMetaGrid}>
          <View>
            <Text style={styles.metaLabel}>DATE</Text>
            <Text style={styles.metaValue}>{date}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>TEE TIME</Text>
            <Text style={styles.metaValue}>{teeTime}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>PLAYERS</Text>
            <Text style={styles.metaValue}>{players}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>CART</Text>
            <Text style={styles.metaValue}>{cart}</Text>
          </View>
        </View>

        <View style={styles.qrWrap}>
          <Ionicons name="qr-code" size={34} color={theme.colors.primary} />
          <Text style={styles.qrCodeText}>{code}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { screenBottomPadding, scaleFont, scaleLineHeight } = useResponsiveLayout();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const bookingA = getCourseById("1");
  const bookingB = getCourseById("2");
  const historyItems = useMemo(() => [allCourses[2], allCourses[3], allCourses[4]], []);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    await setIsLoggedIn(false);
    router.replace("/splash");
  }, [isLoggingOut, router]);

  const handleManageBooking = useCallback((courseId: string, date: string, teeTime: string, players: string) => {
    router.push({
      pathname: "/manage-booking",
      params: {
        id: courseId,
        dateTime: `${date}, ${teeTime}`,
        players,
      },
    });
  }, [router]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: screenBottomPadding }]}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.profileSection}>
          <Pressable style={styles.avatarWrap} onPress={() => router.push("/account")} variant="card">
            <AppImage source={{ uri: PROFILE_IMAGE }} style={styles.avatarImage} />
            <Pressable style={[styles.editButton]} onPress={() => router.push("/account")} variant="icon">
              <Ionicons name="create" size={13} color={theme.colors.surface} />
            </Pressable>
          </Pressable>

          <Text style={styles.memberSince}>MEMBER SINCE 2022</Text>
          <Text
            style={[
              styles.memberName,
              {
                fontSize: scaleFont(styles.memberName.fontSize),
                lineHeight: scaleLineHeight(styles.memberName.lineHeight),
              },
            ]}
          >
            Julian Sterling
          </Text>

          <View style={styles.statsPill}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>HANDICAP</Text>
              <Text style={styles.statValue}>12.4</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>AVG PAR</Text>
              <Text style={styles.statValue}>74</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>STATUS</Text>
              <View style={styles.statusRow}>
                <Ionicons name="sparkles" size={12} color={theme.colors.accentWarm} />
                <Text style={styles.statusText}>GOLD</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text
              style={[
                styles.sectionTitle,
                {
                  fontSize: scaleFont(styles.sectionTitle.fontSize),
                  lineHeight: scaleLineHeight(styles.sectionTitle.lineHeight),
                },
              ]}
            >
              Upcoming Bookings
            </Text>
            <View style={styles.sectionUnderline} />
          </View>
          <Pressable style={styles.viewAllButton} onPress={() => router.push("/bookings")} variant="chip">
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.previewRow}
          bounces={false}
          overScrollMode="never"
        >
          <BookingPreviewCard
            courseId={bookingA.id}
            title={bookingA.title}
            location={bookingA.location}
            image={bookingA.image}
            date="Oct 24, 2023"
            teeTime="08:15 AM"
            players="4 Balls"
            cart="Included"
            code="#GT-99281"
            onPress={handleManageBooking}
          />
          <BookingPreviewCard
            courseId={bookingB.id}
            title={bookingB.title}
            location={bookingB.location}
            image={bookingB.image}
            date="Nov 02, 2023"
            teeTime="10:30 AM"
            players="2 Balls"
            cart="Walk Only"
            code="#GT-88412"
            onPress={handleManageBooking}
          />
        </ScrollView>

        <View style={styles.actionsSection}>
          <Pressable style={[styles.actionCard]} onPress={() => router.push("/favourites")} variant="card">
            <View style={[styles.actionIconWrap, styles.actionIconAccent]}>
              <Ionicons name="heart" size={20} color={theme.colors.accentWarm} />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>Favourite Courses</Text>
              <Text style={styles.actionSubtitle}>Your saved courses in one clean list</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </Pressable>

          <Pressable style={[styles.actionCard]} onPress={() => router.push("/account")} variant="card">
            <View style={[styles.actionIconWrap, styles.actionIconPrimary]}>
              <Ionicons name="settings" size={20} color={theme.colors.surface} />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>Account</Text>
              <Text style={styles.actionSubtitle}>Profile, security & billing</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </Pressable>

          <Pressable style={[styles.actionCard]} onPress={() => router.push("/settings")} variant="card">
            <View style={[styles.actionIconWrap, styles.actionIconSecondary]}>
              <Ionicons name="options" size={20} color={theme.colors.accentWarm} />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>Settings</Text>
              <Text style={styles.actionSubtitle}>Notifications, privacy & app preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </Pressable>

          <Pressable style={[styles.actionCard]} onPress={() => void handleLogout()} disabled={isLoggingOut} variant="card">
            <View style={[styles.actionIconWrap, styles.actionIconDanger]}>
              <Ionicons name="log-out" size={20} color={theme.colors.surface} />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>{isLoggingOut ? "Logging Out..." : "Log Out"}</Text>
              <Text style={styles.actionSubtitle}>Mark this device as not logged in</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </Pressable>
        </View>

        <View style={styles.historySection}>
          <Text
            style={[
              styles.sectionTitle,
              {
                fontSize: scaleFont(styles.sectionTitle.fontSize),
                lineHeight: scaleLineHeight(styles.sectionTitle.lineHeight),
              },
            ]}
          >
            Booking History
          </Text>

          <View style={styles.historyList}>
            {historyItems.map((item, index) => (
              <Pressable key={item.id} style={[styles.historyItem]} onPress={() => router.push("/booking-history")} variant="card">
                <View style={styles.historyLeft}>
                  <View style={styles.historyThumb}>
                    <AppImage source={{ uri: item.image }} style={styles.historyThumbImage} />
                  </View>
                  <View>
                    <Text style={styles.historyName}>{item.title}</Text>
                    <Text style={styles.historyMeta}>Sep {12 - index * 7}, 2023 • Score: {84 - index * 5}</Text>
                  </View>
                </View>

                <View style={styles.historyRight}>
                  <Text style={styles.historyPrice}>{item.price}.00</Text>
                  <Text style={styles.historyStatus}>COMPLETED</Text>
                </View>
              </Pressable>
            ))}
          </View>

          <Pressable style={[styles.loadButton]} onPress={() => router.push("/booking-history")} variant="button">
            <Text style={styles.loadButtonText}>Load Full History</Text>
          </Pressable>
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
    paddingTop: 8,
    paddingBottom: 160,
  },
  profileSection: {
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 26,
  },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: theme.colors.surface,
    overflow: "hidden",
    position: "relative",
    marginBottom: 12,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  editButton: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  memberSince: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    letterSpacing: 2,
    color: theme.colors.accentWarm,
    fontWeight: "700",
    marginBottom: 2,
  },
  memberName: {
    fontSize: theme.typography.h1.fontSize,
    lineHeight: theme.typography.h1.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
    marginBottom: 10,
  },
  statsPill: {
    width: "100%",
    borderRadius: 14,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statCol: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textSoft,
    letterSpacing: 1,
    fontWeight: "700",
  },
  statValue: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  statusText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.accentWarm,
    fontWeight: "800",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    marginBottom: 12,
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
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  sectionUnderline: {
    marginTop: 2,
    width: 50,
    height: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
  previewRow: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 10,
  },
  previewCard: {
    width: 312,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  previewImageWrap: {
    height: 152,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlayDark,
  },
  confirmedPill: {
    position: "absolute",
    right: 10,
    top: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.glass,
    paddingHorizontal: 8,
    height: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  confirmDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.successStrong,
  },
  confirmedText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.primary,
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  previewTextWrap: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 12,
  },
  previewTitle: {
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    color: theme.colors.surface,
    fontWeight: "800",
  },
  previewLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  previewLocation: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textOnPrimaryStrong,
    fontWeight: "500",
  },
  previewMetaWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  previewMetaGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 10,
    columnGap: 14,
  },
  metaLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textSoft,
    letterSpacing: 1,
    fontWeight: "700",
  },
  metaValue: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  qrWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  qrCodeText: {
    marginTop: 2,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textSoft,
    fontWeight: "600",
    letterSpacing: 0.7,
  },
  actionsSection: {
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 14,
    marginBottom: 20,
  },
  actionCard: {
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconPrimary: {
    backgroundColor: theme.colors.primary,
  },
  actionIconSecondary: {
    backgroundColor: theme.colors.accentSoft,
  },
  actionIconDanger: {
    backgroundColor: theme.colors.danger,
  },
  actionIconAccent: {
    backgroundColor: theme.colors.accentSoft,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  actionSubtitle: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
  },
  historySection: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 10,
  },
  historyList: {
    gap: 14,
  },
  historyItem: {
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
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
  historyThumb: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceSoft,
  },
  historyThumbImage: {
    width: "100%",
    height: "100%",
  },
  historyName: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  historyMeta: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
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
  historyStatus: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.successText,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  loadButton: {
    marginTop: 4,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  loadButtonText: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
});
