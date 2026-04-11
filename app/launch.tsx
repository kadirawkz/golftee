import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getIsLoggedIn } from "../components/auth";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";

export default function LaunchScreen() {
  const router = useRouter();
  const { scaleFont, scaleLineHeight } = useResponsiveLayout();

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const redirectFromLaunch = async () => {
      const isLoggedIn = await getIsLoggedIn();

      if (!active) {
        return;
      }

      timeout = setTimeout(() => {
        if (!active) {
          return;
        }

        router.replace(isLoggedIn ? "/home" : "/splash");
      }, 900);
    };

    void redirectFromLaunch();

    return () => {
      active = false;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [router]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    color: theme.colors.textOnPrimary,
    fontSize: theme.typography.displayL.fontSize,
    lineHeight: theme.typography.displayL.lineHeight,
    fontWeight: "900",
    letterSpacing: -1,
  },
});
