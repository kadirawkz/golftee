import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { getCourseById } from "../components/course-data";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";

function parsePositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parsePlayerCount(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getFirstParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function BookingCheckoutScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { scaleFont, scaleLineHeight } = useResponsiveLayout();
  const params = useLocalSearchParams<{
    id?: string | string[];
    players?: string | string[];
    date?: string | string[];
    day?: string | string[];
    time?: string | string[];
    period?: string | string[];
    subtotal?: string | string[];
    serviceFee?: string | string[];
    caddyFee?: string | string[];
    taxes?: string | string[];
    total?: string | string[];
  }>();

  const [selectedPayment, setSelectedPayment] = useState<"wallet" | "card">("wallet");

  const handlePaymentChange = (method: "wallet" | "card") => {
    setSelectedPayment(method);
  };

  const courseId = getFirstParamValue(params.id);
  const playersParam = getFirstParamValue(params.players);
  const subtotalParam = getFirstParamValue(params.subtotal);
  const serviceFeeParam = getFirstParamValue(params.serviceFee);
  const caddyFeeParam = getFirstParamValue(params.caddyFee);
  const taxesParam = getFirstParamValue(params.taxes);
  const totalParam = getFirstParamValue(params.total);
  const dateParam = getFirstParamValue(params.date);
  const timeParam = getFirstParamValue(params.time);
  const periodParam = getFirstParamValue(params.period);
  const dayParam = getFirstParamValue(params.day);

  const course = getCourseById(courseId);
  const players = parsePlayerCount(playersParam, 3);
  const subtotal = parsePositiveNumber(subtotalParam, 0);
  const serviceFee = parsePositiveNumber(serviceFeeParam, 12.5);
  const caddyFee = parsePositiveNumber(caddyFeeParam, 0);
  const taxesAndFees = parsePositiveNumber(taxesParam, Number((subtotal * 0.0845).toFixed(2)));
  const totalAmount = parsePositiveNumber(
    totalParam,
    Number((subtotal + serviceFee + caddyFee + taxesAndFees).toFixed(2))
  );
  const selectedDate = dateParam ?? "Not selected";
  const selectedTime = timeParam ? `${timeParam} ${periodParam ?? ""}`.trim() : "Not selected";
  const selectedDay = dayParam ?? "";
  const walletPaymentLabel =
    Platform.OS === "ios" ? "Apple Pay" : Platform.OS === "android" ? "Google Pay" : "Digital Wallet";
  const walletPaymentBadge = Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "GPay" : "Wallet";
  const isCompactScreen = width < 360;
  const isTabletLike = width >= 768;
  const horizontalPadding = isTabletLike ? Math.max((width - 620) / 2, 24) : isCompactScreen ? 12 : 16;
  const contentMaxWidth = isTabletLike ? 620 : 999;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: 170 + insets.bottom,
          },
        ]}
        bounces={false}
        overScrollMode="never"
      >
        <View style={[styles.contentBlock, { maxWidth: contentMaxWidth }]}>
        <View style={styles.headlineWrap}>
          <Text style={styles.kicker}>SECURE CHECKOUT</Text>
          <Text
            style={[
              styles.headline,
              isCompactScreen && styles.headlineCompact,
              {
                fontSize: scaleFont(styles.headline.fontSize),
                lineHeight: scaleLineHeight(styles.headline.lineHeight),
              },
            ]}
          >
            Confirm Your Booking
          </Text>
        </View>

        <View style={styles.courseHero}>
          <AppImage source={{ uri: course.image }} style={styles.courseHeroImage} />
          <View style={styles.courseHeroOverlay} />
          <View style={styles.courseHeroContent}>
            <Text style={styles.courseName}>{course.title}</Text>
          </View>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>Booking Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{selectedDate}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Day</Text>
            <Text style={styles.detailValue}>{selectedDay || "-"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tee Time</Text>
            <Text style={styles.detailValue}>{selectedTime}</Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={styles.detailLabel}>Players</Text>
            <Text style={styles.detailValue}>{players}</Text>
          </View>
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>

            <Pressable
              style={[styles.paymentCard, selectedPayment === "wallet" && styles.paymentCardActive]}
              onPress={() => handlePaymentChange("wallet")}
              variant="card"
            >
              <View style={styles.paymentLeft}>
                <View
                  style={[
                    styles.paymentIconWrap,
                    Platform.OS === "ios" ? styles.appleIcon : styles.walletIconWrap,
                  ]}
                >
                  <Text style={[styles.appleText, Platform.OS !== "ios" && styles.walletIconText]}>
                    {walletPaymentBadge}
                  </Text>
                </View>
                <View>
                  <Text style={styles.paymentName}>{walletPaymentLabel}</Text>
                  <Text style={styles.paymentSub}>Fast, secure checkout</Text>
                </View>
              </View>
              <View style={selectedPayment === "wallet" ? styles.radioOuterActive : styles.radioOuter}>
                {selectedPayment === "wallet" && <View style={styles.radioInnerActive} />}
              </View>
            </Pressable>

            <Pressable
              style={[styles.paymentCard, selectedPayment === "card" && styles.paymentCardActive]}
              onPress={() => handlePaymentChange("card")}
              variant="card"
            >
              <View style={styles.paymentLeft}>
                <View style={styles.paymentIconWrap}>
                  <Ionicons name="card" size={22} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={styles.paymentName}>.... 8829</Text>
                  <Text style={styles.paymentSub}>Mastercard - Expires 08/25</Text>
                </View>
              </View>
              <View style={selectedPayment === "card" ? styles.radioOuterActive : styles.radioOuter}>
                {selectedPayment === "card" && <View style={styles.radioInnerActive} />}
              </View>
            </Pressable>
          </View>

        <View style={styles.priceCard}>
          <Text style={styles.priceTitle}>Price Summary</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Green Fees ({players} Players)</Text>
            <Text style={styles.priceValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Service Fee</Text>
            <Text style={styles.priceValue}>${serviceFee.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Caddy Fee</Text>
            <Text style={styles.priceValue}>${caddyFee.toFixed(2)}</Text>
          </View>
          <View style={[styles.priceRow, styles.priceBorderBottom]}>
            <Text style={styles.priceLabel}>Taxes & Fees</Text>
            <Text style={styles.priceValue}>${taxesAndFees.toFixed(2)}</Text>
          </View>

          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text
              style={[
                styles.totalAmount,
                {
                  fontSize: scaleFont(styles.totalAmount.fontSize),
                  lineHeight: scaleLineHeight(styles.totalAmount.lineHeight),
                },
              ]}
            >
              ${totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>
        </View>
      </ScrollView>

      <View style={[styles.footerCtaWrap, { paddingHorizontal: horizontalPadding, paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.footerCtaInner, { maxWidth: contentMaxWidth }]}>
          <Pressable style={[styles.placeButton]} onPress={() => router.replace("/bookings")} variant="cta">
            <Text style={styles.placeButtonText}>Place Booking</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.surface} />
          </Pressable>
          <Text style={styles.footerPolicy}>
            BY CLICKING PLACE BOOKING, YOU AGREE TO THE CLUB&apos;S CANCELLATION POLICY.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 180,
    gap: 14,
    alignItems: "center",
  },
  contentBlock: {
    width: "100%",
    gap: 14,
  },
  headlineWrap: {
    gap: 3,
  },
  kicker: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    letterSpacing: 2,
    fontWeight: "700",
  },
  headline: {
    color: theme.colors.primary,
    fontSize: theme.typography.displayL.fontSize,
    lineHeight: theme.typography.displayL.lineHeight,
    fontWeight: "800",
  },
  headlineCompact: {
    fontSize: theme.typography.displayS.fontSize,
    lineHeight: theme.typography.displayS.lineHeight,
  },
  courseHero: {
    height: 164,
    borderRadius: 16,
    overflow: "hidden",
  },
  courseHeroImage: {
    width: "100%",
    height: "100%",
  },
  courseHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlayHero,
  },
  courseHeroContent: {
    position: "absolute",
    bottom: 12,
    left: 14,
    right: 14,
  },
  courseName: {
    color: theme.colors.surface,
    fontSize: theme.typography.h1.fontSize,
    lineHeight: theme.typography.h1.lineHeight,
    fontWeight: "800",
  },
  detailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailTitle: {
    color: theme.colors.primary,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "700",
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 4,
  },
  detailLabel: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
  detailValue: {
    color: theme.colors.primary,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    fontWeight: "700",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: theme.colors.primary,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "800",
  },
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  paymentCardActive: {
    borderColor: theme.colors.primary,
  },
  paymentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceTint,
  },
  appleIcon: {
    backgroundColor: theme.colors.inverse,
  },
  appleText: {
    color: theme.colors.surface,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "800",
  },
  walletIconWrap: {
    backgroundColor: theme.colors.primarySoft,
  },
  walletIconText: {
    color: theme.colors.primary,
  },
  paymentName: {
    color: theme.colors.primary,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "700",
  },
  paymentSub: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.borderStrong,
  },
  radioOuterActive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInnerActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  priceCard: {
    backgroundColor: theme.colors.surfaceTint,
    borderRadius: 16,
    padding: 16,
    marginTop: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  priceTitle: {
    color: theme.colors.primary,
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    fontWeight: "800",
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  priceLabel: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
  },
  priceValue: {
    color: theme.colors.primary,
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    fontWeight: "800",
  },
  priceBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 12,
    marginBottom: 14,
  },
  totalRow: {
    marginBottom: 0,
  },
  totalLabel: {
    color: theme.colors.primary,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "800",
  },
  totalAmount: {
    color: theme.colors.primary,
    fontSize: theme.typography.h1.fontSize,
    lineHeight: theme.typography.h1.lineHeight,
    fontWeight: "900",
  },
  footerCtaWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.glass,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
    paddingBottom: 36,
    alignItems: "center",
  },
  footerCtaInner: {
    width: "100%",
  },
  placeButton: {
    height: 58,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  placeButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "800",
  },
  footerPolicy: {
    marginTop: 10,
    textAlign: "center",
    color: theme.colors.textSoft,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight + 2,
    fontWeight: "600",
    letterSpacing: 0.6,
  },
});
