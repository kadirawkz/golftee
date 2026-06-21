import { Ionicons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { AnimatedPressable as Pressable } from "./animated-pressable";
import { AppImage } from "./app-image";
import { getCourseImage } from "../lib/image-mapping";
import { createThemedStyleSheet, useThemedStyles, useAppTheme } from "./theme";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

type CourseCardProps = {
  title: string;
  location: string;
  image: string;
  price: string;
  rating: string;
  styleLabel: string;
  tone?: "gold" | "green";
  variant?: "featured" | "compact";
  size?: "regular" | "small";
  cardStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  compactActionLabel?: string;
  onPressCompactAction?: () => void;
  compactActionIcon?: keyof typeof Ionicons.glyphMap;
  compactActionIconColor?: string;
};

export function CourseCard({
  title,
  location,
  image,
  price,
  rating,
  styleLabel,
  tone = "gold",
  variant = "compact",
  size = "regular",
  cardStyle,
  onPress,
  compactActionLabel,
  onPressCompactAction,
  compactActionIcon = "arrow-forward",
  compactActionIconColor,
}: CourseCardProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const isSmallCompact = variant === "compact" && size === "small";
  const { isTabletLike } = useResponsiveLayout();

  const resolvedActionIconColor = compactActionIconColor ?? colors.text;

  const baseCardStyles = [
    styles.cardBase,
    variant === "featured" ? styles.featuredCard : styles.compactCard,
    isSmallCompact && styles.compactCardSmall,
    cardStyle,
  ];

  const cardContent = (
    <>
      {variant === "featured" ? (
        <>
          <View style={[styles.featuredImageWrap, isTabletLike && { height: 240 }]}>
            <AppImage source={getCourseImage(image)} style={styles.image} />
            <View style={styles.imageOverlay} />
            <View style={styles.featuredChipRow}>
              <View style={styles.featuredStyleChip}>
                <Text style={styles.featuredStyleText}>{styleLabel}</Text>
              </View>
              <View style={styles.featuredRatingChip}>
                <Ionicons name="star" size={11} color={colors.accentWarm} />
                <Text style={styles.featuredRatingText}>{rating}</Text>
              </View>
            </View>
          </View>

          <View style={styles.featuredBody}>
            <Text style={styles.featuredTitle} numberOfLines={2}>
              {title}
            </Text>
            <View style={styles.featuredFooter}>
              <View style={[styles.locationRow, { flex: 1, marginRight: 16 }]}>
                <Ionicons name="location-outline" size={14} color={colors.textSoft} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {location}
                </Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.priceLabel}>STARTING AT</Text>
                <Text style={styles.priceText}>{price}</Text>
              </View>
            </View>
          </View>
        </>
      ) : (
        <>
          <AppImage source={getCourseImage(image)} style={[styles.compactImage, isSmallCompact && styles.compactImageSmall]} />
          <View style={[styles.compactBody, isSmallCompact && styles.compactBodySmall]}>
            <View style={styles.compactHeaderRow}>
              <View style={styles.compactTextBlock}>
                <Text style={[styles.compactTitle, isSmallCompact && styles.compactTitleSmall]} numberOfLines={2}>
                  {title}
                </Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={isSmallCompact ? 12 : 13} color={colors.textSoft} />
                  <Text style={[styles.locationText, isSmallCompact && styles.locationTextSmall]} numberOfLines={1}>
                    {location}
                  </Text>
                </View>
              </View>

              <View style={[styles.compactRatingChip, isSmallCompact && styles.compactRatingChipSmall]}>
                <Ionicons name="star" size={isSmallCompact ? 9 : 10} color={colors.accentWarm} />
                <Text style={[styles.compactRatingText, isSmallCompact && styles.compactRatingTextSmall]}>{rating}</Text>
              </View>
            </View>

            <View style={[styles.compactFooter, isSmallCompact && styles.compactFooterSmall]}>
              <View style={styles.compactMetaRow}>
                <View
                  style={[
                    styles.toneChip,
                    isSmallCompact && styles.toneChipSmall,
                    tone === "green" ? styles.toneChipGreen : styles.toneChipGold,
                  ]}
                >
                  <Text
                    style={[
                      styles.toneChipText,
                      isSmallCompact && styles.toneChipTextSmall,
                      tone === "green" ? styles.toneChipTextGreen : styles.toneChipTextGold,
                    ]}
                    numberOfLines={1}
                  >
                    {styleLabel}
                  </Text>
                </View>

                <View style={styles.compactPriceGroup}>
                  <Text style={styles.priceLabel}>PRICE</Text>
                  <Text style={[styles.compactPriceText, isSmallCompact && styles.compactPriceTextSmall]}>{price}</Text>
                </View>
              </View>

              {compactActionLabel && onPressCompactAction ? (
                <Pressable
                  style={[styles.compactActionButton, isSmallCompact && styles.compactActionButtonSmall]}
                  onPress={onPressCompactAction}
                  variant="chip"
                  accessibilityRole="button"
                  accessibilityLabel={compactActionLabel}
                  accessibilityHint={`Triggers action for ${title}`}
                >
                  <Text style={styles.compactActionText} numberOfLines={1}>
                    {compactActionLabel}
                  </Text>
                  <Ionicons name={compactActionIcon} size={14} color={resolvedActionIconColor} />
                </Pressable>
              ) : null}
            </View>
          </View>
        </>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={baseCardStyles}
        onPress={onPress}
        variant="card"
        accessibilityRole="button"
        accessibilityLabel={`${title}, located in ${location}. Rating: ${rating} stars. Price: starting at ${price}`}
        accessibilityHint="Double tap to open course details page"
      >
        {cardContent}
      </Pressable>
    );
  }

  return <View style={baseCardStyles}>{cardContent}</View>;
}

const themedStyles = createThemedStyleSheet((colors) => ({
  cardBase: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  featuredCard: {
    width: 316,
  },
  compactCard: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 132,
  },
  compactCardSmall: {
    minHeight: 132,
  },
  featuredImageWrap: {
    height: 170,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlaySoft,
  },
  featuredChipRow: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featuredStyleChip: {
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredStyleText: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  featuredRatingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featuredRatingText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: colors.text,
  },
  featuredBody: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  featuredTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    color: colors.text,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSoft,
  },
  featuredFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.muted,
    marginBottom: 2,
  },
  priceText: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    color: colors.accentWarm,
  },
  featuredAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactImage: {
    width: 108,
    alignSelf: "stretch",
  },
  compactImageSmall: {
    width: 94,
  },
  compactBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "space-between",
    gap: 12,
  },
  compactBodySmall: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },
  compactHeaderRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  compactTextBlock: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  compactTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    fontWeight: "800",
  },
  compactTitleSmall: {
    fontSize: 14,
    lineHeight: 21,
  },
  compactRatingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  compactRatingChipSmall: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  compactRatingText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: colors.text,
  },
  compactRatingTextSmall: {
    fontSize: 10,
    lineHeight: 13,
  },
  compactFooter: {
    gap: 8,
  },
  compactFooterSmall: {
    gap: 8,
  },
  compactMetaRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  toneChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    maxWidth: "58%",
  },
  toneChipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  toneChipGold: {
    backgroundColor: colors.surfaceSoft,
  },
  toneChipGreen: {
    backgroundColor: colors.surfaceSoft,
  },
  toneChipText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  toneChipTextSmall: {
    letterSpacing: 0.5,
  },
  toneChipTextGold: {
    color: colors.accentWarm,
  },
  toneChipTextGreen: {
    color: colors.successText,
  },
  compactPriceGroup: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  compactPriceText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "800",
    color: colors.accentWarm,
  },
  compactPriceTextSmall: {
    fontSize: 14,
    lineHeight: 21,
  },
  compactActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    minHeight: 36,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: "stretch",
  },
  compactActionButtonSmall: {
    minHeight: 34,
  },
  compactActionText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.text,
    fontWeight: "700",
    flexShrink: 1,
  },
  locationTextSmall: {
    fontSize: 10,
    lineHeight: 13,
  },
}));
