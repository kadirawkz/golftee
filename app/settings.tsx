import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform, 
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  Modal,
  LayoutAnimation,
  UIManager,
  Animated,
 } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { createThemedStyleSheet, useThemedStyles, useAppTheme } from "../components/theme";
import { supabase } from "../lib/supabase";
import { useAuthSession, getActiveSessions, deleteActiveSession, getDeviceSessionId, signOut } from "../services/auth";
import { useRouter } from "expo-router";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  const isNewArch = !!(global as any).nativeFabricUILegenericProfiler || !!(global as any).nativeFabricUILegacyProfiler || !!(global as any).RN$Bridgeless;
  if (!isNewArch) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

function SectionHeader({ title, caption }: { title: string; caption?: string }) {
  const styles = useThemedStyles(themedStyles);
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
    </View>
  );
}

function SessionRowItem({
  item,
  isCurrent,
  colors,
  styles,
  onPressRevoke,
  isRevoking,
  onAnimationComplete,
  currentSessionAgeMs,
}: {
  item: any;
  isCurrent: boolean;
  colors: any;
  styles: any;
  onPressRevoke: () => void;
  isRevoking: boolean;
  onAnimationComplete: () => void;
  currentSessionAgeMs?: number;
}) {
  const [fadeAnim] = useState(() => new Animated.Value(1));
  const [heightAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (isRevoking) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: false,
        }),
        Animated.timing(heightAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: false,
        }),
      ]).start(() => {
        onAnimationComplete();
      });
    }
  }, [isRevoking, fadeAnim, heightAnim, onAnimationComplete]);

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [
      {
        scale: fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
      },
    ],
    maxHeight: heightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 150],
    }),
    paddingVertical: heightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 14],
    }),
    borderBottomWidth: heightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  };

  const itemAgeMs = new Date().getTime() - new Date(item.created_at || item.last_active_at).getTime();
  const safeCurrentSessionAgeMs = currentSessionAgeMs !== undefined ? currentSessionAgeMs : 24 * 60 * 60 * 1000;
  
  const isCurrentSessionNew = safeCurrentSessionAgeMs < 24 * 60 * 60 * 1000;
  const isTargetOlder = itemAgeMs > safeCurrentSessionAgeMs;
  
  const isTooNewToLogOut = !isCurrent && isCurrentSessionNew && isTargetOlder;
  const hoursLeft = isTooNewToLogOut ? Math.ceil((24 * 60 * 60 * 1000 - safeCurrentSessionAgeMs) / (1000 * 60 * 60)) : 0;

  return (
    <Animated.View style={[styles.sessionRow, animatedStyle, { overflow: "hidden" }]}>
      <View style={styles.sessionIconWrap}>
        <Ionicons
          name={item.client_type === "web" ? "desktop-outline" : "phone-portrait-outline"}
          size={20}
          color={colors.primary}
        />
      </View>
      <View style={styles.sessionInfo}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={styles.sessionDeviceName}>{item.device_name}</Text>
          {isCurrent ? (
            <View style={styles.currentDeviceBadge}>
              <Text style={styles.currentDeviceBadgeText}>This Device</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.sessionSubtext}>
          {item.os_name} • {item.location || "Unknown Location"}
        </Text>
        <Text style={styles.sessionTimeText}>
          Active: {new Date(item.last_active_at).toLocaleDateString()} at {new Date(item.last_active_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {isTooNewToLogOut ? (
          <Text style={[styles.sessionTimeText, { color: colors.warning, marginTop: 4, fontWeight: "600" }]}>
            Can log out in {hoursLeft}h (24h minimum required)
          </Text>
        ) : null}
      </View>
      <Pressable
        style={[styles.revokeBtn, { opacity: isTooNewToLogOut ? 0.5 : 1 }]}
        onPress={onPressRevoke}
        variant="chip"
        disabled={isRevoking || isTooNewToLogOut}
      >
        <Ionicons name="log-out-outline" size={16} color={isTooNewToLogOut ? colors.muted : colors.danger} />
        <Text style={[styles.revokeBtnText, { color: isTooNewToLogOut ? colors.muted : colors.danger }]}>Log Out</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { horizontalPadding, screenBottomPadding, isTabletLike } = useResponsiveLayout();
  const { themeMode, setThemeMode, colors, resolvedTheme } = useAppTheme();
  const styles = useThemedStyles(themedStyles);

  const auth = useAuthSession();
  const userEmail = auth.session?.user?.email;

  // Settings State
  const [bookingAlerts, setBookingAlerts] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);
  const [defaultPlayers, setDefaultPlayers] = useState(1);

  // Modals state
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  const [isFaqModalVisible, setIsFaqModalVisible] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>("");
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<any | null>(null);
  const [animatingRevokeId, setAnimatingRevokeId] = useState<string | null>(null);

  // Custom spring alert modal animation states
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [modalScale] = useState(() => new Animated.Value(0.85));
  const [modalBgOpacity] = useState(() => new Animated.Value(0));

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const active = await getActiveSessions();
      const currentId = await getDeviceSessionId();

      // Sort: Current device session always goes first, then order by last_active_at descending
      const sorted = (active || []).sort((a, b) => {
        const aIsCurrent = a.device_session_id === currentId;
        const bIsCurrent = b.device_session_id === currentId;
        if (aIsCurrent && !bIsCurrent) return -1;
        if (!aIsCurrent && bIsCurrent) return 1;
        return new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime();
      });

      // Animate transition of the list updates smoothly
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSessions(sorted);
      setCurrentDeviceId(currentId);
    } catch (err) {
      console.warn("Failed to load active sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated) {
      void loadSessions();
    }
  }, [auth.isAuthenticated]);

  const handleRevokeSession = (sessionId: string) => {
    const targetSession = sessions.find((s) => s.id === sessionId);
    if (targetSession) {
      setSessionToRevoke(targetSession);
      setShowRevokeModal(true);
      modalBgOpacity.setValue(0);
      modalScale.setValue(0.85);

      Animated.parallel([
        Animated.timing(modalBgOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(modalScale, {
          toValue: 1,
          friction: 7,
          tension: 45,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const closeRevokeModal = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(modalBgOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(modalScale, {
        toValue: 0.85,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowRevokeModal(false);
      setSessionToRevoke(null);
      if (callback) callback();
    });
  };

  const confirmRevokeSession = async () => {
    if (!sessionToRevoke) return;
    const sessionId = sessionToRevoke.id;

    // Trigger close animation first, then start row collapse transition on complete
    closeRevokeModal(() => {
      setAnimatingRevokeId(sessionId);
    });
  };

  const handleFinalRevoke = async (sessionId: string) => {
    const targetSession = sessions.find((s) => s.id === sessionId);
    if (!targetSession) return;
    const isCurrent = targetSession.device_session_id === currentDeviceId;

    // Remove from local sessions state
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setAnimatingRevokeId(null);

    // Perform background API call
    try {
      await deleteActiveSession(sessionId);
      if (isCurrent) {
        await signOut();
        router.replace("/splash");
      }
    } catch (err) {
      console.warn("Failed to revoke session:", err);
      // Restore list if action fails
      void loadSessions();
    }
  };

  const renderSessionsSection = () => {
    if (!auth.isAuthenticated) return null;
    return (
      <View style={styles.section}>
        <SectionHeader title="Logged-in Devices" caption="Manage and revoke active sessions on your account." />
        <View style={styles.card}>
          {sessionsLoading && sessions.length === 0 ? (
            <View style={{ padding: 20, alignItems: "center" }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : sessions.length === 0 ? (
            <View style={{ padding: 20, alignItems: "center" }}>
              <Text style={styles.rowDescription}>No active sessions found.</Text>
            </View>
          ) : (
            sessions.map((item) => {
              const isCurrent = item.device_session_id === currentDeviceId;
              const currentSession = sessions.find((s) => s.device_session_id === currentDeviceId);
              const currentSessionAgeMs = currentSession 
                ? new Date().getTime() - new Date(currentSession.created_at || currentSession.last_active_at).getTime() 
                : 24 * 60 * 60 * 1000;

              return (
                <SessionRowItem
                  key={item.id}
                  item={item}
                  isCurrent={isCurrent}
                  colors={colors}
                  styles={styles}
                  onPressRevoke={() => handleRevokeSession(item.id)}
                  isRevoking={animatingRevokeId === item.id}
                  onAnimationComplete={() => void handleFinalRevoke(item.id)}
                  currentSessionAgeMs={currentSessionAgeMs}
                />
              );
            })
          )}
        </View>
      </View>
    );
  };

  // Load preferences
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const alertsVal = await AsyncStorage.getItem("golftee:settings:booking_alerts");
        if (alertsVal !== null) setBookingAlerts(alertsVal === "true");

        const sysVal = await AsyncStorage.getItem("golftee:settings:system_alerts");
        if (sysVal !== null) setSystemAlerts(sysVal === "true");

        const playersVal = await AsyncStorage.getItem("golftee:settings:default_players");
        if (playersVal !== null) setDefaultPlayers(parseInt(playersVal, 10));

        const payVal = await AsyncStorage.getItem("golftee:settings:default_payment");
        if (payVal === "wallet" || payVal === "card") {
          // No-op or we can just load it if we need, but since state is removed we don't need to set it
        }
      } catch (err) {
        console.warn("Failed to load settings from storage", err);
      }
    };
    loadSettings();
  }, []);

  // Setters with storage sync
  const handleToggleBookingAlerts = async (val: boolean) => {
    setBookingAlerts(val);
    await AsyncStorage.setItem("golftee:settings:booking_alerts", val ? "true" : "false");
  };

  const handleToggleSystemAlerts = async (val: boolean) => {
    setSystemAlerts(val);
    await AsyncStorage.setItem("golftee:settings:system_alerts", val ? "true" : "false");
  };

  const handleSelectDefaultPlayers = async (count: number) => {
    setDefaultPlayers(count);
    await AsyncStorage.setItem("golftee:settings:default_players", String(count));
  };



  // Change Password
  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      setPasswordStatus("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordStatus("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("Passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordStatus(null);
    try {
      if (!userEmail) {
        throw new Error("Unable to identify current user session.");
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Incorrect current password.");
      }

      // Update to new password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordStatus("Password updated securely!");
      setTimeout(() => {
        setIsPasswordModalVisible(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordStatus(null);
      }, 1500);
    } catch (err: any) {
      setPasswordStatus(err.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };



  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScrollView
        showsVerticalScrollIndicator={Platform.OS === "web"}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: Math.max(screenBottomPadding - 20, 120) },
        ]}
        bounces={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
      >
        {isTabletLike ? (
          <View style={styles.desktopLayoutRow}>
            <View style={styles.desktopColumnLeft}>
              {/* Notifications */}
              <View style={styles.section}>
                <SectionHeader title="Notifications" caption="Control device reminder triggers." />
                <View style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.iconPrimary}>
                      <Ionicons name="notifications-outline" size={18} color={colors.text} />
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>Booking Alerts</Text>
                      <Text style={styles.rowDescription}>Reminders 24h, 12h, and 2h before rounds.</Text>
                    </View>
                    <Switch
                      value={bookingAlerts}
                      onValueChange={handleToggleBookingAlerts}
                      trackColor={{ false: colors.borderStrong, true: colors.accent }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={styles.iconPrimary}>
                      <Ionicons name="megaphone-outline" size={18} color={colors.text} />
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>System Notifications</Text>
                      <Text style={styles.rowDescription}>In-app confirmations and profile change logs.</Text>
                    </View>
                    <Switch
                      value={systemAlerts}
                      onValueChange={handleToggleSystemAlerts}
                      trackColor={{ false: colors.borderStrong, true: colors.accent }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
              </View>

              {/* App Theme Selection */}
              <View style={styles.section}>
                <SectionHeader title="App Theme" caption="Toggle between light and dark visual aesthetics." />
                <View style={styles.card}>
                  <View style={styles.prefSelectorRow}>
                    <Text style={styles.prefLabel}>THEME MODE</Text>
                    <View style={styles.chipGroup}>
                      {(["system", "light", "dark"] as const).map((mode) => {
                        const active = themeMode === mode;
                        return (
                          <Pressable
                            key={mode}
                            style={[styles.prefChip, active && styles.prefChipActive]}
                            onPress={() => void setThemeMode(mode)}
                            variant="chip"
                          >
                            <Text style={[styles.prefChipText, active && styles.prefChipTextActive]}>
                              {mode === "system"
                                ? "System"
                                : mode === "light"
                                ? "Light Theme"
                                : "Dark Theme"}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.desktopColumnRight}>
              {/* Booking Defaults */}
              <View style={styles.section}>
                <SectionHeader title="Booking Defaults" caption="Pre-fill tee time checkout details." />
                <View style={styles.card}>
                  <View style={styles.prefSelectorRow}>
                    <Text style={styles.prefLabel}>DEFAULT PLAYERS</Text>
                    <View style={styles.chipGroup}>
                      {[1, 2, 3, 4].map((count) => {
                        const active = defaultPlayers === count;
                        return (
                          <Pressable
                            key={count}
                            style={[styles.prefChip, active && styles.prefChipActive]}
                            onPress={() => void handleSelectDefaultPlayers(count)}
                            variant="chip"
                          >
                            <Text style={[styles.prefChipText, active && styles.prefChipTextActive]}>
                              {count} {count === 1 ? "Player" : "Players"}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <Pressable
                    style={[styles.row, { borderTopWidth: 1, borderColor: colors.borderSoft }]}
                    onPress={() => router.navigate("/payment-methods")}
                    variant="card"
                  >
                    <View style={styles.iconSecondary}>
                      <Ionicons name="card-outline" size={18} color={colors.text} />
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>Payment Methods</Text>
                      <Text style={styles.rowDescription}>Manage cards and digital wallets.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </Pressable>
                </View>
              </View>

              {/* Security & Support */}
              <View style={styles.section}>
                <SectionHeader title="Privacy & Security" caption="Manage account access controls." />
                <View style={styles.card}>
                  <Pressable
                    style={styles.row}
                    onPress={() => setIsPasswordModalVisible(true)}
                    variant="card"
                  >
                    <View style={styles.iconSecondary}>
                      <Ionicons name="key-outline" size={18} color={colors.text} />
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>Change Password</Text>
                      <Text style={styles.rowDescription}>Update Supabase password securely.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </Pressable>

                  <Pressable
                    style={styles.row}
                    onPress={() => setIsFaqModalVisible(true)}
                    variant="card"
                  >
                    <View style={styles.iconSecondary}>
                      <Ionicons name="help-circle-outline" size={18} color={colors.text} />
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>FAQs & Information</Text>
                      <Text style={styles.rowDescription}>Booking rules & cancellation policies.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <>
            {/* Notifications */}
            <View style={styles.section}>
              <SectionHeader title="Notifications" caption="Control device reminder triggers." />
              <View style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.iconPrimary}>
                    <Ionicons name="notifications-outline" size={18} color={colors.text} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>Booking Alerts</Text>
                    <Text style={styles.rowDescription}>Reminders 24h, 12h, and 2h before rounds.</Text>
                  </View>
                  <Switch
                    value={bookingAlerts}
                    onValueChange={handleToggleBookingAlerts}
                    trackColor={{ false: colors.borderStrong, true: colors.accent }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.row}>
                  <View style={styles.iconPrimary}>
                    <Ionicons name="megaphone-outline" size={18} color={colors.text} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>System Notifications</Text>
                    <Text style={styles.rowDescription}>In-app confirmations and profile change logs.</Text>
                  </View>
                  <Switch
                    value={systemAlerts}
                    onValueChange={handleToggleSystemAlerts}
                    trackColor={{ false: colors.borderStrong, true: colors.accent }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </View>

            {/* App Theme Selection */}
            <View style={styles.section}>
              <SectionHeader title="App Theme" caption="Toggle between light and dark visual aesthetics." />
              <View style={styles.card}>
                <View style={styles.prefSelectorRow}>
                  <Text style={styles.prefLabel}>THEME MODE</Text>
                  <View style={styles.chipGroup}>
                    {(["system", "light", "dark"] as const).map((mode) => {
                      const active = themeMode === mode;
                      return (
                        <Pressable
                          key={mode}
                          style={[styles.prefChip, active && styles.prefChipActive]}
                          onPress={() => void setThemeMode(mode)}
                          variant="chip"
                        >
                          <Text style={[styles.prefChipText, active && styles.prefChipTextActive]}>
                            {mode === "system"
                              ? "System"
                              : mode === "light"
                              ? "Light Theme"
                              : "Dark Theme"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>

            {/* Booking Defaults */}
            <View style={styles.section}>
              <SectionHeader title="Booking Defaults" caption="Pre-fill tee time checkout details." />
              <View style={styles.card}>
                <View style={styles.prefSelectorRow}>
                  <Text style={styles.prefLabel}>DEFAULT PLAYERS</Text>
                  <View style={styles.chipGroup}>
                    {[1, 2, 3, 4].map((count) => {
                      const active = defaultPlayers === count;
                      return (
                        <Pressable
                          key={count}
                          style={[styles.prefChip, active && styles.prefChipActive]}
                          onPress={() => void handleSelectDefaultPlayers(count)}
                          variant="chip"
                        >
                          <Text style={[styles.prefChipText, active && styles.prefChipTextActive]}>
                            {count} {count === 1 ? "Player" : "Players"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <Pressable
                  style={[styles.row, { borderTopWidth: 1, borderColor: colors.borderSoft }]}
                  onPress={() => router.navigate("/payment-methods")}
                  variant="card"
                >
                  <View style={styles.iconSecondary}>
                    <Ionicons name="card-outline" size={18} color={colors.text} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>Payment Methods</Text>
                    <Text style={styles.rowDescription}>Manage cards and digital wallets.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              </View>
            </View>

            {/* Security & Support */}
            <View style={styles.section}>
              <SectionHeader title="Privacy & Security" caption="Manage account access controls." />
              <View style={styles.card}>
                <Pressable
                  style={styles.row}
                  onPress={() => setIsPasswordModalVisible(true)}
                  variant="card"
                >
                  <View style={styles.iconSecondary}>
                    <Ionicons name="key-outline" size={18} color={colors.text} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>Change Password</Text>
                    <Text style={styles.rowDescription}>Update Supabase password securely.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>

                <Pressable
                  style={styles.row}
                  onPress={() => setIsFaqModalVisible(true)}
                  variant="card"
                >
                  <View style={styles.iconSecondary}>
                    <Ionicons name="help-circle-outline" size={18} color={colors.text} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>FAQs & Information</Text>
                    <Text style={styles.rowDescription}>Booking rules & cancellation policies.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              </View>
            </View>
          </>
        )}
        {renderSessionsSection()}
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={isPasswordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPasswordModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Password</Text>
            <Text style={styles.modalSubtitle}>Change your sign-in password securely.</Text>

            <View style={styles.inputShell}>
              <Text style={styles.inputLabel}>CURRENT PASSWORD</Text>
              <TextInput
                secureTextEntry
                style={styles.inputField}
                placeholder="Enter current password"
                placeholderTextColor={colors.muted}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputShell}>
              <Text style={styles.inputLabel}>NEW PASSWORD</Text>
              <TextInput
                secureTextEntry
                style={styles.inputField}
                placeholder="Minimum 6 characters"
                placeholderTextColor={colors.muted}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputShell}>
              <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
              <TextInput
                secureTextEntry
                style={styles.inputField}
                placeholder="Re-enter password"
                placeholderTextColor={colors.muted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
            </View>

            {passwordStatus ? <Text style={styles.statusText}>{passwordStatus}</Text> : null}

            <View style={styles.modalActionsRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setIsPasswordModalVisible(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordStatus(null);
                }}
                variant="chip"
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={() => void handleUpdatePassword()}
                disabled={isUpdatingPassword}
                variant="cta"
              >
                {isUpdatingPassword ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text style={styles.modalBtnSaveText}>Save Changes</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* FAQs Modal */}
      <Modal
        visible={isFaqModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFaqModalVisible(false)}
      >
        <View style={styles.faqModalBg}>
          <SafeAreaView style={styles.faqContainer}>
            <View style={styles.faqHeader}>
              <Text style={styles.faqHeaderTitle}>FAQs & General Info</Text>
              <Pressable
                style={styles.faqCloseBtn}
                onPress={() => setIsFaqModalVisible(false)}
                variant="icon"
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.faqScroll} showsVerticalScrollIndicator={Platform.OS === "web"}>
              <View style={styles.faqCard}>
                <Text style={styles.faqQuestion}>How do I cancel a booking?</Text>
                <Text style={styles.faqAnswer}>
                  Navigate to your profile, find the round under &quot;Upcoming Rounds&quot; or click &quot;View All&quot; on Bookings. Select the booking and tap &quot;Cancel Booking&quot;.
                </Text>
              </View>

              <View style={styles.faqCard}>
                <Text style={styles.faqQuestion}>What is the cancellation policy?</Text>
                <Text style={styles.faqAnswer}>
                  Reservations can be fully refunded or rescheduled up to 24 hours before your tee time. Cancellations inside 24 hours may incur a partial fee depending on course regulations.
                </Text>
              </View>

              <View style={styles.faqCard}>
                <Text style={styles.faqQuestion}>How do tee time reminders work?</Text>
                <Text style={styles.faqAnswer}>
                  If &quot;Booking Alerts&quot; is enabled, your device will schedule local notification alerts 24 hours, 12 hours, and 2 hours before your scheduled play time.
                </Text>
              </View>

              <View style={styles.faqCard}>
                <Text style={styles.faqQuestion}>Can I book for multiple players?</Text>
                <Text style={styles.faqAnswer}>
                  Yes! You can reserve slots for 1, 2, 3, or 4 players. Green fees and caddy assistance calculations will scale automatically based on the player count.
                </Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Revoke Session Confirmation Modal */}
      <Modal
        visible={showRevokeModal}
        transparent
        animationType="none"
        onRequestClose={() => closeRevokeModal()}
      >
        <Animated.View style={[styles.modalBg, { opacity: modalBgOpacity }]}>
          <Animated.View style={[
            styles.modalContent, 
            { 
              maxWidth: 400, 
              alignItems: "center",
              transform: [{ scale: modalScale }]
            }
          ]}>
            <View style={[styles.iconPrimary, { backgroundColor: colors.danger + "20", width: 56, height: 56, borderRadius: 28, marginBottom: 8 }]}>
              <Ionicons name="log-out" size={28} color={colors.danger} />
            </View>
            <Text style={styles.modalTitle}>
              {sessionToRevoke?.device_session_id === currentDeviceId ? "Log Out of This Device?" : "Log Out Device?"}
            </Text>
            <Text style={[styles.modalSubtitle, { textAlign: "center", lineHeight: 18 }]}>
              {sessionToRevoke?.device_session_id === currentDeviceId
                ? "Are you sure you want to log out of your current session? You will need to sign in again to access your account."
                : `Are you sure you want to log out of the session on ${sessionToRevoke?.device_name || "this device"}?`}
            </Text>

            <View style={styles.modalActionsRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => closeRevokeModal()}
                variant="chip"
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.danger }]}
                onPress={() => void confirmRevokeSession()}
                variant="cta"
              >
                <Text style={[styles.modalBtnSaveText, { color: "#FFFFFF" }]}>Log Out</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const themedStyles = createThemedStyleSheet((colors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.page,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 18,
  },
  summaryCard: {
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: {
    fontSize: 10,
    lineHeight: 13,
    color: colors.muted,
    letterSpacing: 1.2,
    fontWeight: "700",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    fontWeight: "800",
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.success,
  },
  summaryBadgeText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.successText,
    fontWeight: "700",
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    gap: 3,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
    fontWeight: "800",
  },
  sectionCaption: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
  card: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  iconPrimary: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSecondary: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDanger: {
    backgroundColor: colors.danger,
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    fontWeight: "700",
    marginBottom: 2,
  },
  rowDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },

  // Booking Defaults styling
  prefSelectorRow: {
    padding: 16,
    gap: 10,
  },
  prefLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.muted,
  },
  chipGroup: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  prefChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  prefChipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  prefChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSoft,
  },
  prefChipTextActive: {
    color: colors.background,
    fontWeight: "700",
  },

  // Modals Styling
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    color: colors.text,
    fontWeight: "800",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 10,
  },
  inputShell: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceSoft,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: colors.muted,
    marginBottom: 6,
  },
  inputField: {
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  modalBtnCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSoft,
  },
  modalBtnSave: {
    backgroundColor: colors.text,
  },
  modalBtnSaveText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.background,
  },

  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  sessionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionDeviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  currentDeviceBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentDeviceBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.successText,
  },
  sessionSubtext: {
    fontSize: 12,
    color: colors.textSoft,
  },
  sessionTimeText: {
    fontSize: 10,
    color: colors.muted,
  },
  revokeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceSoft,
  },
  revokeBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.danger,
  },

  // FAQ Modal
  faqModalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  faqContainer: {
    height: "80%",
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    backgroundColor: colors.page,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.borderSoft,
  },
  faqHeaderTitle: {
    fontSize: 20,
    color: colors.text,
    fontWeight: "800",
  },
  faqCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  faqScroll: {
    padding: 20,
    gap: 16,
  },
  faqCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  faqAnswer: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSoft,
  },
  desktopLayoutRow: {
    flexDirection: "row",
    gap: 24,
    width: "100%",
    alignItems: "flex-start",
  },
  desktopColumnLeft: {
    flex: 1,
    gap: 18,
  },
  desktopColumnRight: {
    flex: 1,
    gap: 18,
  },
}));
