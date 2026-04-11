import { Ionicons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { AnimatedPressable as Pressable } from "./animated-pressable";
import { AppImage } from "./app-image";
import { theme } from "./theme";

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
  compactActionIconColor = theme.colors.primary,
}: CourseCardProps) {
  const isSmallCompact = variant === "compact" && size === "small";
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
          <View style={styles.featuredImageWrap}>
            <AppImage source={{ uri: image }} style={styles.image} />
            <View style={styles.imageOverlay} />
            <View style={styles.featuredChipRow}>
              <View style={styles.featuredStyleChip}>
                <Text style={styles.featuredStyleText}>{styleLabel}</Text>
              </View>
              <View style={styles.featuredRatingChip}>
                <Ionicons name="star" size={11} color={theme.colors.accentWarm} />
                <Text style={styles.featuredRatingText}>{rating}</Text>
              </View>
            </View>
          </View>

          <View style={styles.featuredBody}>
            <Text style={styles.featuredTitle} numberOfLines={2}>
              {title}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={theme.colors.textSoft} />
              <Text style={styles.locationText} numberOfLines={1}>
                {location}
              </Text>
            </View>

            <View style={styles.featuredFooter}>
              <View>
                <Text style={styles.priceLabel}>STARTING AT</Text>
                <Text style={styles.priceText}>{price}</Text>
              </View>

              <View style={styles.featuredAction}>
                <Text style={styles.featuredActionText}>View Details</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
              </View>
            </View>
          </View>
        </>
      ) : (
        <>
          <AppImage source={{ uri: image }} style={[styles.compactImage, isSmallCompact && styles.compactImageSmall]} />
          <View style={[styles.compactBody, isSmallCompact && styles.compactBodySmall]}>
            <View style={styles.compactHeaderRow}>
              <View style={styles.compactTextBlock}>
                <Text style={[styles.compactTitle, isSmallCompact && styles.compactTitleSmall]} numberOfLines={2}>
                  {title}
                </Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={isSmallCompact ? 12 : 13} color={theme.colors.textSoft} />
                  <Text style={[styles.locationText, isSmallCompact && styles.locationTextSmall]} numberOfLines={1}>
                    {location}
                  </Text>
                </View>
              </View>

              <View style={[styles.compactRatingChip, isSmallCompact && styles.compactRatingChipSmall]}>
                <Ionicons name="star" size={isSmallCompact ? 9 : 10} color={theme.colors.accentWarm} />
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
                >
                  <Text style={styles.compactActionText} numberOfLines={1}>
                    {compactActionLabel}
                  </Text>
                  <Ionicons name={compactActionIcon} size={14} color={compactActionIconColor} />
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
      <Pressable style={baseCardStyles} onPress={onPress} variant="card">
        {cardContent}
      </Pressable>
    );
  }

  return <View style={baseCardStyles}>{cardContent}</View>;
}

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  featuredCard: {
    width: 292,
  },
  compactCard: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 132,
  },
  compactCardSmall: {
    minHeight: 120,
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
    backgroundColor: theme.colors.overlaySoft,
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
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredStyleText: {
    color: theme.colors.surface,
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  featuredRatingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featuredRatingText: {
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    fontWeight: "700",
    color: theme.colors.text,
  },
  featuredBody: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  featuredTitle: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    fontWeight: "800",
    color: theme.colors.text,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    flex: 1,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
  },
  featuredFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 4,
  },
  priceLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: theme.colors.muted,
    marginBottom: 2,
  },
  priceText: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    fontWeight: "800",
    color: theme.colors.accentWarm,
  },
  featuredAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  featuredActionText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
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
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.text,
    fontWeight: "800",
  },
  compactTitleSmall: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
  compactRatingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  compactRatingChipSmall: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  compactRatingText: {
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    fontWeight: "700",
    color: theme.colors.text,
  },
  compactRatingTextSmall: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
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
    backgroundColor: theme.colors.accentSoft,
  },
  toneChipGreen: {
    backgroundColor: theme.colors.success,
  },
  toneChipText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  toneChipTextSmall: {
    letterSpacing: 0.5,
  },
  toneChipTextGold: {
    color: theme.colors.accentWarm,
  },
  toneChipTextGreen: {
    color: theme.colors.successText,
  },
  compactPriceGroup: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  compactPriceText: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "800",
    color: theme.colors.accentWarm,
  },
  compactPriceTextSmall: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
  compactActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    minHeight: 36,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: "stretch",
  },
  compactActionButtonSmall: {
    minHeight: 34,
  },
  compactActionText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
    flexShrink: 1,
  },
  locationTextSmall: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
  },
});
