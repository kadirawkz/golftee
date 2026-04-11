import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { getCourseById } from "../components/course-data";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";

const CHECKIN_QR_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC15RMxDTOjvLq2bokpb7irCZQMd_jpHwFzd-Ds2eu15F9z5E7B_Bd84nnNDonBol9FxOXwPhTmVDelDqGkvUeAw76jmEgy-jSX97QjIpwPCNTw-_fO8dSGkqJT5HN2hvSQfMlE3-nQeoco91Vfrryook_fQbxDW1r6hfQkMcpc7mQkjb-z8XSYksvhcXeGPHW30o25IYBAtRzxzuA82vYJ4sIedKfnctiXLKkuyeA2OjTaUwzQHaH2Hwrjucw3ONR9aEUfVjckcDg";

const PARTY_BUBBLE_STYLES = [
  "avatarBubbleMuted",
  "avatarBubbleSuccess",
  "avatarBubbleAccent",
] as const;

export default function ManageBookingScreen() {
  const router = useRouter();
  const { horizontalPadding, screenBottomPadding } = useResponsiveLayout();
  const params = useLocalSearchParams<{ id?: string | string[]; dateTime?: string | string[]; players?: string | string[] }>();
  const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const dateTimeParam = Array.isArray(params.dateTime) ? params.dateTime[0] : params.dateTime;
  const playersParam = Array.isArray(params.players) ? params.players[0] : params.players;
  const course = getCourseById(courseId);
  const dateTime = dateTimeParam ?? "Oct 24, 08:45 AM";
  const playersLabel = playersParam ?? "4 People";
  const splitDateTime = dateTime.split(",");
  const bookingDate = splitDateTime[0]?.trim() || "Oct 24, 2023";
  const bookingTime = splitDateTime[1]?.trim() || "08:45 AM";
  const parsedPlayersCount = Number.parseInt(playersLabel, 10);
  const playersCount = Number.isInteger(parsedPlayersCount) && parsedPlayersCount > 0 ? parsedPlayersCount : 4;
  const visiblePlayerBubbles = Math.min(playersCount, PARTY_BUBBLE_STYLES.length + 1);
  const overflowPlayers = Math.max(playersCount - PARTY_BUBBLE_STYLES.length, 0);

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
        <View style={styles.heroCard}>
          <AppImage source={{ uri: course.image }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.confirmedPill}>
              <Text style={styles.confirmedPillText}>CONFIRMED</Text>
            </View>
            <Text style={styles.heroTitle}>{course.title}</Text>
            <Text style={styles.heroSubtitle}>Premium 18-Hole Championship Course</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaCard}>
            <Ionicons name="calendar-outline" size={22} color={theme.colors.primary} />
            <Text style={styles.metaTitle}>DATE</Text>
            <Text style={styles.metaMain}>{bookingDate}</Text>
          </View>

          <View style={styles.metaCard}>
            <Ionicons name="time-outline" size={22} color={theme.colors.primary} />
            <Text style={styles.metaTitle}>TEE TIME</Text>
            <Text style={styles.metaMain}>{bookingTime}</Text>
          </View>
        </View>

          <View style={styles.partyCard}>
          <View>
            <Text style={styles.metaTitle}>PARTY SIZE</Text>
            <Text style={styles.metaMain}>{playersCount} Players</Text>
          </View>
          <View style={styles.avatarRow}>
            {Array.from({ length: visiblePlayerBubbles }).map((_, index) => {
              if (index === PARTY_BUBBLE_STYLES.length && overflowPlayers > 0) {
                return (
                  <View key={`overflow-${overflowPlayers}`} style={[styles.avatarBubble, styles.avatarMore]}>
                    <Text style={styles.avatarMoreText}>{`+${overflowPlayers}`}</Text>
                  </View>
                );
              }

              const bubbleStyle = PARTY_BUBBLE_STYLES[index] ?? PARTY_BUBBLE_STYLES[PARTY_BUBBLE_STYLES.length - 1];
              return <View key={`player-${index + 1}`} style={[styles.avatarBubble, styles[bubbleStyle]]} />;
            })}
          </View>
        </View>

        <View style={styles.qrSection}>
          <Text style={styles.qrTitle}>Check-in at Pro Shop</Text>
          <Text style={styles.qrSubtitle}>Scan this code upon arrival to confirm your tee time.</Text>
          <View style={styles.qrImageWrap}>
            <AppImage source={{ uri: CHECKIN_QR_IMAGE }} style={styles.qrImage} />
          </View>
          <Text style={styles.qrId}>ID: GT-{course.id.padStart(5, "0")}-0XC</Text>
        </View>

        <View style={styles.actionList}>
          <Pressable style={[styles.primaryAction]} variant="cta">
            <Ionicons name="calendar-outline" size={22} color={theme.colors.surface} />
            <Text style={styles.primaryActionText}>Add to Calendar</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryAction]}
            onPress={() => router.push({ pathname: "/tee-time-booking", params: { id: course.id } })}
            variant="button"
          >
            <Ionicons name="create-outline" size={22} color={theme.colors.primary} />
            <Text style={styles.secondaryActionText}>Modify Booking</Text>
          </Pressable>

          <Pressable style={[styles.dangerAction]} variant="button">
            <Ionicons name="close-circle" size={22} color={theme.colors.danger} />
            <Text style={styles.dangerActionText}>Cancel Reservation</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.detailsCard]}
          onPress={() => router.push({ pathname: "/course-details", params: { id: course.id } })}
          variant="card"
        >
          <View style={styles.detailsLeft}>
            <View style={styles.detailsIconWrap}>
              <Ionicons name="information-circle" size={22} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.detailsTitle}>Course Details</Text>
              <Text style={styles.detailsSubtitle}>Directions, amenities, and course rules</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSoft} />
        </Pressable>
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
    paddingTop: 12,
    paddingBottom: 160,
    gap: 12,
  },
  heroCard: {
    height: 204,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlayHero,
  },
  heroContent: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  confirmedPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: theme.colors.accentSoft,
    paddingHorizontal: 11,
    paddingVertical: 4,
    marginBottom: 6,
  },
  confirmedPillText: {
    color: theme.colors.accentWarm,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: theme.colors.surface,
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    fontWeight: "800",
    marginBottom: 2,
  },
  heroSubtitle: {
    color: theme.colors.textOnPrimarySoft,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
  },
  metaGrid: {
    flexDirection: "row",
    gap: 10,
  },
  metaCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 13,
    gap: 5,
  },
  metaTitle: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textSoft,
    letterSpacing: 1.1,
    fontWeight: "700",
  },
  metaMain: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    color: theme.colors.text,
    fontWeight: "700",
  },
  partyCard: {
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatarRow: {
    flexDirection: "row",
    marginLeft: 8,
  },
  avatarBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    marginLeft: -9,
  },
  avatarBubbleMuted: {
    backgroundColor: theme.colors.muted,
  },
  avatarBubbleSuccess: {
    backgroundColor: theme.colors.success,
  },
  avatarBubbleAccent: {
    backgroundColor: theme.colors.accent,
  },
  avatarMore: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.muted,
  },
  avatarMoreText: {
    color: theme.colors.surface,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "700",
  },
  qrSection: {
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: "center",
    gap: 7,
  },
  qrTitle: {
    color: theme.colors.surface,
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    fontWeight: "700",
  },
  qrSubtitle: {
    color: theme.colors.textOnPrimarySoft,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    textAlign: "center",
    marginBottom: 6,
  },
  qrImageWrap: {
    width: 208,
    height: 238,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrId: {
    color: theme.colors.textOnPrimaryDim,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    letterSpacing: 1,
    fontWeight: "600",
  },
  actionList: {
    gap: 10,
  },
  primaryAction: {
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  primaryActionText: {
    color: theme.colors.surface,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "700",
  },
  secondaryAction: {
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  secondaryActionText: {
    color: theme.colors.text,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "700",
  },
  dangerAction: {
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  dangerActionText: {
    color: theme.colors.danger,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "700",
  },
  detailsCard: {
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  detailsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  detailsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    fontWeight: "700",
  },
  detailsSubtitle: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    marginTop: 1,
  },
});
