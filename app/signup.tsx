import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  Linking,
} from "react-native";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAuthConfigurationError, signUpWithEmail, resendVerificationEmail } from "../components/auth";
import { theme } from "../components/theme";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [handicap, setHandicap] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const [countdown, setCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  const isCompactScreen = width < 360;
  const isTabletLike = width >= 768;
  const supabaseConfigurationError = getAuthConfigurationError();
  const horizontalPadding = isTabletLike ? Math.max((width - 500) / 2, 24) : isCompactScreen ? 16 : 24;
  const contentMaxWidth = isTabletLike ? 500 : "100%";

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSignup = async () => {
    if (isSubmitting) {
      return;
    }

    setAuthNotice(null);
    const nextErrors: Record<string, boolean> = {};

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();
    const trimmedHandicap = handicap.trim();

    if (!trimmedUsername) {
      nextErrors.username = true;
    }
    if (!trimmedEmail) {
      nextErrors.email = true;
    }
    if (!trimmedPassword) {
      nextErrors.password = true;
    }
    if (!trimmedConfirm) {
      nextErrors.confirmPassword = true;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setAuthNotice("Please fill in all required fields.");
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrors({ email: true });
      setAuthNotice("Please enter a valid email address.");
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrors({ password: true });
      setAuthNotice("Password must be at least 6 characters.");
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      setErrors({ password: true, confirmPassword: true });
      setAuthNotice("Passwords do not match.");
      return;
    }

    if (trimmedHandicap && Number.isNaN(Number(trimmedHandicap))) {
      setErrors({ handicap: true });
      setAuthNotice("Please enter a valid numeric handicap value.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signUpWithEmail({
        email: trimmedEmail,
        password: trimmedPassword,
        username: trimmedUsername,
        handicap: trimmedHandicap ? Number(trimmedHandicap) : null,
      });

      if (result.requiresEmailVerification) {
        setIsVerificationSent(true);
        setCountdown(60);
      } else {
        router.replace("/home");
      }
    } catch (error) {
      setAuthNotice(error instanceof Error ? error.message : "Unable to register. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEmailApp = async () => {
    try {
      await Linking.openURL("mailto:");
    } catch {
      setResendStatus({
        type: "error",
        message: "Could not open default email app. Please open it manually.",
      });
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      await resendVerificationEmail(email);
      setCountdown(60);
      setResendStatus({
        type: "success",
        message: "Verification email resent successfully!",
      });
    } catch (err) {
      setResendStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to resend verification email.",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleEditDetails = () => {
    setIsVerificationSent(false);
    setResendStatus(null);
  };

  const feedbackMessage = supabaseConfigurationError ?? authNotice;

  if (isVerificationSent) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <View style={styles.successContainer}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.successScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.successCard}>
              <View style={styles.successIconWrap}>
                <Ionicons name="mail-unread-outline" size={36} color={theme.colors.successText} />
              </View>
              <Text style={styles.successTitle}>Verify Email</Text>
              
              <Text style={styles.successText}>
                {"We've sent a verification link to:"}
              </Text>
              
              <View style={styles.emailBadge}>
                <Text style={styles.emailBadgeText}>{email.trim().toLowerCase()}</Text>
              </View>

              <Text style={styles.successHint}>
                Please check your inbox and tap the link to activate your GolfTee account.
              </Text>

              {resendStatus && (
                <View style={[
                  styles.resendStatusRow,
                  resendStatus.type === "success" ? styles.resendStatusSuccess : styles.resendStatusError
                ]}>
                  <Ionicons 
                    name={resendStatus.type === "success" ? "checkmark-circle-outline" : "alert-circle-outline"} 
                    size={16} 
                    color={resendStatus.type === "success" ? theme.colors.successText : theme.colors.danger} 
                  />
                  <Text style={[
                    styles.resendStatusText,
                    resendStatus.type === "success" ? styles.resendStatusTextSuccess : styles.resendStatusTextError
                  ]}>
                    {resendStatus.message}
                  </Text>
                </View>
              )}

              <View style={styles.actionGroup}>
                <Pressable 
                  style={styles.ctaButton} 
                  onPress={handleOpenEmailApp} 
                  variant="cta"
                >
                  <Ionicons name="mail" size={20} color={theme.colors.surface} />
                  <Text style={styles.ctaButtonText}>Open Email App</Text>
                </Pressable>

                <Pressable 
                  style={[
                    styles.secondaryButton, 
                    (countdown > 0 || isResending) && styles.disabledButton
                  ]} 
                  onPress={handleResend}
                  disabled={countdown > 0 || isResending}
                  variant="button"
                >
                  {isResending ? (
                    <Text style={styles.secondaryButtonText}>Resending...</Text>
                  ) : countdown > 0 ? (
                    <Text style={styles.secondaryButtonText}>Resend Email ({countdown}s)</Text>
                  ) : (
                    <>
                      <Ionicons name="refresh" size={18} color={theme.colors.primary} />
                      <Text style={styles.secondaryButtonText}>Resend Email</Text>
                    </>
                  )}
                </Pressable>

                <Pressable 
                  style={styles.textButton} 
                  onPress={handleEditDetails}
                  variant="chip"
                >
                  <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.textButtonText}>Change Email / Edit Details</Text>
                </Pressable>
              </View>

              {/* Troubleshooting Accordion */}
              <View style={styles.accordionContainer}>
                <Pressable 
                  style={styles.accordionHeader} 
                  onPress={() => setShowTroubleshoot(!showTroubleshoot)}
                  variant="chip"
                >
                  <Text style={styles.accordionHeaderText}>{"Didn't receive the email?"}</Text>
                  <Ionicons 
                    name={showTroubleshoot ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color={theme.colors.textSoft} 
                  />
                </Pressable>

                {showTroubleshoot && (
                  <View style={styles.accordionContent}>
                    <View style={styles.troubleItem}>
                      <View style={styles.troubleBullet} />
                      <Text style={styles.troubleText}>Check your **Spam**, **Junk**, or **Promotions** folder.</Text>
                    </View>
                    <View style={styles.troubleItem}>
                      <View style={styles.troubleBullet} />
                      <Text style={styles.troubleText}>Make sure your internet connection is active and stable.</Text>
                    </View>
                    <View style={styles.troubleItem}>
                      <View style={styles.troubleBullet} />
                      <Text style={styles.troubleText}>Verify that the email listed above is spelled correctly.</Text>
                    </View>
                    <View style={styles.troubleItem}>
                      <View style={styles.troubleBullet} />
                      <Text style={styles.troubleText}>Wait a couple of minutes; sometimes delivery can be delayed.</Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.divider} />

              <Pressable 
                style={styles.backToLoginButton} 
                onPress={() => router.replace("/login")} 
                variant="button"
              >
                <Ionicons name="arrow-back" size={18} color={theme.colors.primary} />
                <Text style={styles.backToLoginText}>Return to Login</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <View style={styles.authTopBar}>
        <Pressable style={styles.authBackButton} onPress={() => router.replace("/login")} variant="icon">
          <Ionicons name="arrow-back" size={22} color={theme.colors.primary} />
        </Pressable>
        <Text style={styles.authTopTitle}>Create Account</Text>
        <View style={styles.authTopSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingHorizontal: horizontalPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustKeyboardInsets={false}
      >
        <View style={[styles.mainLayout, { maxWidth: contentMaxWidth }]}>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>GET STARTED</Text>
            <Text style={[styles.subtitle, isCompactScreen && styles.subtitleCompact]}>
              Create a free account to book tee times, track statistics, and find your favorite golf courses.
            </Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.formGroup}>
              {/* Username Input */}
              <View style={[styles.inputShell, errors.username && styles.inputShellError]}>
                <Text style={[styles.inputLabel, errors.username && styles.inputLabelError]}>
                  USERNAME
                </Text>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={18} color={errors.username ? theme.colors.danger : theme.colors.muted} />
                  <TextInput
                    placeholder="Choose a username"
                    placeholderTextColor={theme.colors.muted}
                    style={[styles.inputField, errors.username && styles.inputFieldError]}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={username}
                    onChangeText={(text) => {
                      setUsername(text);
                      clearError("username");
                      if (authNotice) setAuthNotice(null);
                    }}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={[styles.inputShell, errors.email && styles.inputShellError]}>
                <Text style={[styles.inputLabel, errors.email && styles.inputLabelError]}>
                  EMAIL ADDRESS
                </Text>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={18} color={errors.email ? theme.colors.danger : theme.colors.muted} />
                  <TextInput
                    placeholder="name@example.com"
                    placeholderTextColor={theme.colors.muted}
                    style={[styles.inputField, errors.email && styles.inputFieldError]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      clearError("email");
                      if (authNotice) setAuthNotice(null);
                    }}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={[styles.inputShell, errors.password && styles.inputShellError]}>
                <Text style={[styles.inputLabel, errors.password && styles.inputLabelError]}>
                  PASSWORD
                </Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={errors.password ? theme.colors.danger : theme.colors.muted} />
                  <TextInput
                    placeholder="Create a password"
                    placeholderTextColor={theme.colors.muted}
                    style={[styles.inputField, errors.password && styles.inputFieldError]}
                    secureTextEntry
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      clearError("password");
                      if (authNotice) setAuthNotice(null);
                    }}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={[styles.inputShell, errors.confirmPassword && styles.inputShellError]}>
                <Text style={[styles.inputLabel, errors.confirmPassword && styles.inputLabelError]}>
                  CONFIRM PASSWORD
                </Text>
                <View style={styles.inputRow}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={errors.confirmPassword ? theme.colors.danger : theme.colors.muted} />
                  <TextInput
                    placeholder="Re-enter your password"
                    placeholderTextColor={theme.colors.muted}
                    style={[styles.inputField, errors.confirmPassword && styles.inputFieldError]}
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      clearError("confirmPassword");
                      if (authNotice) setAuthNotice(null);
                    }}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* Handicap Input (Optional) */}
              <View style={[styles.inputShell, errors.handicap && styles.inputShellError]}>
                <Text style={[styles.inputLabel, errors.handicap && styles.inputLabelError]}>
                  HANDICAP (OPTIONAL)
                </Text>
                <View style={styles.inputRow}>
                  <Ionicons name="golf-outline" size={18} color={errors.handicap ? theme.colors.danger : theme.colors.muted} />
                  <TextInput
                    placeholder="e.g. 12.4"
                    placeholderTextColor={theme.colors.muted}
                    style={[styles.inputField, errors.handicap && styles.inputFieldError]}
                    keyboardType="decimal-pad"
                    value={handicap}
                    onChangeText={(text) => {
                      setHandicap(text);
                      clearError("handicap");
                      if (authNotice) setAuthNotice(null);
                    }}
                    editable={!isSubmitting}
                  />
                </View>
              </View>
            </View>

            {feedbackMessage ? (
              <View style={styles.errorRow}>
                <View style={styles.errorDot} />
                <Text style={styles.errorText}>{feedbackMessage}</Text>
              </View>
            ) : null}

            <Pressable
              style={styles.signupButton}
              onPress={() => void handleSignup()}
              disabled={isSubmitting || Boolean(supabaseConfigurationError)}
              variant="cta"
            >
              <Text style={styles.signupButtonText}>
                {isSubmitting ? "Creating Account..." : "Create GolfTee Account"}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={theme.colors.surface} />
            </Pressable>

            {/* Separator to login */}
            <View style={styles.loginPrompt}>
              <Text style={styles.loginPromptText}>Already have an account? </Text>
              <Pressable onPress={() => router.replace("/login")} variant="chip" disabled={isSubmitting}>
                <Text style={styles.loginLinkText}>Log In</Text>
              </Pressable>
            </View>
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
  scroll: {
    flex: 1,
  },
  contentContainer: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 48,
  },
  mainLayout: {
    width: "100%",
  },
  authTopBar: {
    height: 48,
    paddingHorizontal: 24,
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
    paddingBottom: 20,
    marginBottom: 18,
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
    fontWeight: "400",
    color: theme.colors.textSoft,
  },
  subtitleCompact: {
    maxWidth: "100%",
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.body.fontSize + 6,
  },
  panel: {
    borderRadius: 28,
  },
  formGroup: {
    gap: 14,
    marginBottom: 20,
  },
  inputShell: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: theme.colors.surface,
  },
  inputShellError: {
    borderColor: theme.colors.danger,
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
    borderRadius: 14,
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginTop: -4,
    marginBottom: 18,
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
  signupButton: {
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
  signupButtonText: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.textOnPrimary,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  loginPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  loginPromptText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSoft,
  },
  loginLinkText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  successContainer: {
    flex: 1,
    backgroundColor: theme.colors.page,
  },
  successScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  successCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 24,
    paddingVertical: 36,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: theme.typography.displayS.fontSize,
    lineHeight: theme.typography.displayS.lineHeight,
    fontWeight: "800",
    color: theme.colors.primary,
    marginBottom: 8,
  },
  successText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: 20,
    color: theme.colors.textSoft,
    textAlign: "center",
    marginBottom: 10,
  },
  emailBadge: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    marginBottom: 14,
  },
  emailBadgeText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  successHint: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: 18,
    color: theme.colors.muted,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  resendStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
    width: "100%",
    justifyContent: "center",
  },
  resendStatusSuccess: {
    backgroundColor: theme.colors.success,
  },
  resendStatusError: {
    backgroundColor: theme.colors.dangerSoft,
  },
  resendStatusText: {
    fontSize: theme.typography.bodySm.fontSize,
    fontWeight: "600",
  },
  resendStatusTextSuccess: {
    color: theme.colors.successText,
  },
  resendStatusTextError: {
    color: theme.colors.danger,
  },
  actionGroup: {
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  ctaButton: {
    height: 52,
    width: "100%",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaButtonText: {
    fontSize: theme.typography.subtitle.fontSize,
    color: theme.colors.textOnPrimary,
    fontWeight: "700",
  },
  secondaryButton: {
    height: 50,
    width: "100%",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: theme.typography.subtitle.fontSize,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
  textButton: {
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  textButtonText: {
    fontSize: theme.typography.bodySm.fontSize,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  accordionContainer: {
    width: "100%",
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
    marginBottom: 24,
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
  },
  accordionHeaderText: {
    fontSize: theme.typography.bodySm.fontSize,
    fontWeight: "700",
    color: theme.colors.textSoft,
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSoft,
    paddingTop: 12,
  },
  troubleItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  troubleBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
  },
  troubleText: {
    flex: 1,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: 16,
    color: theme.colors.textSoft,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderSoft,
    width: "100%",
    marginBottom: 20,
  },
  backToLoginButton: {
    height: 48,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  backToLoginText: {
    fontSize: theme.typography.subtitle.fontSize,
    color: theme.colors.primary,
    fontWeight: "700",
  },
});
