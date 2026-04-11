import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";

const BACKGROUND_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD_5BKCG8Zh7AAgflRKh9OreYX0em7HY62MIYhAGGTTIV8uyTkkcljbFHcMS5olpcil4zJIsJswq12eK62vnzH-N0iH3K2Y2OeDiQGMn8M73lT-5X5uuCAk4sXAwPlKEiNSjvtRY2w6RBZw5h-wjaTFO-va556Z5PnrkrMcxo3QRySUyL44BeOHTHtTPdAG3iE_Amz5rl9yjAblI-M3oBniJaKNXBcxDa3UQLLkzQh1RvvFH5Vf3GVf0v-9lvOqTncFis60R9HOeC0";

export default function Index() {
  const router = useRouter();
  const { scaleFont, scaleLineHeight } = useResponsiveLayout();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.background}>
        <AppImage source={{ uri: BACKGROUND_IMAGE }} style={styles.backgroundImage} />
        <View style={styles.dimLayer} />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.topSpacer} />

          <View style={styles.brandBlock}>
            <View style={styles.logoShell}>
              <View style={styles.logoCircle}>
                <View style={styles.ballGroup}>
                  <View style={styles.ballDotLarge} />
                  <View style={styles.ballDotSmall} />
                  <View style={styles.ballDotSmall} />
                </View>
              </View>
              <View style={styles.teeStem} />
              <View style={styles.teeBase} />
            </View>

            <Text
              style={[
                styles.title,
                {
                  fontSize: scaleFont(styles.title.fontSize),
                  lineHeight: scaleLineHeight(styles.title.lineHeight),
                },
              ]}
            >
              GolfTee
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  fontSize: scaleFont(styles.subtitle.fontSize),
                  lineHeight: scaleLineHeight(styles.subtitle.lineHeight),
                },
              ]}
            >
              The Curated Landscape
            </Text>
          </View>

          <View style={styles.bottomArea}>
            <Pressable
              style={[styles.ctaButton]}
              hitSlop={8}
              onPress={() => router.push("/login")}
              variant="cta"
            >
              <Text
                style={[
                  styles.ctaText,
                  {
                    fontSize: scaleFont(styles.ctaText.fontSize),
                    lineHeight: scaleLineHeight(styles.ctaText.lineHeight),
                  },
                ]}
              >
                Get Started
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  background: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  dimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlayStrong,
  },
  safeArea: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 22,
  },
  topSpacer: {
    height: 18,
  },
  brandBlock: {
    alignItems: "center",
    gap: 14,
    marginTop: 140,
  },
  logoShell: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  logoCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  ballGroup: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  ballDotLarge: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.primary,
  },
  ballDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  teeStem: {
    marginTop: 6,
    width: 28,
    height: 10,
    borderTopWidth: 4,
    borderTopColor: theme.colors.surface,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  teeBase: {
    width: 8,
    height: 10,
    marginTop: -1,
    borderRadius: 4,
    backgroundColor: theme.colors.surface,
  },
  title: {
    marginTop: 12,
    fontSize: theme.typography.displayXL.fontSize,
    lineHeight: theme.typography.displayXL.lineHeight,
    fontWeight: "800",
    color: theme.colors.textOnPrimary,
    letterSpacing: -1.7,
    textShadowColor: theme.colors.overlay,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "500",
    color: theme.colors.textOnPrimarySoft,
    letterSpacing: 0.2,
  },
  bottomArea: {
    marginBottom: 8,
    gap: 18,
  },
  ctaButton: {
    height: 62,
    width: "68%",
    maxWidth: 300,
    alignSelf: "center",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  ctaText: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "700",
    color: theme.colors.primary,
    letterSpacing: 0.2,
  },
});
