import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";

const PROFILE_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAtvP2yhWDyZzMmfqZm-64GbAQU1leygJR4XvWNEjNG-Y8v081n1CW6IT037D9o6EKGbW_KzlgUSeCaCsuls8kaOf3CWCfDCpuRg8mTqgE-TvlTlJ199VKcyl-HIuK5JNRGgRMDI0MCL7rrfrId46EMJzwDzPgyJ6MBXm5NL-UpL9rSHD-IMzKPu2uHWDcsyttzykYhj97m06K2Ih3V4L9cOmmEglnPOpkQSsXlM-Q66XRa4f4pJiywM7snw8CbQmvG5e7G8ASXoJA";

function SectionHeader({ title, caption }: { title: string; caption?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Pressable style={styles.detailRow} variant="card">
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, accent ? { color: accent } : null]}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
    </Pressable>
  );
}

export default function AccountScreen() {
  const { horizontalPadding, screenBottomPadding } = useResponsiveLayout();

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
              <AppImage source={{ uri: PROFILE_IMAGE }} style={styles.avatarImage} />
            </View>
            <View style={styles.photoCopy}>
              <Text style={styles.photoTitle}>Profile Photo</Text>
              <Text style={styles.photoSubtitle}>
                Visible across bookings, reviews, and your GolfTee profile.
              </Text>
              <View style={styles.photoButtons}>
                <Pressable style={styles.primaryAction} variant="cta">
                  <Ionicons name="image-outline" size={16} color={theme.colors.surface} />
                  <Text style={styles.primaryActionText}>Upload New</Text>
                </Pressable>
                <Pressable style={styles.secondaryAction} variant="button">
                  <Text style={styles.secondaryActionText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.profileMetaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillLabel}>PLAN</Text>
              <Text style={styles.metaPillValue}>Gold Member</Text>
            </View>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillLabel}>MEMBER ID</Text>
              <Text style={styles.metaPillValue}>GT-20481</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Personal Details" caption="Update how your profile appears." />
          <View style={styles.card}>
            <DetailRow icon="person-outline" label="Full name" value="Julian Sterling" />
            <DetailRow icon="mail-outline" label="Email" value="julian.sterling@golftee.com" />
            <DetailRow icon="call-outline" label="Phone" value="+1 (408) 555-0138" />
            <DetailRow icon="location-outline" label="Home club" value="Pebble Dunes Golf Club" />
            <DetailRow icon="golf-outline" label="Handicap" value="12.4" />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Membership & Security" caption="Manage plan, sign-in, and account access." />
          <View style={styles.card}>
            <DetailRow icon="sparkles-outline" label="Membership tier" value="Gold" />
            <DetailRow icon="calendar-outline" label="Renewal date" value="May 12, 2026" />
            <DetailRow icon="shield-checkmark-outline" label="2-step verification" value="Enabled" accent={theme.colors.successText} />
            <DetailRow icon="key-outline" label="Password" value="Last changed 43 days ago" />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Billing" caption="Cards, invoices, and active subscription details." />
          <View style={styles.card}>
            <DetailRow icon="card-outline" label="Primary card" value="Visa ending in 2048" />
            <DetailRow icon="receipt-outline" label="Billing cycle" value="Renews on May 12" />
            <DetailRow icon="document-text-outline" label="Latest invoice" value="Paid on Apr 01, 2026" />
          </View>
        </View>

        <View style={styles.footerActions}>
          <Pressable style={styles.primaryButton} variant="cta">
            <Text style={styles.primaryButtonText}>Save Account Changes</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} variant="button">
            <Text style={styles.secondaryButtonText}>Download Statement</Text>
          </Pressable>
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
    height: 38,
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
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSoft,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCopy: {
    flex: 1,
  },
  detailLabel: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: theme.colors.textSoft,
    letterSpacing: 1.1,
    fontWeight: "700",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.text,
    fontWeight: "600",
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
  footerActions: {
    gap: 10,
  },
  secondaryButton: {
    height: 52,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
});
