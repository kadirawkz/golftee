import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAuthConfigurationError, signInWithEmail } from "../services/auth";
import { createThemedStyleSheet, useThemedStyles, useAppTheme, theme } from "../components/theme";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

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

  const handleLogin = async () => {
    if (isSubmitting) {
      return;
    }

    setAuthNotice(null);
    const nextErrors: Record<string, boolean> = {};

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      nextErrors.email = true;
    }
    if (!trimmedPassword) {
      nextErrors.password = true;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setAuthNotice("Please enter both your email and password.");
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrors({ email: true });
      setAuthNotice("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithEmail({
        email: trimmedEmail,
        password: trimmedPassword,
        rememberMe,
      });
      router.replace("/home");
    } catch (error) {
      setAuthNotice(error instanceof Error ? error.message : "Unable to sign in. Please verify your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedbackMessage = supabaseConfigurationError ?? authNotice;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <View style={styles.authTopBar}>
        <Pressable
          style={styles.authBackButton}
          onPress={() => router.replace("/splash")}
          variant="icon"
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Navigates to the splash screen"
        >
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.authTopTitle}>Sign In</Text>
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
            <Text style={styles.eyebrow}>WELCOME BACK</Text>
            <Text style={[styles.subtitle, isCompactScreen && styles.subtitleCompact]}>
              Sign in to manage tee times, track your handicap, and connect with local golf courses.
            </Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.formGroup}>
              {/* Email Input */}
              <View style={[styles.inputShell, errors.email && styles.inputShellError]}>
                <Text style={[styles.inputLabel, errors.email && styles.inputLabelError]}>
                  EMAIL ADDRESS
                </Text>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={18} color={errors.email ? colors.danger : colors.muted} />
                  <TextInput
                    placeholder="name@example.com"
                    placeholderTextColor={colors.muted}
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
                    accessibilityLabel="Email Address input"
                    accessibilityHint="Enter your email address"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={[styles.inputShell, errors.password && styles.inputShellError]}>
                <Text style={[styles.inputLabel, errors.password && styles.inputLabelError]}>
                  PASSWORD
                </Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={errors.password ? colors.danger : colors.muted} />
                  <TextInput
                    placeholder="Enter your password"
                    placeholderTextColor={colors.muted}
                    style={[styles.inputField, errors.password && styles.inputFieldError]}
                    secureTextEntry
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      clearError("password");
                      if (authNotice) setAuthNotice(null);
                    }}
                    editable={!isSubmitting}
                    accessibilityLabel="Password input"
                    accessibilityHint="Enter your password"
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

            <View style={styles.metaRow}>
              <Pressable
                style={styles.rememberWrap}
                onPress={() => setRememberMe((v) => !v)}
                variant="chip"
                disabled={isSubmitting}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
                accessibilityLabel="Keep me signed in checkbox"
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe ? <Ionicons name="checkmark" size={14} color={colors.surface} /> : null}
                </View>
                <Text style={styles.rememberText}>Keep me signed in</Text>
              </Pressable>

              <Pressable
                onPress={() => router.navigate("/forgot-password")}
                variant="chip"
                disabled={isSubmitting}
                accessibilityRole="link"
                accessibilityLabel="Forgot password link"
                accessibilityHint="Navigates to the forgot password screen"
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.loginButton}
              onPress={() => void handleLogin()}
              disabled={isSubmitting || Boolean(supabaseConfigurationError)}
              variant="cta"
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting }}
              accessibilityLabel={isSubmitting ? "Signing In" : "Login to GolfTee"}
              accessibilityHint="Triggers email authentication login"
            >
              <Text style={styles.loginButtonText}>
                {isSubmitting ? "Signing In..." : "Login to GolfTee"}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.surface} />
            </Pressable>

            {/* Separator to register */}
            <View style={styles.registerPrompt}>
              <Text style={styles.registerPromptText}>{"Don't have an account? "}</Text>
              <Pressable
                onPress={() => router.replace("/signup")}
                variant="chip"
                disabled={isSubmitting}
                accessibilityRole="link"
                accessibilityLabel="Sign Up link"
                accessibilityHint="Navigates to the account signup screen"
              >
                <Text style={styles.registerLinkText}>Sign Up</Text>
              </Pressable>
            </View>

            <View style={styles.socialSection}>
              <View style={styles.socialHeader}>
                <View style={styles.socialDivider} />
                <Text style={styles.socialTitle}>OR CONTINUE WITH</Text>
                <View style={styles.socialDivider} />
              </View>

              <Pressable
                style={styles.socialButton}
                onPress={() => {
                  setAuthNotice("Google login is currently unavailable. Please sign in with your email.");
                }}
                variant="button"
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
                accessibilityHint="Launches Google credentials sign in"
              >
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </Pressable>

              <Pressable
                style={styles.socialButton}
                onPress={() => {
                  setAuthNotice("Apple login is currently unavailable. Please sign in with your email.");
                }}
                variant="button"
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
                accessibilityHint="Launches Apple credentials sign in"
              >
                <Ionicons name="logo-apple" size={20} color={colors.inverse} />
                <Text style={styles.socialButtonText}>Continue with Apple</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const themedStyles = createThemedStyleSheet((colors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.page,
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
    color: colors.primary,
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
    color: colors.text,
  },
  subtitle: {
    maxWidth: "92%",
    fontSize: theme.typography.body.fontSize,
    lineHeight: 22,
    fontWeight: "400",
    color: colors.textSoft,
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
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: colors.surface,
  },
  inputShellError: {
    borderColor: colors.danger,
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
    color: colors.textSoft,
    marginBottom: 8,
  },
  inputLabelError: {
    color: colors.danger,
  },
  inputField: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: colors.text,
    paddingVertical: 0,
  },
  inputFieldError: {
    color: colors.danger,
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
    backgroundColor: colors.danger,
  },
  errorText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.danger,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  rememberWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rememberText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: colors.text,
    fontWeight: "400",
  },
  forgotText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: colors.primary,
    fontWeight: "700",
  },
  loginButton: {
    height: 58,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  loginButtonText: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: colors.textOnPrimary,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  registerPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  registerPromptText: {
    fontSize: theme.typography.body.fontSize,
    color: colors.textSoft,
  },
  registerLinkText: {
    fontSize: theme.typography.body.fontSize,
    color: colors.primary,
    fontWeight: "700",
  },
  socialSection: {
    marginTop: 28,
    gap: 12,
  },
  socialHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },
  socialDivider: {
    height: 1,
    flex: 1,
    backgroundColor: colors.borderStrong,
  },
  socialTitle: {
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    fontWeight: "700",
    letterSpacing: 1.9,
    color: colors.textSoft,
  },
  socialButton: {
    height: 58,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: colors.surface,
  },
  socialButtonText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: colors.text,
    fontWeight: "500",
  },
}));
