import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Platform, ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import {
  cancelBooking,
  formatBookingDate,
  formatBookingTime,
  getBookingTotal,
  isCancellableBooking,
  isEditableBooking,
  useBookingState,
} from "../services/bookings";
import { getManagedCourseById, useCourseCatalog } from "../services/course-management";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { createThemedStyleSheet, useThemedStyles, useAppTheme, theme } from "../components/theme";
import { getCourseImage } from "../lib/image-mapping";

const CHECKIN_QR_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC15RMxDTOjvLq2bokpb7irCZQMd_jpHwFzd-Ds2eu15F9z5E7B_Bd84nnNDonBol9FxOXwPhTmVDelDqGkvUeAw76jmEgy-jSX97QjIpwPCNTw-_fO8dSGkqJT5HN2hvSQfMlE3-nQeoco91Vfrryook_fQbxDW1r6hfQkMcpc7mQkjb-z8XSYksvhcXeGPHW30o25IYBAtRzxzuA82vYJ4sIedKfnctiXLKkuyeA2OjTaUwzQHaH2Hwrjucw3ONR9aEUfVjckcDg";

const PARTY_BUBBLE_STYLES = [
  "avatarBubbleMuted",
  "avatarBubbleSuccess",
  "avatarBubbleAccent",
] as const;

export default function ManageBookingScreen() {
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const router = useRouter();
  const { screenBottomPadding, isTabletLike, maxContentWidth, horizontalPadding } = useResponsiveLayout();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string | string[] }>();
  useCourseCatalog();
  const resolvedBookingId = Array.isArray(bookingId) ? bookingId[0] : bookingId;
  const bookingState = useBookingState();
  const booking = useMemo(
    () => bookingState.bookings.find((item) => item.id === resolvedBookingId) ?? null,
    [bookingState.bookings, resolvedBookingId],
  );
  const course = getManagedCourseById(booking?.course_id);
  const [isCancelling, setIsCancelling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const visiblePlayerBubbles = booking ? Math.min(booking.players, PARTY_BUBBLE_STYLES.length + 1) : 0;
  const overflowPlayers = booking ? Math.max(booking.players - PARTY_BUBBLE_STYLES.length, 0) : 0;
  const canModifyBooking = booking ? isEditableBooking(booking) : false;
  const canCancelBooking = booking ? isCancellableBooking(booking) : false;

  const handleCancelBooking = async () => {
    if (!booking || isCancelling || !canCancelBooking) {
      return;
    }

    setIsCancelling(true);
    setNotice(null);

    try {
      await cancelBooking(booking.id);
      setNotice("Booking cancelled and the tee slot has been released.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to cancel this booking right now.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (!bookingState.initialized || bookingState.loading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
        <View style={styles.centerState}>
          <Text style={styles.centerStateText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
        <View style={styles.centerState}>
          <Text style={styles.centerStateText}>Booking not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderHeroSection = () => (
    <View style={styles.heroCard}>
      <AppImage source={getCourseImage(course.image)} style={styles.heroImage} />
      <View style={styles.heroOverlay} />
      <View style={styles.heroContent}>
        <View style={styles.confirmedPill}>
          <Text style={styles.confirmedPillText}>{booking.status.toUpperCase()}</Text>
        </View>
        <Text style={styles.heroTitle}>{course.title}</Text>
        <Text style={styles.heroSubtitle}>Booking code {booking.booking_code}</Text>
      </View>
    </View>
  );

  const renderDetailsSection = () => (
    <>
      <View style={styles.metaGrid}>
        <View style={styles.metaCard}>
          <Ionicons name="calendar-outline" size={22} color={colors.primary} />
          <Text style={styles.metaTitle}>DATE</Text>
          <Text style={styles.metaMain} numberOfLines={1} adjustsFontSizeToFit>{formatBookingDate(booking.tee_date)}</Text>
        </View>

        <View style={styles.metaCard}>
          <Ionicons name="time-outline" size={22} color={colors.primary} />
          <Text style={styles.metaTitle}>TEE TIME</Text>
          <Text style={styles.metaMain} numberOfLines={1} adjustsFontSizeToFit>{formatBookingTime(booking.tee_time)}</Text>
        </View>
      </View>

      <View style={styles.partyCard}>
        <View>
          <Text style={styles.metaTitle}>PARTY SIZE</Text>
          <Text style={styles.partyMain}>{booking.players} Players</Text>
        </View>
        <View style={styles.avatarRow}>
          {Array.from({ length: visiblePlayerBubbles }).map((_, index) => {
            if (index === PARTY_BUBBLE_STYLES.length && overflowPlayers > 0) {
              return (
                <View key={`overflow-${overflowPlayers}`} style={[styles.avatarBubble, styles.avatarMore]}>
                  <Ionicons name="person" size={16} color={colors.surface} />
                  <Text style={styles.avatarMoreText}>{`+${overflowPlayers}`}</Text>
                </View>
              );
            }

            const bubbleStyle = PARTY_BUBBLE_STYLES[index] ?? PARTY_BUBBLE_STYLES[PARTY_BUBBLE_STYLES.length - 1];
            return (
              <View key={`player-${index + 1}`} style={[styles.avatarBubble, styles[bubbleStyle], index === 0 && styles.avatarFirst]}>
                <Ionicons name="person" size={16} color={colors.surface} />
              </View>
            );
          })}
        </View>
      </View>
    </>
  );

  const renderQrSection = () => (
    <View style={styles.qrSection}>
      <Text style={styles.qrTitle}>Check-in at Pro Shop</Text>
      <Text style={styles.qrSubtitle}>Scan this code upon arrival to confirm your tee time.</Text>
      <View style={styles.qrImageWrap}>
        <AppImage source={{ uri: CHECKIN_QR_IMAGE }} style={styles.qrImage} />
      </View>
      <Text style={styles.qrId}>ID: {booking.booking_code}</Text>
    </View>
  );

  const renderPriceSection = () => (
    <View style={styles.priceCard}>
      <Text style={styles.priceTitle}>Booking Costs</Text>
      <View style={styles.priceSeparator} />
      {[
        { label: "Green Fees", value: booking.green_fee },
        { label: "Service Fee", value: booking.service_fee },
        { label: "Caddy Fee", value: booking.caddy_fee },
        { label: "Taxes", value: booking.taxes },
      ].map(({ label, value }) => (
        <View key={label} style={styles.priceRow}>
          <Text style={styles.priceLabel}>{label}</Text>
          <Text style={styles.priceValue}>${value.toFixed(2)}</Text>
        </View>
      ))}
      <View style={styles.priceSeparator} />
      <View style={styles.priceRow}>
        <Text style={styles.priceTotalLabel}>Total</Text>
        <Text style={styles.priceTotalValue}>${getBookingTotal(booking).toFixed(2)}</Text>
      </View>
    </View>
  );

  const renderActionsSection = () => (
    <View style={styles.actionList}>
      <Pressable style={styles.primaryAction} variant="cta">
        <Ionicons name="calendar-outline" size={22} color={colors.surface} />
        <Text style={styles.primaryActionText}>Add to Calendar</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryAction}
        onPress={() =>
          router.navigate({
            pathname: "/tee-time-booking",
            params: { bookingId: booking.id, id: course.id },
          })
        }
        disabled={!canModifyBooking}
        variant="button"
      >
        <Ionicons name="create-outline" size={22} color={colors.primary} />
        <Text style={styles.secondaryActionText}>{canModifyBooking ? "Modify Booking" : "Booking Locked"}</Text>
      </Pressable>

      <Pressable
        style={styles.dangerAction}
        onPress={() => void handleCancelBooking()}
        disabled={isCancelling || !canCancelBooking}
        variant="button"
      >
        {isCancelling ? (
          <ActivityIndicator size="small" color={colors.danger} />
        ) : (
          <Ionicons name="close-circle" size={22} color={colors.danger} />
        )}
        <Text style={styles.dangerActionText}>
          {!canCancelBooking ? "Cancellation Closed" : "Cancel Reservation"}
        </Text>
      </Pressable>
    </View>
  );

  const renderCourseDetailsLink = () => (
    <Pressable
      style={styles.detailsCard}
      onPress={() => router.navigate({ pathname: "/course-details", params: { id: course.id } })}
      variant="card"
    >
      <View style={styles.detailsLeft}>
        <View style={styles.detailsIconWrap}>
          <Ionicons name="information-circle" size={22} color={colors.primary} />
        </View>
        <View style={styles.detailsTextBlock}>
          <Text style={styles.detailsTitle}>Course Details</Text>
          <Text style={styles.detailsSubtitle}>Directions, amenities, and course rules</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSoft} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScrollView
        showsVerticalScrollIndicator={Platform.OS === "web"}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: screenBottomPadding },
        ]}
        bounces={false}
        overScrollMode="never"
      >
        <View style={[styles.contentBlock, { maxWidth: maxContentWidth }]}>
          {isTabletLike ? (
            <View style={styles.desktopLayoutRow}>
              <View style={styles.desktopColumnLeft}>
                {renderHeroSection()}
                {renderDetailsSection()}
                {renderQrSection()}
              </View>

              <View style={styles.desktopColumnRight}>
                {renderPriceSection()}
                {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
                {!canModifyBooking && booking.status === "confirmed" ? (
                  <Text style={styles.noticeText}>This booking is now read-only because the tee time has passed.</Text>
                ) : null}
                {renderActionsSection()}
                {renderCourseDetailsLink()}
              </View>
            </View>
          ) : (
            <View style={styles.mobileStack}>
              {renderHeroSection()}
              {renderDetailsSection()}
              {renderQrSection()}
              {renderPriceSection()}
              {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
              {!canModifyBooking && booking.status === "confirmed" ? (
                <Text style={styles.noticeText}>This booking is now read-only because the tee time has passed.</Text>
              ) : null}
              {renderActionsSection()}
              {renderCourseDetailsLink()}
            </View>
          )}
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
    paddingTop: 12,
    paddingBottom: 40,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centerStateText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: colors.textSoft,
    fontWeight: "600",
    textAlign: "center",
  },
  // Mobile: a View with gap so all sections are evenly spaced
  mobileStack: {
    width: "100%",
    gap: 12,
  },
  heroCard: {
    height: 204,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayHero,
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
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 11,
    paddingVertical: 4,
    marginBottom: 6,
  },
  confirmedPillText: {
    color: colors.accentWarm,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    fontWeight: "800",
    marginBottom: 2,
  },
  heroSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 13,
    gap: 4,
    minWidth: 0,
  },
  metaTitle: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: colors.textSoft,
    letterSpacing: 1.1,
    fontWeight: "700",
  },
  metaMain: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: colors.text,
    fontWeight: "700",
    flexShrink: 1,
  },
  partyCard: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  partyMain: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: colors.text,
    fontWeight: "700",
    marginTop: 2,
  },
  avatarRow: {
    flexDirection: "row",
  },
  avatarBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.surface,
    marginLeft: -9,
    alignItems: "center",
    justifyContent: "center",
  },
  // First bubble gets no negative margin
  avatarFirst: {
    marginLeft: 0,
  },
  avatarBubbleMuted: {
    backgroundColor: colors.muted,
  },
  avatarBubbleSuccess: {
    backgroundColor: colors.success,
  },
  avatarBubbleAccent: {
    backgroundColor: colors.accent,
  },
  avatarMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: colors.muted,
    paddingHorizontal: 7,
  },
  avatarMoreText: {
    color: colors.surface,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "700",
  },
  qrSection: {
    borderRadius: 18,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: "center",
    gap: 6,
  },
  qrTitle: {
    color: colors.surface,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "700",
  },
  qrSubtitle: {
    color: colors.textOnPrimarySoft,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    textAlign: "center",
    marginBottom: 4,
  },
  qrImageWrap: {
    width: 208,
    height: 208,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  qrImage: {
    width: 196,
    height: 196,
  },
  qrId: {
    color: colors.textOnPrimaryDim,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    letterSpacing: 1,
    fontWeight: "600",
  },
  // Price card with proper row layout
  priceCard: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  priceTitle: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: colors.primary,
    fontWeight: "800",
  },
  priceSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceLabel: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: colors.textSoft,
    fontWeight: "500",
  },
  priceValue: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: colors.text,
    fontWeight: "600",
  },
  priceTotalLabel: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: colors.primary,
    fontWeight: "800",
  },
  priceTotalValue: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: colors.primary,
    fontWeight: "800",
  },
  noticeText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
    fontWeight: "600",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  actionList: {
    gap: 10,
  },
  primaryAction: {
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  primaryActionText: {
    color: colors.surface,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "700",
  },
  secondaryAction: {
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  secondaryActionText: {
    color: colors.text,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "700",
  },
  dangerAction: {
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  dangerActionText: {
    color: colors.danger,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "700",
  },
  detailsCard: {
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  detailsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  detailsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  detailsTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  detailsTitle: {
    color: colors.text,
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    fontWeight: "700",
  },
  detailsSubtitle: {
    color: colors.textSoft,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    marginTop: 1,
  },
  contentBlock: {
    width: "100%",
    alignSelf: "center",
  },
  desktopLayoutRow: {
    flexDirection: "row",
    gap: 24,
    width: "100%",
    alignItems: "flex-start",
  },
  desktopColumnLeft: {
    flex: 1.2,
    gap: 16,
    width: "100%",
  },
  desktopColumnRight: {
    flex: 1,
    gap: 16,
    width: "100%",
  },
}));








