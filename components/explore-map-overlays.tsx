import { Ionicons } from "@expo/vector-icons";
import { Animated, Text, View } from "react-native";
import { AnimatedPressable as Pressable } from "./animated-pressable";
import { createThemedStyleSheet, useThemedStyles, useAppTheme, theme } from "./theme";
import { openInGoogleMaps } from "../utils/map-links";

export type ExploreMapCourse = {
  id: string;
  title: string;
  price: string;
  rating: string;
  location: string;
  placeQuery: string;
  placeId?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distanceKm: number;
};

type LocationNoticeKind = "none" | "permissionDenied" | "permissionBlocked" | "servicesDisabled" | "error";

export type ExploreMapOverlayNotice = {
  kind: LocationNoticeKind;
  title: string;
  body: string;
};

type Props = {
  activeLocationNotice: ExploreMapOverlayNotice | null;
  locationNoticeAnim: Animated.Value;
  onLocationNoticePrimaryAction: () => void;
  onDismissLocationNotice: () => void;
  activeCardCourse: ExploreMapCourse | null;
  cardAnim: Animated.Value;
  onCloseSelectedCourse: () => void;
  onOpenCourseDetails: (courseId: string) => void;
  onBookNow: (courseId: string) => void;
  onCenterSelectedCourse: () => void;
};

export function ExploreMapOverlays({
  activeLocationNotice,
  locationNoticeAnim,
  onLocationNoticePrimaryAction,
  onDismissLocationNotice,
  activeCardCourse,
  cardAnim,
  onCloseSelectedCourse,
  onOpenCourseDetails,
  onBookNow,
  onCenterSelectedCourse,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(themedStyles);

  return (
    <>
      {activeLocationNotice ? (
        <Animated.View
          style={[
            styles.locationNoticeCard,
            {
              opacity: locationNoticeAnim,
              transform: [{
                translateY: locationNoticeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                }),
              }],
              pointerEvents: activeLocationNotice.kind !== "none" ? "auto" : "none",
              position: "relative",
            },
          ]}
        >
          <View style={[styles.locationNoticeHeader, { paddingRight: 24 }]}>
            <View style={styles.locationNoticeIconWrap}>
              <Ionicons
                name={activeLocationNotice.kind === "permissionBlocked" ? "settings-outline" : "locate-outline"}
                size={16}
                color={colors.primary}
              />
            </View>
            <View style={styles.locationNoticeCopy}>
              <Text style={styles.locationNoticeTitle}>{activeLocationNotice.title}</Text>
              <Text style={styles.locationNoticeBody}>{activeLocationNotice.body}</Text>
            </View>
          </View>
          <Pressable style={styles.locationNoticeAction} onPress={onLocationNoticePrimaryAction} variant="chip">
            <Text style={styles.locationNoticeActionText}>
              {activeLocationNotice.kind === "permissionBlocked" ? "Open Settings" : "Retry"}
            </Text>
          </Pressable>
          <Pressable
            style={styles.closeCardButton}
            onPress={onDismissLocationNotice}
            variant="icon"
          >
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>
        </Animated.View>
      ) : null}

      {activeCardCourse ? (
        <Animated.View
          style={[
            styles.floatingCourseCard,
            {
              opacity: cardAnim,
              transform: [{
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                }),
              }],
              pointerEvents: "auto",
            },
          ]}
        >
          <Pressable
            style={styles.mapCardInner}
            onPress={onCenterSelectedCourse}
            variant="card"
          >
            <View style={styles.mapCardHeaderRow}>
              <View style={styles.mapCardInfo}>
                <Text style={styles.selectedCourseLabel}>SELECTED COURSE</Text>
                <Text style={styles.selectedCourseTitle} numberOfLines={1}>{activeCardCourse.title}</Text>
                <View style={styles.mapCardMetaRow}>
                  <View style={styles.mapCardMetaItem}>
                    <Ionicons name="location" size={12} color={colors.textSoft} />
                    <Text style={styles.mapCardMetaText} numberOfLines={1}>
                      {activeCardCourse.location} ({activeCardCourse.distanceKm.toFixed(0)} km)
                    </Text>
                  </View>
                  <View style={styles.mapCardMetaDivider} />
                  <View style={styles.mapCardMetaItem}>
                    <Ionicons name="star" size={12} color={colors.accentWarm} />
                    <Text style={styles.mapCardMetaText}>{activeCardCourse.rating}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.mapCardPriceBlock}>
                <Text style={styles.mapCardPriceLabel}>STARTING AT</Text>
                <Text style={styles.mapCardPriceVal}>{activeCardCourse.price}</Text>
              </View>
            </View>

            <Pressable
              style={styles.mapCardCloseBtn}
              onPress={onCloseSelectedCourse}
              variant="icon"
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>

            <View style={styles.mapCardActions}>
              <Pressable
                style={[styles.mapCardBtn, styles.mapCardBtnSecondary]}
                onPress={() => openInGoogleMaps({
                  coordinates: activeCardCourse.coordinates,
                  placeQuery: activeCardCourse.placeQuery,
                  placeId: activeCardCourse.placeId,
                })}
                variant="chip"
              >
                <Ionicons name="navigate-outline" size={14} color={colors.primary} />
                <Text style={styles.mapCardBtnSecondaryText}>Open in Google Maps</Text>
              </Pressable>

              <Pressable
                style={[styles.mapCardBtn, styles.mapCardBtnSecondaryAlt]}
                onPress={() => onOpenCourseDetails(activeCardCourse.id)}
                variant="chip"
              >
                <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
                <Text style={styles.mapCardBtnSecondaryText}>Details</Text>
              </Pressable>

              <Pressable
                style={[styles.mapCardBtn, styles.mapCardBtnPrimary]}
                onPress={() => onBookNow(activeCardCourse.id)}
                variant="cta"
              >
                <Ionicons name="calendar-outline" size={14} color={colors.surface} />
                <Text style={styles.mapCardBtnPrimaryText}>Book Now</Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
    </>
  );
}

const themedStyles = createThemedStyleSheet((colors) => ({
  locationNoticeCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 14,
    gap: 12,
  },
  locationNoticeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  locationNoticeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  locationNoticeCopy: {
    flex: 1,
  },
  locationNoticeTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: colors.primary,
    fontWeight: "700",
    marginBottom: 2,
  },
  locationNoticeBody: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.textSoft,
  },
  locationNoticeAction: {
    alignSelf: "center",
    width: 100,
    minHeight: 34,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  locationNoticeActionText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: colors.primary,
    fontWeight: "700",
  },
  closeCardButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingCourseCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    position: "relative",
  },
  mapCardInner: {
    position: "relative",
    gap: 12,
    paddingTop: 8,
  },
  mapCardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingRight: 46,
  },
  mapCardInfo: {
    flex: 1,
    paddingRight: 24,
    gap: 2,
  },
  selectedCourseLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: colors.accentWarm,
    letterSpacing: 1.1,
    fontWeight: "700",
    marginBottom: 4,
  },
  selectedCourseTitle: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: colors.primary,
    fontWeight: "800",
    marginBottom: 3,
  },
  mapCardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  mapCardMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mapCardMetaText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: colors.textSoft,
  },
  mapCardMetaDivider: {
    width: 1,
    height: 10,
    backgroundColor: colors.border,
  },
  mapCardCloseBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  mapCardPriceBlock: {
    justifyContent: "center",
    marginTop: 10,
    marginLeft: 0,
  },
  mapCardPriceLabel: {
    fontSize: 9,
    lineHeight: 12,
    color: colors.muted,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  mapCardPriceVal: {
    fontSize: 18,
    lineHeight: 24,
    color: colors.accentWarm,
    fontWeight: "800",
  },
  mapCardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
    width: "100%",
    marginLeft: -3,
  },
  mapCardBtn: {
    height: 36,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    minWidth: 0,
  },
  mapCardBtnPrimary: {
    backgroundColor: colors.primary,
  },
  mapCardBtnPrimaryText: {
    fontSize: 11,
    color: colors.surface,
    fontWeight: "700",
  },
  mapCardBtnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  mapCardBtnSecondaryAlt: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  mapCardBtnSecondaryText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "700",
  },
}));
