import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAuthConfigurationError, signInWithEmail, signUpWithEmail } from "../components/auth";
import { theme } from "../components/theme";

const SEGMENTED_CONTROL_PADDING = 4;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [loginForm, setLoginForm] = useState({
    usernameOrEmail: "",
    password: "",
  });
  const [signUpForm, setSignUpForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    handicap: "",
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const segmentProgress = useRef(new Animated.Value(0)).current;
  const isCompactScreen = width < 360;
  const isTabletLike = width >= 768;
  const supabaseConfigurationError = getAuthConfigurationError();
  const horizontalPadding = isTabletLike ? Math.max((width - 560) / 2, 28) : isCompactScreen ? 16 : 24;
  const contentMaxWidth = isTabletLike ? 560 : 999;

  useEffect(() => {
    Animated.timing(segmentProgress, {
      toValue: activeTab === "login" ? 0 : 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeTab, segmentProgress]);

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

  const handleTabChange = (nextTab: "login" | "signup") => {
    if (nextTab === activeTab) {
      return;
    }

    LayoutAnimation.configureNext({
      duration: 180,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });

    setActiveTab(nextTab);
    setErrors({});
    setAuthNotice(null);
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setAuthNotice(null);

    if (activeTab === "login") {
      const nextErrors: Record<string, boolean> = {};

      if (!loginForm.usernameOrEmail.trim()) {
        nextErrors.loginUsernameOrEmail = true;
      }
      if (!loginForm.password.trim()) {
        nextErrors.loginPassword = true;
      }

      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        return;
      }

      if (!EMAIL_REGEX.test(loginForm.usernameOrEmail.trim())) {
        setErrors({ loginUsernameOrEmail: true });
        setAuthNotice("Use the email address linked to your account.");
        return;
      }

      setIsSubmitting(true);
      try {
        await signInWithEmail({
          email: loginForm.usernameOrEmail,
          password: loginForm.password,
        });
        router.replace("/home");
      } catch (error) {
        setAuthNotice(error instanceof Error ? error.message : "We could not sign you in right now.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const nextErrors: Record<string, boolean> = {};
    if (!signUpForm.username.trim()) {
      nextErrors.signUpUsername = true;
    }
    if (!signUpForm.email.trim()) {
      nextErrors.signUpEmail = true;
    }
    if (!signUpForm.password.trim()) {
      nextErrors.signUpPassword = true;
    }
    if (!signUpForm.confirmPassword.trim()) {
      nextErrors.signUpConfirmPassword = true;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!EMAIL_REGEX.test(signUpForm.email.trim())) {
      setErrors({ signUpEmail: true });
      setAuthNotice("Enter a valid email address.");
      return;
    }

    if (signUpForm.password.trim().length < 6) {
      setErrors({ signUpPassword: true });
      setAuthNotice("Password should be at least 6 characters.");
      return;
    }

    if (signUpForm.password !== signUpForm.confirmPassword) {
      setErrors({
        signUpPassword: true,
        signUpConfirmPassword: true,
      });
      setAuthNotice("Passwords do not match.");
      return;
    }

    if (signUpForm.handicap.trim() && Number.isNaN(Number(signUpForm.handicap))) {
      setErrors({ signUpHandicap: true });
      setAuthNotice("Enter a valid numeric handicap.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signUpWithEmail({
        email: signUpForm.email,
        password: signUpForm.password,
        username: signUpForm.username,
        handicap: signUpForm.handicap.trim() ? Number(signUpForm.handicap) : null,
      });

      if (result.requiresEmailVerification) {
        setAuthNotice("Account created. Check your email to verify the account before signing in.");
        setActiveTab("login");
        setLoginForm({
          usernameOrEmail: signUpForm.email.trim(),
          password: "",
        });
        return;
      }

      router.replace("/home");
    } catch (error) {
      setAuthNotice(error instanceof Error ? error.message : "We could not create your account right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const authTopTitle = activeTab === "login" ? "Login" : "Sign Up";
  const heroEyebrow = activeTab === "login" ? "WELCOME BACK" : "CREATE ACCOUNT";
  const heroSubtitle =
    activeTab === "login"
      ? "Sign in with your email to manage bookings, explore courses, and pick up where your next round left off."
      : "Create your account with secure email sign-in and a profile that syncs across devices.";
  const feedbackMessage =
    supabaseConfigurationError ??
    (Object.keys(errors).length > 0 ? authNotice ?? "Please fill all required fields." : authNotice);
  const segmentIndicatorWidth = Math.max((segmentWidth - SEGMENTED_CONTROL_PADDING * 2) / 2, 0);
  const segmentIndicatorTranslateX = segmentProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, segmentIndicatorWidth],
  });

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <View style={[styles.authTopBar, { marginHorizontal: horizontalPadding }]}>
        <Pressable style={styles.authBackButton} onPress={() => router.replace("/splash")} variant="icon">
          <Ionicons name="arrow-back" size={22} color={theme.colors.primary} />
        </Pressable>
        <Text style={styles.authTopTitle}>{authTopTitle}</Text>
        <View style={styles.authTopSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: isTabletLike ? 84 : 72,
          },
        ]}
        contentOffset={{ x: 0, y: 0 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustKeyboardInsets={false}
      >
        <Animated.View style={[styles.animatedAuthContent, { maxWidth: contentMaxWidth }]}>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>{heroEyebrow}</Text>
            <Text style={[styles.subtitle, isCompactScreen && styles.subtitleCompact]}>{heroSubtitle}</Text>
          </View>

          <View style={styles.panel}>
            <View
              style={styles.segmentedWrap}
              onLayout={(event) => setSegmentWidth(event.nativeEvent.layout.width)}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.segmentIndicator,
                  {
                    width: segmentIndicatorWidth,
                    transform: [{ translateX: segmentIndicatorTranslateX }],
                  },
                ]}
              />

              <Pressable
                style={[
                  styles.segmentButton,
                  activeTab === "login" && styles.segmentButtonActive,
                ]}
                onPress={() => handleTabChange("login")}
                variant="chip"
              >
                <Text
                  style={[
                    styles.segmentText,
                    activeTab === "login" && styles.segmentTextActive,
                  ]}
                >
                  Login
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.segmentButton,
                  activeTab === "signup" && styles.segmentButtonActive,
                ]}
                onPress={() => handleTabChange("signup")}
                variant="chip"
              >
                <Text
                  style={[
                    styles.segmentText,
                    activeTab === "signup" && styles.segmentTextActive,
                  ]}
                >
                  Sign Up
                </Text>
              </Pressable>
            </View>

            <View style={styles.validationGroup}>
              <View style={styles.formGroup}>
                {activeTab === "login" ? (
                  <>
                    <View style={styles.inputShell}>
                      <Text
                        style={[styles.inputLabel, errors.loginUsernameOrEmail && styles.inputLabelError]}
                      >
                        EMAIL ADDRESS
                      </Text>
                      <View style={styles.inputRow}>
                        <Ionicons name="mail-outline" size={18} color={theme.colors.muted} />
                        <TextInput
                          placeholder="name@example.com"
                          placeholderTextColor={theme.colors.muted}
                          style={[styles.inputField, errors.loginUsernameOrEmail && styles.inputFieldError]}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={loginForm.usernameOrEmail}
                          onChangeText={(text) => {
                            setLoginForm((prev) => ({ ...prev, usernameOrEmail: text }));
                            clearError("loginUsernameOrEmail");
                          }}
                        />
                      </View>
                    </View>

                    <View style={styles.inputShell}>
                      <Text style={[styles.inputLabel, errors.loginPassword && styles.inputLabelError]}>
                        PASSWORD
                      </Text>
                      <View style={styles.inputRow}>
                        <Ionicons name="lock-closed-outline" size={18} color={theme.colors.muted} />
                        <TextInput
                          placeholder="Enter your password"
                          placeholderTextColor={theme.colors.muted}
                          style={[styles.inputField, errors.loginPassword && styles.inputFieldError]}
                          secureTextEntry
                          value={loginForm.password}
                          onChangeText={(text) => {
                            setLoginForm((prev) => ({ ...prev, password: text }));
                            clearError("loginPassword");
                          }}
                        />
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.inputShell}>
                      <Text style={[styles.inputLabel, errors.signUpUsername && styles.inputLabelError]}>
                        USERNAME
                      </Text>
                      <View style={styles.inputRow}>
                        <Ionicons name="person-outline" size={18} color={theme.colors.muted} />
                        <TextInput
                          placeholder="Choose a username"
                          placeholderTextColor={theme.colors.muted}
                          style={[styles.inputField, errors.signUpUsername && styles.inputFieldError]}
                          autoCapitalize="none"
                          value={signUpForm.username}
                          onChangeText={(text) => {
                            setSignUpForm((prev) => ({ ...prev, username: text }));
                            clearError("signUpUsername");
                          }}
                        />
                      </View>
                    </View>

                    <View style={styles.inputShell}>
                      <Text style={[styles.inputLabel, errors.signUpEmail && styles.inputLabelError]}>
                        EMAIL ADDRESS
                      </Text>
                      <View style={styles.inputRow}>
                        <Ionicons name="mail-outline" size={18} color={theme.colors.muted} />
                        <TextInput
                          placeholder="name@example.com"
                          placeholderTextColor={theme.colors.muted}
                          style={[styles.inputField, errors.signUpEmail && styles.inputFieldError]}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={signUpForm.email}
                          onChangeText={(text) => {
                            setSignUpForm((prev) => ({ ...prev, email: text }));
                            clearError("signUpEmail");
                          }}
                        />
                      </View>
                    </View>

                    <View style={styles.inputShell}>
                      <Text style={[styles.inputLabel, errors.signUpPassword && styles.inputLabelError]}>
                        PASSWORD
                      </Text>
                      <View style={styles.inputRow}>
                        <Ionicons name="lock-closed-outline" size={18} color={theme.colors.muted} />
                        <TextInput
                          placeholder="Create a password"
                          placeholderTextColor={theme.colors.muted}
                          style={[styles.inputField, errors.signUpPassword && styles.inputFieldError]}
                          secureTextEntry
                          value={signUpForm.password}
                          onChangeText={(text) => {
                            setSignUpForm((prev) => ({ ...prev, password: text }));
                            clearError("signUpPassword");
                          }}
                        />
                      </View>
                    </View>

                    <View style={styles.inputShell}>
                      <Text
                        style={[
                          styles.inputLabel,
                          errors.signUpConfirmPassword && styles.inputLabelError,
                        ]}
                      >
                        CONFIRM PASSWORD
                      </Text>
                      <View style={styles.inputRow}>
                        <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.muted} />
                        <TextInput
                          placeholder="Re-enter your password"
                          placeholderTextColor={theme.colors.muted}
                          style={[
                            styles.inputField,
                            errors.signUpConfirmPassword && styles.inputFieldError,
                          ]}
                          secureTextEntry
                          value={signUpForm.confirmPassword}
                          onChangeText={(text) => {
                            setSignUpForm((prev) => ({ ...prev, confirmPassword: text }));
                            clearError("signUpConfirmPassword");
                          }}
                        />
                      </View>
                    </View>

                    <View style={styles.inputShell}>
                      <Text style={[styles.inputLabel, errors.signUpHandicap && styles.inputLabelError]}>
                        HANDICAP (OPTIONAL)
                      </Text>
                      <View style={styles.inputRow}>
                        <Ionicons name="golf-outline" size={18} color={theme.colors.muted} />
                        <TextInput
                          placeholder="e.g. 12.4"
                          placeholderTextColor={theme.colors.muted}
                          style={[styles.inputField, errors.signUpHandicap && styles.inputFieldError]}
                          keyboardType="decimal-pad"
                          value={signUpForm.handicap}
                          onChangeText={(text) => {
                            setSignUpForm((prev) => ({ ...prev, handicap: text }));
                            clearError("signUpHandicap");
                          }}
                        />
                      </View>
                    </View>
                  </>
                )}
              </View>

              {feedbackMessage ? (
                <View style={styles.errorRow}>
                  <View style={styles.errorDot} />
                  <Text style={styles.errorText}>{feedbackMessage}</Text>
                </View>
              ) : null}
            </View>

            {activeTab === "login" ? (
              <View style={styles.metaRow}>
                <Pressable
                  style={[styles.rememberWrap]}
                  onPress={() => setRememberMe((v) => !v)}
                  variant="chip"
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe ? <Ionicons name="checkmark" size={14} color={theme.colors.surface} /> : null}
                </View>
                  <Text style={styles.rememberText}>Keep me signed in</Text>
                </Pressable>

                <Pressable onPress={() => router.push("/forgot-password")} variant="chip">
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable
              style={[styles.loginButton]}
              onPress={() => void handleSubmit()}
              disabled={isSubmitting || Boolean(supabaseConfigurationError)}
              variant="cta"
            >
              <Text style={styles.loginButtonText}>
                {isSubmitting
                  ? activeTab === "login"
                    ? "Signing In..."
                    : "Creating Account..."
                  : activeTab === "login"
                    ? "Login to GolfTee"
                    : "Create GolfTee Account"}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={theme.colors.surface} />
            </Pressable>

            <View style={styles.socialSection}>
              <View style={styles.socialHeader}>
                <View style={styles.socialDivider} />
                <Text style={styles.socialTitle}>OR CONTINUE WITH</Text>
                <View style={styles.socialDivider} />
              </View>

              <Pressable
                style={[styles.socialButton]}
                onPress={() => {
                  setAuthNotice("Google login is not configured yet. It can be added later from Supabase Auth providers.");
                }}
                variant="button"
              >
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </Pressable>

              <Pressable
                style={[styles.socialButton]}
                onPress={() => {
                  setAuthNotice("Apple login is not configured yet. It can be added later from Supabase Auth providers.");
                }}
                variant="button"
              >
                <Ionicons name="logo-apple" size={20} color={theme.colors.inverse} />
                <Text style={styles.socialButtonText}>Continue with Apple</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
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
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 72,
  },
  animatedAuthContent: {
    width: "100%",
    gap: 0,
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
    maxWidth: "88%",
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
    padding: 0,
  },
  segmentedWrap: {
    position: "relative",
    flexDirection: "row",
    borderRadius: 16,
    padding: SEGMENTED_CONTROL_PADDING,
    marginBottom: 24,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  segmentIndicator: {
    position: "absolute",
    top: SEGMENTED_CONTROL_PADDING,
    bottom: SEGMENTED_CONTROL_PADDING,
    left: SEGMENTED_CONTROL_PADDING,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  segmentButton: {
    flex: 1,
    borderRadius: theme.radius.pill,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  segmentButtonActive: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  segmentText: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "600",
    color: theme.colors.textSoft,
    letterSpacing: 0.2,
  },
  segmentTextActive: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  formGroup: {
    gap: 12,
    marginBottom: 18,
  },
  validationGroup: {
    marginBottom: 2,
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
  inputLabelError: {
    color: theme.colors.danger,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginTop: -2,
    marginBottom: 16,
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
    borderColor: theme.colors.borderStrong,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  rememberText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
    fontWeight: "400",
  },
  forgotText: {
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  loginButton: {
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
  loginButtonText: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: theme.colors.textOnPrimary,
    fontWeight: "700",
    letterSpacing: 0.3,
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
    backgroundColor: theme.colors.borderStrong,
  },
  socialTitle: {
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    fontWeight: "700",
    letterSpacing: 1.9,
    color: theme.colors.textSoft,
  },
  socialButton: {
    height: 58,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  socialButtonText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
    fontWeight: "500",
  },
});
