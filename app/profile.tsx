import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { signOut, updateProfile, useAuthSession } from "../components/auth";
import {
  useBookingState,
} from "../components/bookings";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";



function Toast({ message, visible, onHide }: { message: string; visible: boolean; onHide: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(1800),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide();
      });
    }
  }, [visible, fadeAnim, onHide]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toastContainer, { opacity: fadeAnim }]}>
      <Ionicons name="checkmark-circle" size={16} color={theme.colors.successText} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const auth = useAuthSession();
  const bookingState = useBookingState();
  const { screenBottomPadding } = useResponsiveLayout();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  // Handicap adjustment state
  const [isEditingHandicap, setIsEditingHandicap] = useState(false);
  const [handicapInput, setHandicapInput] = useState("");
  const [savingHandicap, setSavingHandicap] = useState(false);

  // Performance metrics state (Longest Drive, GIR, Putting Avg)
  const [longestDrive, setLongestDrive] = useState("250");
  const [girPercentage, setGirPercentage] = useState("52");
  const [puttingAverage, setPuttingAverage] = useState("1.9");
  const [isEditingMetrics, setIsEditingMetrics] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
  }, []);

  // Load custom metrics from AsyncStorage
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const drive = await AsyncStorage.getItem("golf_metrics_longest_drive");
        const gir = await AsyncStorage.getItem("golf_metrics_gir");
        const putting = await AsyncStorage.getItem("golf_metrics_putting");
        if (drive) setLongestDrive(drive);
        if (gir) setGirPercentage(gir);
        if (putting) setPuttingAverage(putting);
      } catch (err) {
        console.warn("Failed to load metrics", err);
      }
    };
    loadMetrics();
  }, []);

  const saveMetrics = async () => {
    try {
      await AsyncStorage.setItem("golf_metrics_longest_drive", longestDrive);
      await AsyncStorage.setItem("golf_metrics_gir", girPercentage);
      await AsyncStorage.setItem("golf_metrics_putting", puttingAverage);
      setIsEditingMetrics(false);
      showToast("Metrics updated successfully!");
    } catch (err) {
      console.warn("Failed to save metrics", err);
    }
  };

  const handleUpdateHandicap = async (action: "increment" | "decrement" | "save") => {
    let currentVal = parseFloat(handicapInput) || 0.0;
    if (action === "increment") {
      const nextVal = Math.min(54.0, currentVal + 0.1);
      setHandicapInput(nextVal.toFixed(1));
      return;
    }
    if (action === "decrement") {
      const nextVal = Math.max(0.0, currentVal - 0.1);
      setHandicapInput(nextVal.toFixed(1));
      return;
    }

    // Save action
    setSavingHandicap(true);
    try {
      const numericVal = parseFloat(handicapInput);
      if (isNaN(numericVal) || numericVal < 0 || numericVal > 54) {
        throw new Error("Handicap must be between 0.0 and 54.0");
      }
      await updateProfile({ handicap: numericVal });
      setIsEditingHandicap(false);
      showToast("Handicap updated!");
    } catch (err: any) {
      showToast(err.message || "Failed to update handicap");
    } finally {
      setSavingHandicap(false);
    }
  };
  const memberName =
    auth.profile?.full_name ||
    auth.profile?.username ||
    auth.session?.user.email?.split("@")[0] ||
    "GolfTee Member";
  const memberSince = auth.profile?.member_since
    ? new Date(auth.profile.member_since).getFullYear()
    : new Date().getFullYear();
  const handicapValue = auth.profile?.handicap != null ? auth.profile.handicap.toFixed(1) : "--";
  const membershipTier = (auth.profile as any)?.membership_tiers?.name?.toUpperCase() || "FREE";


  // Sync initial handicap when auth loads
  useEffect(() => {
    if (auth.profile?.handicap != null) {
      setHandicapInput(auth.profile.handicap.toFixed(1));
    } else {
      setHandicapInput("18.0");
    }
  }, [auth.profile?.handicap]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await signOut();
      router.replace("/splash");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Unable to log out right now.");
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, router]);
  // Native calling and emailing triggers
  const handleCallConcierge = () => {
    Linking.openURL("tel:+15551234567").catch(() => showToast("Device cannot place telephone calls"));
  };

  const handleEmailSupport = () => {
    Linking.openURL("mailto:support@golftee.com?subject=GolfTee%20Support%20Request").catch(() =>
      showToast("No email application found")
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: screenBottomPadding }]}
        bounces={false}
        overScrollMode="never"
      >
        {/* PREMIUM MINIMALIST PROFILE HEADER */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.avatarWrapContainer}>
              <Pressable style={styles.avatarWrap} onPress={() => router.push("/account")} variant="card">
                {auth.profile?.avatar_url ? (
                  <AppImage source={{ uri: auth.profile.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarInitialContainer}>
                    <Text style={styles.avatarInitialText}>
                      {(memberName || "G")[0].toUpperCase()}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            <View style={styles.headerNameBlock}>
              <View style={styles.tierBadgeRow}>
                <Text style={styles.headerWelcomeText}>MEMBER PROFILE</Text>
                <View style={styles.passTierBadge}>
                  <Text style={styles.passTierText}>{membershipTier}</Text>
                </View>
              </View>
              <Text style={styles.headerNameText} numberOfLines={1}>{memberName}</Text>
              <Text style={styles.headerSinceText}>Active member since {memberSince}</Text>
            </View>

            <Pressable
              style={styles.settingsHeaderBtn}
              onPress={() => router.push("/account")}
              variant="icon"
            >
              <Ionicons name="create-outline" size={22} color={theme.colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* STATS OVERVIEW SECTION */}
        <View style={styles.statsPill}>
          <Pressable
            style={styles.statCol}
            onPress={() => setIsEditingHandicap(!isEditingHandicap)}
            variant="chip"
          >
            <Text style={styles.statLabel}>HANDICAP</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{handicapValue}</Text>
              <Ionicons name="pencil" size={10} color={theme.colors.primary} style={styles.miniPencil} />
            </View>
          </Pressable>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>AVG PAR</Text>
            <Text style={styles.statValue}>74</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>TOTAL ROUNDS</Text>
            <Text style={styles.statValue}>{bookingState.bookings.length}</Text>
          </View>
        </View>

        {/* INLINE HANDICAP ADJUSTER */}
        {isEditingHandicap && (
          <View style={styles.handicapAdjusterWrap}>
            <Text style={styles.adjusterTitle}>Adjust Handicap</Text>
            <View style={styles.adjusterRow}>
              <Pressable
                style={styles.adjusterBtn}
                onPress={() => handleUpdateHandicap("decrement")}
                variant="chip"
              >
                <Ionicons name="remove" size={18} color={theme.colors.primary} />
              </Pressable>
              <TextInput
                style={styles.handicapInput}
                keyboardType="numeric"
                value={handicapInput}
                onChangeText={setHandicapInput}
              />
              <Pressable
                style={styles.adjusterBtn}
                onPress={() => handleUpdateHandicap("increment")}
                variant="chip"
              >
                <Ionicons name="add" size={18} color={theme.colors.primary} />
              </Pressable>
            </View>
            <View style={styles.adjusterActions}>
              <Pressable
                style={[styles.btnMini, styles.btnCancel]}
                onPress={() => setIsEditingHandicap(false)}
                variant="chip"
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.btnMini, styles.btnSave]}
                onPress={() => handleUpdateHandicap("save")}
                disabled={savingHandicap}
                variant="cta"
              >
                {savingHandicap ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnSaveText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* PERFORMANCE DASHBOARD */}
        <View style={styles.metricsDashboardWrap}>
          <View style={styles.dashboardHeader}>
            <View style={styles.dashboardTitleRow}>
              <Ionicons name="analytics" size={18} color={theme.colors.primary} />
              <Text style={styles.dashboardTitle}>Performance Stats</Text>
            </View>
            <Pressable style={styles.metricsEditBtn} onPress={() => setIsEditingMetrics(true)} variant="chip">
              <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.metricsEditBtnText}>Edit</Text>
            </Pressable>
          </View>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: `${theme.colors.primary}12` }]}>
                <Ionicons name="speedometer-outline" size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.metricValText}>{longestDrive} yds</Text>
              <Text style={styles.metricLabelText}>Longest Drive</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: `${theme.colors.accentWarm}12` }]}>
                <Ionicons name="disc-outline" size={18} color={theme.colors.accentWarm} />
              </View>
              <Text style={styles.metricValText}>{girPercentage}%</Text>
              <Text style={styles.metricLabelText}>GIR Ratio</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: `${theme.colors.primary}12` }]}>
                <Ionicons name="flag-outline" size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.metricValText}>{puttingAverage}</Text>
              <Text style={styles.metricLabelText}>Putting Avg</Text>
            </View>
          </View>
        </View>



        {/* 2X2 QUICK ACTION GRID */}
        <Text style={styles.actionGridLabel}>ACCOUNT QUICK INTERACTIONS</Text>
        <View style={styles.actionGridContainer}>
          <View style={styles.actionGridRow}>
            {/* Tile 1: Club Concierge */}
            <Pressable style={[styles.gridTile, { backgroundColor: `${theme.colors.primarySoft}` }]} onPress={handleCallConcierge} variant="card">
              <View style={[styles.tileIconWrap, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="call" size={18} color={theme.colors.surface} />
              </View>
              <Text style={styles.tileTitle}>Club Concierge</Text>
              <Text style={styles.tileSubtitle}>Priority support dialer</Text>
            </Pressable>

            {/* Tile 2: Support Email */}
            <Pressable style={[styles.gridTile, { backgroundColor: `${theme.colors.accentSoft}50` }]} onPress={handleEmailSupport} variant="card">
              <View style={[styles.tileIconWrap, { backgroundColor: theme.colors.accentWarm }]}>
                <Ionicons name="mail" size={18} color={theme.colors.surface} />
              </View>
              <Text style={styles.tileTitle}>Support Desk</Text>
              <Text style={styles.tileSubtitle}>Inquiries & assistance</Text>
            </Pressable>
          </View>

          <View style={styles.actionGridRow}>
            {/* Tile 3: Favorite Courses */}
            <Pressable style={[styles.gridTile, { backgroundColor: `${theme.colors.primarySoft}` }]} onPress={() => router.push("/favourites")} variant="card">
              <View style={[styles.tileIconWrap, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="heart" size={18} color={theme.colors.surface} />
              </View>
              <Text style={styles.tileTitle}>Saved Courses</Text>
              <Text style={styles.tileSubtitle}>View favorited courses</Text>
            </Pressable>

            {/* Tile 4: App Settings */}
            <Pressable style={[styles.gridTile, { backgroundColor: `${theme.colors.primarySoft}` }]} onPress={() => router.push("/settings")} variant="card">
              <View style={[styles.tileIconWrap, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="settings" size={18} color={theme.colors.surface} />
              </View>
              <Text style={styles.tileTitle}>App Settings</Text>
              <Text style={styles.tileSubtitle}>Alerts & preferences</Text>
            </Pressable>
          </View>
        </View>



        {/* LOG OUT SEPARATION */}
        <View style={styles.logoutBtnContainer}>
          {logoutError ? <Text style={styles.actionErrorText}>{logoutError}</Text> : null}
          <Pressable style={styles.logoutButton} onPress={() => void handleLogout()} disabled={isLoggingOut} variant="button">
            <Ionicons name="log-out-outline" size={18} color={theme.colors.danger} />
            <Text style={styles.logoutButtonText}>{isLoggingOut ? "LOGGING OUT..." : "LOG OUT ACCOUNT"}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Golfer Metrics Editor Modal */}
      <Modal
        visible={isEditingMetrics}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditingMetrics(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Golf Performance Metrics</Text>
            
            <View style={styles.metricFormGroup}>
              <Text style={styles.metricLabelText}>Longest Drive (yds)</Text>
              <TextInput
                style={styles.metricInput}
                keyboardType="numeric"
                value={longestDrive}
                onChangeText={setLongestDrive}
              />
            </View>

            <View style={styles.metricFormGroup}>
              <Text style={styles.metricLabelText}>Greens in Regulation (GIR %)</Text>
              <TextInput
                style={styles.metricInput}
                keyboardType="numeric"
                value={girPercentage}
                onChangeText={setGirPercentage}
              />
            </View>

            <View style={styles.metricFormGroup}>
              <Text style={styles.metricLabelText}>Putting Average (putts/hole)</Text>
              <TextInput
                style={styles.metricInput}
                keyboardType="numeric"
                value={puttingAverage}
                onChangeText={setPuttingAverage}
              />
            </View>

            <View style={styles.modalActionsRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setIsEditingMetrics(false)}
                variant="chip"
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={saveMetrics}
                variant="cta"
              >
                <Text style={styles.modalBtnSaveText}>Save Stats</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast popup */}
      <Toast message={toastMessage} visible={toastVisible} onHide={() => setToastVisible(false)} />
    </SafeAreaView>
  );
}const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 160,
  },
  profileHeaderCard: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderSoft,
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  settingsHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrapContainer: {
    position: "relative",
  },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitialContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialText: {
    color: theme.colors.surface,
    fontSize: theme.typography.h1.fontSize,
    lineHeight: theme.typography.h1.lineHeight,
    fontWeight: theme.typography.h1.fontWeight,
    letterSpacing: theme.typography.h1.letterSpacing,
  },
  avatarEditBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerNameBlock: {
    flex: 1,
    justifyContent: "center",
  },
  tierBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  headerWelcomeText: {
    fontSize: theme.typography.overline.fontSize,
    lineHeight: theme.typography.overline.lineHeight,
    fontWeight: theme.typography.overline.fontWeight,
    letterSpacing: theme.typography.overline.letterSpacing,
    color: theme.colors.textSoft,
  },
  passTierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  passTierText: {
    color: theme.colors.primary,
    fontSize: theme.typography.overline.fontSize,
    lineHeight: theme.typography.overline.lineHeight,
    fontWeight: theme.typography.overline.fontWeight,
    letterSpacing: theme.typography.overline.letterSpacing,
  },
  headerNameText: {
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    fontWeight: theme.typography.h2.fontWeight,
    letterSpacing: theme.typography.h2.letterSpacing,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  headerSinceText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: theme.typography.caption.fontWeight,
    letterSpacing: theme.typography.caption.letterSpacing,
    color: theme.colors.textSoft,
  },
  statsPill: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: theme.typography.caption.fontWeight,
    letterSpacing: theme.typography.caption.letterSpacing,
    color: theme.colors.textSoft,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  miniPencil: {
    opacity: 0.7,
  },
  statValue: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    fontWeight: theme.typography.h3.fontWeight,
    letterSpacing: theme.typography.h3.letterSpacing,
    color: theme.colors.primary,
  },
  statDivider: {
    width: 1,
    height: 26,
    backgroundColor: theme.colors.border,
  },
  handicapAdjusterWrap: {
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 20,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    alignItems: "center",
    gap: 10,
  },
  adjusterTitle: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    fontWeight: theme.typography.title.fontWeight,
    color: theme.colors.primary,
  },
  adjusterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  adjusterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  handicapInput: {
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.primary,
    width: 60,
    textAlign: "center",
  },
  adjusterActions: {
    flexDirection: "row",
    gap: 8,
  },
  btnMini: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancel: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnCancelText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "600",
    color: theme.colors.textSoft,
  },
  btnSave: {
    backgroundColor: theme.colors.primary,
    minWidth: 70,
  },
  btnSaveText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "700",
    color: theme.colors.surface,
  },
  metricsDashboardWrap: {
    marginHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    padding: 14,
    gap: 12,
    marginBottom: 20,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dashboardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dashboardTitle: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.title.fontWeight,
    color: theme.colors.primary,
  },
  metricsEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
  },
  metricsEditBtnText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 6,
  },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValText: {
    fontSize: theme.typography.h4.fontSize,
    lineHeight: theme.typography.h4.lineHeight,
    fontWeight: theme.typography.h4.fontWeight,
    color: theme.colors.primary,
  },
  metricLabelText: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: theme.typography.caption.fontWeight,
    letterSpacing: 0.3,
    color: theme.colors.textSoft,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    alignSelf: "flex-end",
    paddingHorizontal: 11,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  viewAllText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    fontWeight: theme.typography.h3.fontWeight,
    letterSpacing: theme.typography.h3.letterSpacing,
    color: theme.colors.primary,
  },
  previewRow: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 12,
  },
  previewCard: {
    width: 300,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  previewImageWrap: {
    height: 120,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlayDark,
  },
  confirmedPill: {
    position: "absolute",
    right: 10,
    top: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 8,
    height: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  confirmDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.successStrong,
  },
  confirmedText: {
    fontSize: theme.typography.overline.fontSize,
    lineHeight: theme.typography.overline.lineHeight,
    fontWeight: theme.typography.overline.fontWeight,
    letterSpacing: 0.8,
    color: theme.colors.primary,
  },
  previewTextWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
  },
  previewTitle: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.title.fontWeight,
    color: theme.colors.surface,
  },
  previewLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  previewLocation: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: theme.typography.caption.fontWeight,
    color: theme.colors.textOnPrimarySoft,
  },
  previewMetaWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  previewMetaGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
    columnGap: 12,
  },
  metaLabel: {
    fontSize: theme.typography.overline.fontSize,
    lineHeight: theme.typography.overline.lineHeight,
    fontWeight: theme.typography.overline.fontWeight,
    letterSpacing: 0.8,
    color: theme.colors.textSoft,
  },
  metaValue: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  qrWrap: {
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingLeft: 12,
  },
  qrCodeText: {
    marginTop: 2,
    fontSize: theme.typography.overline.fontSize - 1,
    lineHeight: theme.typography.overline.lineHeight,
    fontWeight: "700",
    color: theme.colors.textSoft,
    letterSpacing: 0.5,
  },
  emptyBookingsCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surfaceSoft,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyStateText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "500",
    color: theme.colors.textSoft,
    textAlign: "center",
  },
  actionGridLabel: {
    fontSize: theme.typography.overline.fontSize,
    lineHeight: theme.typography.overline.lineHeight,
    fontWeight: theme.typography.overline.fontWeight,
    letterSpacing: theme.typography.overline.letterSpacing,
    color: theme.colors.muted,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 10,
  },
  actionGridContainer: {
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 26,
  },
  actionGridRow: {
    flexDirection: "row",
    gap: 10,
  },
  gridTile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    padding: 14,
    gap: 8,
  },
  tileIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tileTitle: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.title.fontWeight,
    color: theme.colors.primary,
  },
  tileSubtitle: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "500",
    color: theme.colors.textSoft,
  },
  historySection: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 10,
  },
  historyList: {
    gap: 10,
  },
  historyItem: {
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  historyThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceSoft,
  },
  historyThumbImage: {
    width: "100%",
    height: "100%",
  },
  historyName: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    fontWeight: theme.typography.title.fontWeight,
    color: theme.colors.primary,
  },
  historyMeta: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: theme.typography.caption.fontWeight,
    color: theme.colors.textSoft,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  historyPrice: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    fontWeight: "700",
    color: theme.colors.accentWarm,
  },
  historyStatus: {
    fontSize: theme.typography.overline.fontSize,
    lineHeight: theme.typography.overline.lineHeight,
    fontWeight: theme.typography.overline.fontWeight,
    letterSpacing: theme.typography.overline.letterSpacing,
    color: theme.colors.successText,
  },
  loadButton: {
    marginTop: 4,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  loadButtonText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  logoutBtnContainer: {
    paddingHorizontal: 16,
    marginVertical: 24,
    alignItems: "center",
    gap: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.danger,
    borderRadius: theme.radius.pill,
    width: "100%",
    height: 48,
    backgroundColor: theme.colors.surface,
  },
  logoutButtonText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "700",
    color: theme.colors.danger,
    letterSpacing: 1,
  },
  actionErrorText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.danger,
    fontWeight: "600",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    gap: 14,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitle: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    fontWeight: "800",
    color: theme.colors.primary,
    marginBottom: 4,
  },
  metricFormGroup: {
    gap: 4,
  },
  metricInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 12,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    height: 40,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalBtnCancelText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "700",
    color: theme.colors.textSoft,
  },
  modalBtnSave: {
    backgroundColor: theme.colors.primary,
  },
  modalBtnSaveText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "700",
    color: theme.colors.surface,
  },
  toastContainer: {
    position: "absolute",
    bottom: 110,
    alignSelf: "center",
    backgroundColor: theme.colors.success,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "700",
    color: theme.colors.successText,
  },
});
