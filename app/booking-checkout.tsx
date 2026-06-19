import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { createBooking, updateBooking } from "../services/bookings";
import { getManagedCourseById } from "../services/course-management";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { createThemedStyleSheet, useThemedStyles, useAppTheme, theme } from "../components/theme";
import { getCourseImage } from "../lib/image-mapping";

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
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { scaleFont, scaleLineHeight } = useResponsiveLayout();
  const params = useLocalSearchParams<{
    id?: string | string[];
    players?: string | string[];
    date?: string | string[];
    day?: string | string[];
    dateKey?: string | string[];
    bookingId?: string | string[];
    time?: string | string[];
    period?: string | string[];
    subtotal?: string | string[];
    serviceFee?: string | string[];
    caddyFee?: string | string[];
    taxes?: string | string[];
    total?: string | string[];
  }>();

  interface PaymentMethod {
    id: string;
    type: "wallet" | "card";
    brand: string;
    last4: string;
    expiry?: string;
    cardholderName?: string;
  }

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("");

  const DEFAULT_METHODS: PaymentMethod[] = [
    {
      id: "default-wallet",
      type: "wallet",
      brand: Platform.OS === "ios" ? "Apple Pay" : "Google Pay",
      last4: "",
    },
    {
      id: "default-card",
      type: "card",
      brand: "Mastercard",
      last4: "8829",
      expiry: "08/25",
      cardholderName: "Alex Morgan",
    },
  ];

  // Load preferred payment method from App Settings
  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        const stored = await AsyncStorage.getItem("golftee:payment_methods");
        let parsed: PaymentMethod[] = [];
        if (stored) {
          parsed = JSON.parse(stored);
        } else {
          parsed = [...DEFAULT_METHODS];
        }
        setPaymentMethods(parsed);

        const defaultId = await AsyncStorage.getItem("golftee:settings:default_payment_id");
        if (defaultId && parsed.some((m) => m.id === defaultId)) {
          setSelectedPaymentId(defaultId);
        } else if (parsed.length > 0) {
          setSelectedPaymentId(parsed[0].id);
        }
      } catch (err) {
        console.warn("Failed to load payment methods", err);
      }
    };
    loadPaymentData();
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handlePaymentChange = (id: string) => {
    setSelectedPaymentId(id);
  };

  const courseId = getFirstParamValue(params.id);
  const playersParam = getFirstParamValue(params.players);
  const subtotalParam = getFirstParamValue(params.subtotal);
  const serviceFeeParam = getFirstParamValue(params.serviceFee);
  const caddyFeeParam = getFirstParamValue(params.caddyFee);
  const taxesParam = getFirstParamValue(params.taxes);
  const totalParam = getFirstParamValue(params.total);
  const dateParam = getFirstParamValue(params.date);
  const dateKeyParam = getFirstParamValue(params.dateKey);
  const bookingIdParam = getFirstParamValue(params.bookingId);
  const timeParam = getFirstParamValue(params.time);
  const periodParam = getFirstParamValue(params.period);
  const dayParam = getFirstParamValue(params.day);

  const course = getManagedCourseById(courseId);
  const players = parsePlayerCount(playersParam, 1);
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

  const handlePlaceBooking = async () => {
    if (isSubmitting || !dateKeyParam || !timeParam || !periodParam) {
      return;
    }

    const chosenMethod = paymentMethods.find((m) => m.id === selectedPaymentId);
    if (!chosenMethod) {
      setNotice("Please add and select a payment method.");
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const bookingInput = {
        courseId: course.id,
        paymentMethod: chosenMethod.type,
        players,
        teeDate: dateKeyParam,
        teeTime: timeParam,
        timePeriod: periodParam as "MORNING" | "AFTERNOON",
      };

      const savedBooking = bookingIdParam
        ? await updateBooking(bookingIdParam, bookingInput)
        : await createBooking(bookingInput);

      router.replace({
        pathname: "/manage-booking",
        params: {
          bookingId: savedBooking.id,
        },
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to place your booking right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
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
          <AppImage source={getCourseImage(course.image)} style={styles.courseHeroImage} />
          <View style={styles.courseHeroOverlay} />
          <View style={styles.courseHeroContent}>
            <Text style={styles.courseName}>{course.title}</Text>
            <View style={styles.heroLocationRow}>
              <Ionicons name="location" size={14} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.heroLocation}>{course.location}</Text>
            </View>
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
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <Pressable onPress={() => router.navigate("/payment-methods")} variant="chip">
                <Text style={styles.manageMethodsLink}>Manage</Text>
              </Pressable>
            </View>

            {paymentMethods.length === 0 ? (
              <Pressable
                style={styles.paymentCard}
                onPress={() => router.navigate("/payment-methods")}
                variant="card"
              >
                <View style={styles.paymentLeft}>
                  <View style={styles.paymentIconWrap}>
                    <Ionicons name="add" size={22} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.paymentName}>Add Payment Method</Text>
                    <Text style={styles.paymentSub}>No saved payment options found</Text>
                  </View>
                </View>
              </Pressable>
            ) : (
              paymentMethods.map((method) => {
                const isSelected = method.id === selectedPaymentId;
                const isWallet = method.type === "wallet";

                return (
                  <Pressable
                    key={method.id}
                    style={[styles.paymentCard, isSelected && styles.paymentCardActive]}
                    onPress={() => handlePaymentChange(method.id)}
                    variant="card"
                  >
                    <View style={styles.paymentLeft}>
                      <View
                        style={[
                          styles.paymentIconWrap,
                          isWallet && method.brand === "Apple Pay" && styles.appleIcon,
                          isWallet && method.brand === "Google Pay" && styles.walletIconWrap,
                        ]}
                      >
                        {isWallet ? (
                          <Ionicons
                            name={method.brand === "Apple Pay" ? "logo-apple" : "logo-google"}
                            size={20}
                            color={method.brand === "Apple Pay" ? "#FFFFFF" : colors.primary}
                          />
                        ) : (
                          <Ionicons name="card" size={22} color={colors.primary} />
                        )}
                      </View>
                      <View>
                        <Text style={styles.paymentName}>
                          {isWallet ? method.brand : `•••• ${method.last4}`}
                        </Text>
                        <Text style={styles.paymentSub}>
                          {isWallet ? "Digital Wallet Checkout" : `${method.brand} - Exp. ${method.expiry}`}
                        </Text>
                      </View>
                    </View>
                    <View style={isSelected ? styles.radioOuterActive : styles.radioOuter}>
                      {isSelected && <View style={styles.radioInnerActive} />}
                    </View>
                  </Pressable>
                );
              })
            )}
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
        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
        </View>
      </ScrollView>

      <View style={[styles.footerCtaWrap, { paddingHorizontal: horizontalPadding, paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.footerCtaInner, { maxWidth: contentMaxWidth }]}>
          <Pressable style={[styles.placeButton]} onPress={() => void handlePlaceBooking()} disabled={isSubmitting} variant="cta">
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <>
                <Text style={styles.placeButtonText}>{bookingIdParam ? "Save Booking Changes" : "Place Booking"}</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.surface} />
              </>
            )}
          </Pressable>
          <Text style={styles.footerPolicy}>
            BY CLICKING PLACE BOOKING, YOU AGREE TO THE CLUB&apos;S CANCELLATION POLICY.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const themedStyles = createThemedStyleSheet((colors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textSoft,
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    letterSpacing: 2,
    fontWeight: "700",
  },
  headline: {
    color: colors.primary,
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    fontWeight: "800",
  },
  headlineCompact: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
  },
  courseHero: {
    height: 214,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  courseHeroImage: {
    width: "100%",
    height: "100%",
  },
  courseHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayStrong,
  },
  courseHeroContent: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
  },
  heroKicker: {
    color: "#D8AB5C",
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    letterSpacing: 1.2,
    fontWeight: "800",
    marginBottom: 6,
  },
  courseName: {
    color: "#FFFFFF",
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroLocation: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "500",
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailTitle: {
    color: colors.primary,
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
    borderBottomColor: colors.border,
  },
  detailRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 4,
  },
  detailLabel: {
    color: colors.textSoft,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
  detailValue: {
    color: colors.primary,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    fontWeight: "700",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "800",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  manageMethodsLink: {
    fontSize: theme.typography.bodySm.fontSize,
    fontWeight: "800",
    color: colors.accent,
  },
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  paymentCardActive: {
    borderColor: colors.primary,
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
    backgroundColor: colors.surfaceTint,
  },
  appleIcon: {
    backgroundColor: colors.inverse,
  },
  appleText: {
    color: colors.surface,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "800",
  },
  walletIconWrap: {
    backgroundColor: colors.primarySoft,
  },
  walletIconText: {
    color: colors.primary,
  },
  paymentName: {
    color: colors.primary,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "700",
  },
  paymentSub: {
    color: colors.textSoft,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  radioOuterActive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInnerActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  priceCard: {
    backgroundColor: colors.surfaceTint,
    borderRadius: 16,
    padding: 16,
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceTitle: {
    color: colors.primary,
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
    color: colors.textSoft,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
  },
  priceValue: {
    color: colors.primary,
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    fontWeight: "800",
  },
  priceBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    marginBottom: 14,
  },
  totalRow: {
    marginBottom: 0,
  },
  totalLabel: {
    color: colors.primary,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "800",
  },
  totalAmount: {
    color: colors.primary,
    fontSize: theme.typography.h1.fontSize,
    lineHeight: theme.typography.h1.lineHeight,
    fontWeight: "900",
  },
  noticeText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
    fontWeight: "600",
  },
  footerCtaWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.glass,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  placeButtonText: {
    color: colors.surface,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "800",
  },
  footerPolicy: {
    marginTop: 10,
    textAlign: "center",
    color: colors.textSoft,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight + 2,
    fontWeight: "600",
    letterSpacing: 0.6,
  },
}));
