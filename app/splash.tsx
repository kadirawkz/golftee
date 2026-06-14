import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { useAuthSession } from "../components/auth";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";
import { supabase } from "../lib/supabase";

const BACKGROUND_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD_5BKCG8Zh7AAgflRKh9OreYX0em7HY62MIYhAGGTTIV8uyTkkcljbFHcMS5olpcil4zJIsJswq12eK62vnzH-N0iH3K2Y2OeDiQGMn8M73lT-5X5uuCAk4sXAwPlKEiNSjvtRY2w6RBZw5h-wjaTFO-va556Z5PnrkrMcxo3QRySUyL44BeOHTHtTPdAG3iE_Amz5rl9yjAblI-M3oBniJaKNXBcxDa3UQLLkzQh1RvvFH5Vf3GVf0v-9lvOqTncFis60R9HOeC0";

const HIGHLIGHTS = [
  { title: "Book Premier Tee Times", desc: "Reserve slots instantly at world-class private golf courses." },
  { title: "Real-Time Weather & Maps", desc: "Live forecast checking and integrated coordinate GPS navigation." },
  { title: "Golfer Dashboard & Stats", desc: "Track handicap updates, GIR %, and longest drives on the go." }
];

export default function Index() {
  const router = useRouter();
  const auth = useAuthSession();
  const { scaleFont, scaleLineHeight } = useResponsiveLayout();

  // Database Connection Status
  const [dbStatus, setDbStatus] = useState<"checking" | "online" | "offline">("checking");

  // Automated Highlights Carousel State
  const [slideIndex, setSlideIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from("golf_courses").select("id").limit(1);
        if (error) throw error;
        setDbStatus("online");
      } catch (err) {
        console.warn("Supabase connection check failed", err);
        setDbStatus("offline");
      }
    };
    checkConnection();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.delay(100),
      ]).start(() => {
        setSlideIndex((prev) => (prev + 1) % HIGHLIGHTS.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [fadeAnim]);

  const memberName =
    auth.profile?.full_name ||
    auth.profile?.username ||
    auth.session?.user.email?.split("@")[0] ||
    "Player";

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.background}>
        <AppImage source={{ uri: BACKGROUND_IMAGE }} style={styles.backgroundImage} />
        <View style={styles.dimLayer} />

        <SafeAreaView style={styles.safeArea}>
          {/* Top Bar with DB Connectivity Status */}
          <View style={styles.topBar}>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  dbStatus === "online" && styles.dotOnline,
                  dbStatus === "offline" && styles.dotOffline,
                ]}
              />
              <Text style={styles.statusText}>
                {dbStatus === "checking" && "Checking services..."}
                {dbStatus === "online" && "Services Online"}
                {dbStatus === "offline" && "Offline / Server Issue"}
              </Text>
            </View>
          </View>

          {/* Logo & Title branding */}
          <View style={styles.brandBlock}>
            <View style={styles.logoShell}>
              <AppImage source={require("../assets/images/icon.png")} style={styles.logoImage} />
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
          </View>

          {/* Dynamic Highlights Swipe Carousel */}
          <Animated.View style={[styles.carouselContainer, { opacity: fadeAnim }]}>
            <Text style={styles.carouselTitle}>{HIGHLIGHTS[slideIndex].title}</Text>
            <Text style={styles.carouselDesc}>{HIGHLIGHTS[slideIndex].desc}</Text>
            
            {/* Dots Indicator */}
            <View style={styles.dotsRow}>
              {HIGHLIGHTS.map((_, i) => (
                <View
                  key={i}
                  style={[styles.indicatorDot, slideIndex === i && styles.indicatorDotActive]}
                />
              ))}
            </View>
          </Animated.View>

          {/* Call To Actions */}
          <View style={styles.bottomArea}>
            {auth.initialized && auth.isAuthenticated ? (
              <View style={styles.loggedActionsWrap}>
                <Pressable
                  style={[styles.ctaButton, styles.primaryCta]}
                  hitSlop={8}
                  onPress={() => router.replace("/home")}
                  variant="cta"
                >
                  <View style={styles.ctaContent}>
                    <Text style={styles.ctaText}>
                      Continue as {memberName}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color={theme.colors.primary} />
                  </View>
                </Pressable>

                <Pressable
                  style={[styles.ctaButton, styles.secondaryCta]}
                  onPress={() => router.push("/login")}
                  variant="button"
                >
                  <Text style={[styles.ctaText, { color: theme.colors.surface }]}>
                    Switch Account
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[styles.ctaButton, styles.primaryCta]}
                hitSlop={8}
                onPress={() => router.push("/login")}
                variant="cta"
              >
                <View style={styles.ctaContent}>
                  <Text style={styles.ctaText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={18} color={theme.colors.primary} />
                </View>
              </Pressable>
            )}
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
    paddingVertical: 16,
  },
  topBar: {
    alignItems: "center",
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.muted,
  },
  dotOnline: {
    backgroundColor: theme.colors.successStrong,
  },
  dotOffline: {
    backgroundColor: theme.colors.danger,
  },
  statusText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textOnPrimaryMuted,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  brandBlock: {
    alignItems: "center",
    gap: 12,
    marginTop: 30,
  },
  logoShell: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
  },
  logoImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  title: {
    marginTop: 6,
    fontSize: theme.typography.displayM.fontSize,
    lineHeight: theme.typography.displayM.lineHeight,
    fontWeight: theme.typography.displayM.fontWeight,
    color: theme.colors.textOnPrimary,
    letterSpacing: theme.typography.displayM.letterSpacing,
    textShadowColor: theme.colors.overlay,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  carouselContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  carouselTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: "800",
    color: theme.colors.textOnPrimary,
    textAlign: "center",
  },
  carouselDesc: {
    fontSize: theme.typography.bodySm.fontSize,
    color: theme.colors.textOnPrimarySoft,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: 8,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  indicatorDotActive: {
    backgroundColor: theme.colors.surface,
    width: 16,
  },
  bottomArea: {
    marginBottom: 16,
  },
  loggedActionsWrap: {
    width: "100%",
    gap: 12,
  },
  ctaButton: {
    height: 54,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCta: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  secondaryCta: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ctaIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  ctaText: {
    fontSize: theme.typography.title.fontSize,
    fontWeight: "700",
    color: theme.colors.primary,
    letterSpacing: 0.2,
  },
});
