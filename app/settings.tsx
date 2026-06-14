import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";
import { signOut } from "../components/auth";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";

function SectionHeader({ title, caption }: { title: string; caption?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { horizontalPadding, screenBottomPadding } = useResponsiveLayout();

  // Settings State
  const [bookingAlerts, setBookingAlerts] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);
  const [defaultPlayers, setDefaultPlayers] = useState(1);
  const [defaultPayment, setDefaultPayment] = useState<"wallet" | "card">("wallet");

  // Modals state
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  const [isFaqModalVisible, setIsFaqModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
        if (payVal === "wallet" || payVal === "card") setDefaultPayment(payVal);
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

  const handleSelectDefaultPayment = async (method: "wallet" | "card") => {
    setDefaultPayment(method);
    await AsyncStorage.setItem("golftee:settings:default_payment", method);
  };

  // Change Password
  const handleUpdatePassword = async () => {
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
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordStatus("Password updated securely!");
      setTimeout(() => {
        setIsPasswordModalVisible(false);
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

  // Sign out
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut();
      router.replace("/splash");
    } catch {
      Alert.alert("Logout Failed", "Unable to log out right now.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: Math.max(screenBottomPadding - 20, 120) },
        ]}
        bounces={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
      >
        {/* Sync Summary */}
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>PREFERENCES</Text>
            <Text style={styles.summaryValue}>Preferences Saved</Text>
          </View>
          <View style={styles.summaryBadge}>
            <Ionicons name="shield-checkmark" size={16} color={theme.colors.successText} />
            <Text style={styles.summaryBadgeText}>Encrypted</Text>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <SectionHeader title="Notifications" caption="Control device reminder triggers." />
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconPrimary}>
                <Ionicons name="notifications-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>Booking Alerts</Text>
                <Text style={styles.rowDescription}>Reminders 24h, 12h, and 2h before rounds.</Text>
              </View>
              <Switch
                value={bookingAlerts}
                onValueChange={handleToggleBookingAlerts}
                trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.iconPrimary}>
                <Ionicons name="megaphone-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>System Notifications</Text>
                <Text style={styles.rowDescription}>In-app confirmations and profile change logs.</Text>
              </View>
              <Switch
                value={systemAlerts}
                onValueChange={handleToggleSystemAlerts}
                trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
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

            <View style={[styles.prefSelectorRow, { borderTopWidth: 1, borderColor: theme.colors.borderSoft }]}>
              <Text style={styles.prefLabel}>PREFERRED PAYMENT</Text>
              <View style={styles.chipGroup}>
                {(["wallet", "card"] as const).map((method) => {
                  const active = defaultPayment === method;
                  return (
                    <Pressable
                      key={method}
                      style={[styles.prefChip, active && styles.prefChipActive]}
                      onPress={() => void handleSelectDefaultPayment(method)}
                      variant="chip"
                    >
                      <Text style={[styles.prefChipText, active && styles.prefChipTextActive]}>
                        {method === "wallet" ? "Digital Wallet" : "Card"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
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
                <Ionicons name="key-outline" size={18} color={theme.colors.accentWarm} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>Change Password</Text>
                <Text style={styles.rowDescription}>Update Supabase password securely.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
            </Pressable>

            <Pressable
              style={styles.row}
              onPress={() => setIsFaqModalVisible(true)}
              variant="card"
            >
              <View style={styles.iconSecondary}>
                <Ionicons name="help-circle-outline" size={18} color={theme.colors.accentWarm} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>FAQs & Information</Text>
                <Text style={styles.rowDescription}>Booking rules & cancellation policies.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
            </Pressable>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <SectionHeader title="Danger Zone" />
          <View style={styles.card}>
            <Pressable
              style={styles.row}
              onPress={() => void handleLogout()}
              variant="card"
            >
              <View style={[styles.iconSecondary, styles.iconDanger]}>
                <Ionicons name="log-out-outline" size={18} color={theme.colors.surface} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>Log Out Account</Text>
                <Text style={styles.rowDescription}>Securely sign out of current session.</Text>
              </View>
              {isLoggingOut ? <ActivityIndicator size="small" color={theme.colors.danger} /> : null}
            </Pressable>
          </View>
        </View>
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
              <Text style={styles.inputLabel}>NEW PASSWORD</Text>
              <TextInput
                secureTextEntry
                style={styles.inputField}
                placeholder="Minimum 6 characters"
                placeholderTextColor={theme.colors.muted}
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
                placeholderTextColor={theme.colors.muted}
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
                  <ActivityIndicator size="small" color={theme.colors.surface} />
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
                <Ionicons name="close" size={24} color={theme.colors.primary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.faqScroll} showsVerticalScrollIndicator={false}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.page,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 18,
  },
  summaryCard: {
    borderRadius: 20,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textSoft,
    letterSpacing: 1.2,
    fontWeight: "700",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.success,
  },
  summaryBadgeText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.successText,
    fontWeight: "700",
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    gap: 3,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  sectionCaption: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
  },
  card: {
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSoft,
  },
  iconPrimary: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSecondary: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDanger: {
    backgroundColor: theme.colors.danger,
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.text,
    fontWeight: "700",
    marginBottom: 2,
  },
  rowDescription: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
  },

  // Booking Defaults styling
  prefSelectorRow: {
    padding: 16,
    gap: 10,
  },
  prefLabel: {
    fontSize: theme.typography.label.fontSize,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: theme.colors.textSoft,
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
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
  },
  prefChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  prefChipText: {
    fontSize: theme.typography.bodySm.fontSize,
    fontWeight: "600",
    color: theme.colors.textSoft,
  },
  prefChipTextActive: {
    color: theme.colors.surface,
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
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 16,
  },
  modalTitle: {
    fontSize: theme.typography.h3.fontSize,
    color: theme.colors.primary,
    fontWeight: "800",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: theme.typography.bodySm.fontSize,
    color: theme.colors.textSoft,
    textAlign: "center",
    marginBottom: 10,
  },
  inputShell: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surfaceSoft,
  },
  inputLabel: {
    fontSize: theme.typography.label.fontSize,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: theme.colors.textSoft,
    marginBottom: 6,
  },
  inputField: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  statusText: {
    fontSize: theme.typography.bodySm.fontSize,
    fontWeight: "600",
    color: theme.colors.primary,
    textAlign: "center",
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
  },
  modalBtnCancelText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: "700",
    color: theme.colors.textSoft,
  },
  modalBtnSave: {
    backgroundColor: theme.colors.primary,
  },
  modalBtnSaveText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: "700",
    color: theme.colors.surface,
  },

  // FAQ Modal
  faqModalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  faqContainer: {
    height: "80%",
    backgroundColor: theme.colors.page,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  faqHeaderTitle: {
    fontSize: theme.typography.h3.fontSize,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  faqCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  faqScroll: {
    padding: 20,
    gap: 16,
  },
  faqCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 8,
  },
  faqQuestion: {
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  faqAnswer: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight + 2,
    color: theme.colors.textSoft,
  },
});
