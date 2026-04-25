import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { refreshProfile, updateProfile, useAuthSession } from "../components/auth";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";

const PROFILE_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAtvP2yhWDyZzMmfqZm-64GbAQU1leygJR4XvWNEjNG-Y8v081n1CW6IT037D9o6EKGbW_KzlgUSeCaCsuls8kaOf3CWCfDCpuRg8mTqgE-TvlTlJ199VKcyl-HIuK5JNRGgRMDI0MCL7rrfrId46EMJzwDzPgyJ6MBXm5NL-UpL9rSHD-IMzKPu2uHWDcsyttzykYhj97m06K2Ih3V4L9cOmmEglnPOpkQSsXlM-Q66XRa4f4pJiywM7snw8CbQmvG5e7G8ASXoJA";

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "decimal-pad";
  editable?: boolean;
}) {
  return (
    <View style={[styles.inputShell, !editable && styles.inputShellDisabled]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        style={styles.inputField}
        keyboardType={keyboardType}
        autoCapitalize="words"
        autoCorrect={false}
        editable={editable}
      />
    </View>
  );
}

export default function AccountScreen() {
  const auth = useAuthSession();
  const { horizontalPadding, screenBottomPadding } = useResponsiveLayout();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [homeClub, setHomeClub] = useState("");
  const [handicap, setHandicap] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setFullName(auth.profile?.full_name ?? "");
    setUsername(auth.profile?.username ?? "");
    setPhone(auth.profile?.phone ?? "");
    setHomeClub(auth.profile?.home_club ?? "");
    setHandicap(auth.profile?.handicap != null ? auth.profile.handicap.toFixed(1) : "");
  }, [auth.profile]);

  const avatarSource = auth.profile?.avatar_url || PROFILE_IMAGE;
  const membershipTier = auth.profile?.membership_tier ?? "Free";
  const memberId = auth.session?.user.id.slice(0, 8).toUpperCase() ?? "PENDING";
  const memberSince = auth.profile?.member_since
    ? new Date(auth.profile.member_since).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Pending";

  const handleRefresh = async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setStatusMessage(null);

    try {
      await refreshProfile();
      setStatusMessage("Profile synced from Supabase.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to refresh your profile.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    if (!username.trim()) {
      setStatusMessage("Username is required.");
      return;
    }

    if (handicap.trim() && Number.isNaN(Number(handicap))) {
      setStatusMessage("Handicap must be a valid number.");
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      await updateProfile({
        full_name: fullName.trim() || null,
        username: username.trim().toLowerCase(),
        phone: phone.trim() || null,
        home_club: homeClub.trim() || null,
        handicap: handicap.trim() ? Number(handicap) : null,
      });
      setStatusMessage("Account changes saved securely.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: Math.max(screenBottomPadding - 30, 120) },
        ]}
        bounces={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.profileCard}>
          <View style={styles.photoRow}>
            <View style={styles.avatarWrap}>
              <AppImage source={{ uri: avatarSource }} style={styles.avatarImage} />
            </View>
            <View style={styles.photoCopy}>
              <Text style={styles.photoTitle}>Account Profile</Text>
              <Text style={styles.photoSubtitle}>
                Auth and profile data are now backed by Supabase with row-level security.
              </Text>
              <View style={styles.photoButtons}>
                <Pressable style={styles.primaryAction} onPress={() => void handleRefresh()} variant="cta">
                  {isRefreshing ? (
                    <ActivityIndicator size="small" color={theme.colors.surface} />
                  ) : (
                    <Ionicons name="refresh-outline" size={16} color={theme.colors.surface} />
                  )}
                  <Text style={styles.primaryActionText}>{isRefreshing ? "Syncing..." : "Sync Profile"}</Text>
                </Pressable>
                <View style={styles.secondaryAction}>
                  <Text style={styles.secondaryActionText}>Avatar upload next phase</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.profileMetaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillLabel}>PLAN</Text>
              <Text style={styles.metaPillValue}>{membershipTier}</Text>
            </View>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillLabel}>MEMBER ID</Text>
              <Text style={styles.metaPillValue}>GT-{memberId}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <Text style={styles.sectionCaption}>These values come from your Supabase-backed profile.</Text>
          <View style={styles.card}>
            <Field
              label="FULL NAME"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
            />
            <Field
              label="USERNAME"
              value={username}
              onChangeText={setUsername}
              placeholder="Choose a username"
            />
            <Field
              label="EMAIL"
              value={auth.session?.user.email ?? ""}
              placeholder="Email address"
              keyboardType="email-address"
              editable={false}
            />
            <Field
              label="PHONE"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 555 555 5555"
              keyboardType="phone-pad"
            />
            <Field
              label="HOME CLUB"
              value={homeClub}
              onChangeText={setHomeClub}
              placeholder="Your regular course"
            />
            <Field
              label="HANDICAP"
              value={handicap}
              onChangeText={setHandicap}
              placeholder="e.g. 12.4"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security & Membership</Text>
          <Text style={styles.sectionCaption}>The free plan is enough for email auth and this profile model.</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>EMAIL VERIFICATION</Text>
              <Text style={styles.detailValue}>
                {auth.session?.user.email_confirmed_at ? "Verified" : "Verification pending"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>MEMBER SINCE</Text>
              <Text style={styles.detailValue}>{memberSince}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>CURRENT TIER</Text>
              <Text style={styles.detailValue}>{membershipTier}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>PROFILE LOAD STATUS</Text>
              <Text style={styles.detailValue}>
                {auth.profileLoading ? "Loading..." : auth.profile ? "Healthy" : "Profile pending"}
              </Text>
            </View>
          </View>
        </View>

        {statusMessage ? (
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.noticeText}>{statusMessage}</Text>
          </View>
        ) : null}

        {!statusMessage && auth.profileError ? (
          <View style={styles.noticeCard}>
            <Ionicons name="warning-outline" size={18} color={theme.colors.danger} />
            <Text style={styles.noticeText}>{auth.profileError}</Text>
          </View>
        ) : null}

        <View style={styles.footerActions}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => void handleSave()}
            disabled={isSaving || auth.profileLoading}
            variant="cta"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>Save Account Changes</Text>
            )}
          </Pressable>
          <View style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Billing is intentionally deferred until paid features are needed.</Text>
          </View>
        </View>
      </ScrollView>
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
  profileCard: {
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 14,
  },
  photoRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: "hidden",
    backgroundColor: theme.colors.primarySoft,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  photoCopy: {
    flex: 1,
  },
  photoTitle: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
    marginBottom: 4,
  },
  photoSubtitle: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.textSoft,
    marginBottom: 12,
  },
  photoButtons: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  primaryAction: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  primaryActionText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.surface,
    fontWeight: "700",
  },
  secondaryAction: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
  },
  secondaryActionText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  profileMetaRow: {
    flexDirection: "row",
    gap: 10,
  },
  metaPill: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaPillLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textSoft,
    letterSpacing: 1.2,
    fontWeight: "700",
    marginBottom: 4,
  },
  metaPillValue: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  section: {
    gap: 10,
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
    padding: 14,
    gap: 12,
  },
  inputShell: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  inputShellDisabled: {
    backgroundColor: theme.colors.surfaceSoft,
  },
  inputLabel: {
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: theme.colors.textSoft,
    marginBottom: 8,
  },
  inputField: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  detailRow: {
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  detailLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textSoft,
    letterSpacing: 1.1,
    fontWeight: "700",
  },
  detailValue: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  noticeCard: {
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.text,
    fontWeight: "600",
  },
  footerActions: {
    gap: 10,
  },
  primaryButton: {
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.surface,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
    textAlign: "center",
  },
});
