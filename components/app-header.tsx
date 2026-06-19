import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "./animated-pressable";
import { createThemedStyleSheet, useThemedStyles, useAppTheme } from "./theme";

type AppHeaderProps = {
  title?: string;
  titleSize?: "regular" | "large";
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onPressLeft?: () => void;
  onPressRight?: () => void;
  showLeftButton?: boolean;
  showRightButton?: boolean;
  backgroundColor?: string;
};

export function AppHeader({
  title = "GolfTee",
  titleSize = "regular",
  leftIcon = "arrow-back",
  rightIcon = "notifications",
  onPressLeft,
  onPressRight,
  showLeftButton = true,
  showRightButton = true,
  backgroundColor,
}: AppHeaderProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const resolvedBg = backgroundColor ?? colors.page;

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: resolvedBg }]}>
      <View style={[styles.topBar, { backgroundColor: resolvedBg }]}>
        <View style={styles.sideSlot}>
          {showLeftButton ? (
            <Pressable
              style={[styles.iconButton, styles.leftIconButton]}
              onPress={onPressLeft}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              variant="icon"
            >
              <Ionicons name={leftIcon} size={24} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
        </View>

        <View style={styles.titleWrap} pointerEvents="none">
          <Text style={[styles.topTitle, titleSize === "large" && styles.topTitleLarge]}>{title}</Text>
        </View>

        <View style={styles.sideSlot}>
          {showRightButton ? (
            <Pressable
              style={[styles.iconButton, styles.rightIconButton]}
              onPress={onPressRight}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              variant="icon"
            >
              <Ionicons name={rightIcon} size={24} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const themedStyles = createThemedStyleSheet((colors) => ({
  safeArea: {
    backgroundColor: colors.page,
  },
  topBar: {
    height: 52,
    paddingHorizontal: 16,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: colors.page,
  },
  sideSlot: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  leftIconButton: {
    top: 6,
  },
  rightIconButton: {
    top: 6,
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    textAlign: "center",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.1,
    transform: [{ translateY: -1 }],
  },
  topTitleLarge: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.2,
    fontWeight: "900",
  },
}));
