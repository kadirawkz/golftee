import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { getIsLoggedIn } from "../services/auth";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { useAppTheme, useThemedStyles, createThemedStyleSheet, theme } from "../components/theme";

export default function LaunchScreen() {
  const router = useRouter();
  const { scaleFont, scaleLineHeight } = useResponsiveLayout();
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useThemedStyles(themedStyles);

  useEffect(() => {
    let active = true;

    const redirectFromLaunch = async () => {
      const isLoggedIn = await getIsLoggedIn();

      if (!active) {
        return;
      }

      router.replace(isLoggedIn ? "/home" : "/splash");
    };

    void redirectFromLaunch();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <View style={styles.screen} accessibilityLabel="GolfTee app is loading" accessibilityRole="header">
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <View style={styles.logoContainer}>
        <View style={styles.logoShell} accessibilityRole="image" accessibilityLabel="GolfTee logo">
          <Image source={require("../assets/images/android-icon-foreground.png")} style={styles.logoImage} />
        </View>
        <Text
          style={[
            styles.logo,
            {
              fontSize: scaleFont(styles.logo.fontSize),
              lineHeight: scaleLineHeight(styles.logo.lineHeight),
            },
          ]}
        >
          GolfTee
        </Text>
        <ActivityIndicator
          size="small"
          color={colors.text}
          style={styles.loadingIndicator}
          accessibilityLabel="Loading session authentication status"
        />
      </View>
    </View>
  );
}

const themedStyles = createThemedStyleSheet((colors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.page,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    gap: 12,
  },
  logoShell: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  logoImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  logo: {
    color: colors.text,
    fontSize: theme.typography.displayM.fontSize,
    lineHeight: theme.typography.displayM.lineHeight,
    fontWeight: theme.typography.displayM.fontWeight,
    letterSpacing: theme.typography.displayM.letterSpacing,
  },
  loadingIndicator: {
    marginTop: 20,
  },
}));

