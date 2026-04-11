import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "./animated-pressable";
import { theme } from "./theme";

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
  backgroundColor = theme.colors.page,
}: AppHeaderProps) {
  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor }]}>
      <View style={[styles.topBar, { backgroundColor }]}> 
        <View style={styles.sideSlot}>
          {showLeftButton ? (
            <Pressable
              style={[styles.iconButton, styles.leftIconButton]}
              onPress={onPressLeft}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              variant="icon"
            >
              <Ionicons name={leftIcon} size={24} color={theme.colors.primary} />
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
              <Ionicons name={rightIcon} size={24} color={theme.colors.primary} />
            </Pressable>
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.page,
  },
  topBar: {
    height: 52,
    paddingHorizontal: 16,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: theme.colors.page,
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
    borderRadius: theme.radius.pill,
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
    fontSize: theme.typography.h4.fontSize,
    lineHeight: theme.typography.h4.lineHeight,
    fontWeight: "800",
    color: theme.colors.primary,
    letterSpacing: 0.1,
    transform: [{ translateY: -1 }],
  },
  topTitleLarge: {
    fontSize: theme.typography.h2.fontSize + 2,
    lineHeight: theme.typography.h2.lineHeight + 2,
    letterSpacing: -0.2,
    fontWeight: "900",
  },
});
