import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";

function SectionHeader({ title, caption }: { title: string; caption?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (nextValue: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.iconPrimary}>
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primary }}
        thumbColor={theme.colors.surface}
      />
    </View>
  );
}

function LinkRow({
  icon,
  label,
  value,
  tone = "accent",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: "accent" | "danger";
}) {
  return (
    <Pressable style={styles.row} variant="card">
      <View style={[styles.iconSecondary, tone === "danger" && styles.iconDanger]}>
        <Ionicons
          name={icon}
          size={18}
          color={tone === "danger" ? theme.colors.surface : theme.colors.accentWarm}
        />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowDescription}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { horizontalPadding, screenBottomPadding } = useResponsiveLayout();
  const [bookingAlerts, setBookingAlerts] = useState(true);
  const [offersEnabled, setOffersEnabled] = useState(false);
  const [pushPreviews, setPushPreviews] = useState(true);
  const [locationAccess, setLocationAccess] = useState(true);
  const [biometricUnlock, setBiometricUnlock] = useState(true);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
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
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>DEVICE SETTINGS</Text>
            <Text style={styles.summaryValue}>5 active preferences</Text>
          </View>
          <View style={styles.summaryBadge}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.successText} />
            <Text style={styles.summaryBadgeText}>Synced</Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Notifications" caption="Control the updates you receive." />
          <View style={styles.card}>
            <ToggleRow
              icon="notifications-outline"
              label="Booking alerts"
              description="Reminders and updates for upcoming tee times."
              value={bookingAlerts}
              onValueChange={setBookingAlerts}
            />
            <ToggleRow
              icon="mail-outline"
              label="Offers and news"
              description="Course deals, promotions, and membership news."
              value={offersEnabled}
              onValueChange={setOffersEnabled}
            />
            <ToggleRow
              icon="phone-portrait-outline"
              label="Push previews"
              description="Show message preview text on the lock screen."
              value={pushPreviews}
              onValueChange={setPushPreviews}
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Privacy & Security" caption="Manage access and sign-in behavior." />
          <View style={styles.card}>
            <ToggleRow
              icon="location-outline"
              label="Location access"
              description="Use nearby course recommendations and local tee times."
              value={locationAccess}
              onValueChange={setLocationAccess}
            />
            <ToggleRow
              icon="finger-print-outline"
              label="Biometric unlock"
              description="Use Face ID or fingerprint to reopen the app faster."
              value={biometricUnlock}
              onValueChange={setBiometricUnlock}
            />
            <LinkRow icon="shield-outline" label="Privacy level" value="Friends only" />
            <LinkRow icon="key-outline" label="Change password" value="Last updated 43 days ago" />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Preferences" caption="Regional and in-app defaults." />
          <View style={styles.card}>
            <LinkRow icon="globe-outline" label="Region" value="United States" />
            <LinkRow icon="time-outline" label="Time format" value="12-hour clock" />
            <LinkRow icon="golf-outline" label="Default player count" value="4 players" />
            <LinkRow icon="card-outline" label="Preferred payment method" value="Visa ending in 2048" />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Support" caption="Help and account maintenance." />
          <View style={styles.card}>
            <LinkRow icon="help-circle-outline" label="Help center" value="FAQs and booking support" />
            <LinkRow icon="chatbubble-ellipses-outline" label="Contact support" value="Live chat available" />
            <LinkRow icon="trash-outline" label="Delete account" value="Permanently remove your profile" tone="danger" />
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
});
