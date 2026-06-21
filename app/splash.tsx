import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { useAuthSession } from "../services/auth";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { createThemedStyleSheet, useThemedStyles, useAppTheme, theme } from "../components/theme";
import { supabase } from "../lib/supabase";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");


const HIGHLIGHTS = [
  { title: "Book Premier Tee Times", desc: "Reserve slots instantly at world-class private golf courses." },
  { title: "Real-Time Weather & Maps", desc: "Live forecast checking and integrated coordinate GPS navigation." },
  { title: "Golfer Dashboard & Stats", desc: "Track handicap updates, GIR %, and longest drives on the go." }
];

export default function Index() {
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const router = useRouter();
  const auth = useAuthSession();
  const { scaleFont, scaleLineHeight } = useResponsiveLayout();

  // Database Connection Status
  const [dbStatus, setDbStatus] = useState<"checking" | "online" | "offline">("checking");

  // Automated Highlights Carousel State
  const [slideIndex, setSlideIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Intro slide/fade transition animations
  const logoTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT / 2 - 200)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

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
    // Run intro animation
    Animated.parallel([
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 850,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 850,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, logoTranslateY]);

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
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <View style={styles.background}>
        <AppImage source={require("../assets/images/get-started-background.webp")} style={styles.backgroundImage} />
        <View style={[
          styles.dimLayer,
          { backgroundColor: resolvedTheme === "dark" ? "rgba(7, 32, 24, 0.78)" : "rgba(244, 248, 246, 0.78)" }
        ]} />

        <SafeAreaView style={styles.safeArea}>
          {/* Top Bar with DB Connectivity Status */}
          <Animated.View style={[styles.topBar, { opacity: contentOpacity }]}>
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
          </Animated.View>

          {/* Logo & Title branding */}
          <Animated.View style={[styles.brandBlock, { transform: [{ translateY: logoTranslateY }] }]}>
            <Image source={require("../assets/images/splash-icon.png")} style={styles.logoImage} />

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
          </Animated.View>

          {/* Dynamic Highlights Swipe Carousel */}
          <Animated.View style={[styles.carouselContainer, { opacity: Animated.multiply(fadeAnim, contentOpacity) }]}>
            <Text style={styles.carouselTitle}>{HIGHLIGHTS[slideIndex].title}</Text>
            <Text style={styles.carouselDesc}>{HIGHLIGHTS[slideIndex].desc}</Text>
          </Animated.View>

          {/* Call To Actions */}
          <Animated.View style={[styles.bottomArea, { opacity: contentOpacity }]}>
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
                    <Ionicons name="arrow-forward" size={18} color={colors.surface} />
                  </View>
                </Pressable>

                <Pressable
                  style={[styles.ctaButton, styles.secondaryCta]}
                  onPress={() => router.navigate("/login")}
                  variant="button"
                >
                  <Text style={[styles.ctaText, { color: colors.text }]}>
                    Switch Account
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[styles.ctaButton, styles.primaryCta]}
                hitSlop={8}
                onPress={() => router.navigate("/login")}
                variant="cta"
              >
                <View style={styles.ctaContent}>
                  <Text style={styles.ctaText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.surface} />
                </View>
              </Pressable>
            )}
          </Animated.View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const themedStyles = createThemedStyleSheet((colors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.page,
  },
  background: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  dimLayer: {
    ...StyleSheet.absoluteFillObject,
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
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.muted,
  },
  dotOnline: {
    backgroundColor: colors.successStrong,
  },
  dotOffline: {
    backgroundColor: colors.danger,
  },
  statusText: {
    fontSize: theme.typography.caption.fontSize,
    color: colors.textSoft,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  brandBlock: {
    alignItems: "center",
    gap: 12,
    marginTop: 30,
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
  title: {
    marginTop: 6,
    fontSize: theme.typography.displayM.fontSize,
    lineHeight: theme.typography.displayM.lineHeight,
    fontWeight: theme.typography.displayM.fontWeight,
    color: colors.text,
    letterSpacing: theme.typography.displayM.letterSpacing,
  },
  carouselContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  carouselTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  carouselDesc: {
    fontSize: theme.typography.bodySm.fontSize,
    color: colors.text,
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
    backgroundColor: colors.borderStrong,
  },
  indicatorDotActive: {
    backgroundColor: colors.primary,
    width: 16,
  },
  bottomArea: {
    marginBottom: 16,
    width: "100%",
    alignItems: "center",
  },
  loggedActionsWrap: {
    width: "100%",
    gap: 12,
    alignItems: "center",
  },
  ctaButton: {
    height: 54,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
  },
  primaryCta: {
    backgroundColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  secondaryCta: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
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
    color: colors.surface,
    letterSpacing: 0.2,
  },
}));

