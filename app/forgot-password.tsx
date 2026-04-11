import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value.trim());
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { horizontalPadding, screenBottomPadding } = useResponsiveLayout();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetSent, setIsResetSent] = useState(false);

  const title = isResetSent ? "Check Email" : "Forgot Password";
  const heroEyebrow = isResetSent ? "CHECK YOUR EMAIL" : "PASSWORD RECOVERY";
  const heroSubtitle = isResetSent
    ? `If an account exists for ${email.trim()}, reset instructions are on the way.`
    : "Enter the email linked to your GolfTee account and we will send you a secure reset link.";

  const handleSendResetLink = async () => {
    if (isSubmitting) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await Promise.resolve();
      setEmail(trimmedEmail);
      setIsResetSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTryAnotherEmail = () => {
    setIsResetSent(false);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <View style={styles.authTopBar}>
        <Pressable style={styles.authBackButton} onPress={() => router.replace("/login")} variant="icon">
          <Ionicons name="arrow-back" size={22} color={theme.colors.primary} />
        </Pressable>
        <Text style={styles.authTopTitle}>{title}</Text>
        <View style={styles.authTopSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingHorizontal: horizontalPadding, paddingBottom: Math.max(screenBottomPadding - 8, 120) },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustKeyboardInsets={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>{heroEyebrow}</Text>
          <Text style={styles.subtitle}>{heroSubtitle}</Text>
        </View>

        <View style={styles.panel}>
          {!isResetSent ? (
            <>
              <View style={styles.infoCard}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name="mail-open-outline" size={18} color={theme.colors.primary} />
                </View>
                <Text style={styles.infoText}>
                  We will send reset instructions to the email used for your GolfTee account.
                </Text>
              </View>

              <View style={styles.inputShell}>
                <Text style={[styles.inputLabel, error && styles.inputLabelError]}>EMAIL ADDRESS</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={18} color={theme.colors.muted} />
                  <TextInput
                    placeholder="name@example.com"
                    placeholderTextColor={theme.colors.muted}
                    style={[styles.inputField, error && styles.inputFieldError]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (error) {
                        setError(null);
                      }
                    }}
                  />
                </View>
              </View>

              {error ? (
                <View style={styles.errorRow}>
                  <View style={styles.errorDot} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={styles.primaryButton}
                onPress={() => void handleSendResetLink()}
                disabled={isSubmitting}
                variant="cta"
              >
                <Text style={styles.primaryButtonText}>
                  {isSubmitting ? "Sending Link..." : "Send Reset Link"}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={theme.colors.surface} />
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.successCard}>
                <View style={styles.successIconWrap}>
                  <Ionicons name="checkmark-circle" size={28} color={theme.colors.successText} />
                </View>
                <Text style={styles.successTitle}>Reset Instructions Sent</Text>
                <Text style={styles.successText}>
                  If your email is registered, you will receive a password reset link shortly.
                </Text>
                <View style={styles.successMeta}>
                  <Text style={styles.successMetaLabel}>EMAIL</Text>
                  <Text style={styles.successMetaValue}>{email}</Text>
                </View>
              </View>

              <Pressable style={styles.primaryButton} onPress={() => router.replace("/login")} variant="cta">
                <Text style={styles.primaryButtonText}>Back to Login</Text>
                <Ionicons name="arrow-forward" size={20} color={theme.colors.surface} />
              </Pressable>

              <Pressable style={styles.secondaryButton} onPress={handleTryAnotherEmail} variant="button">
                <Text style={styles.secondaryButtonText}>Use Another Email</Text>
              </Pressable>
            </>
          )}
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
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 72,
  },
  authTopBar: {
    height: 48,
    marginHorizontal: 24,
    marginTop: 2,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  authBackButton: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  authTopTitle: {
    fontSize: theme.typography.h4.fontSize,
    lineHeight: theme.typography.h4.lineHeight,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  authTopSpacer: {
    width: 34,
    height: 34,
  },
  heroCard: {
    borderRadius: 28,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 22,
    marginBottom: 20,
    gap: 10,
  },
  eyebrow: {
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: theme.colors.text,
  },
  subtitle: {
    maxWidth: "92%",
    fontSize: theme.typography.body.fontSize,
    lineHeight: 22,
    color: theme.colors.textSoft,
  },
  panel: {
    gap: 14,
  },
  infoCard: {
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    flexShrink: 0,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight + 2,
    color: theme.colors.textSoft,
  },
  inputShell: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputLabel: {
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: theme.colors.textSoft,
    marginBottom: 8,
  },
  inputLabelError: {
    color: theme.colors.danger,
  },
  inputField: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  inputFieldError: {
    color: theme.colors.danger,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -2,
  },
  errorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.danger,
  },
  errorText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.danger,
    fontWeight: "600",
  },
  primaryButton: {
    height: 58,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.textOnPrimary,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryButton: {
    height: 54,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  successCard: {
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: "center",
    gap: 10,
  },
  successIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.success,
  },
  successTitle: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  successText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight + 2,
    color: theme.colors.textSoft,
    textAlign: "center",
  },
  successMeta: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  successMetaLabel: {
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    color: theme.colors.textSoft,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  successMetaValue: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.text,
    fontWeight: "700",
  },
});
