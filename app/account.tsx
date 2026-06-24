import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform,  ActivityIndicator, ScrollView, Text, TextInput, View, Modal  } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { updateProfile, useAuthSession } from "../services/auth";
import { useCourseCatalog, getManagedCourseById } from "../services/course-management";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { createThemedStyleSheet, useThemedStyles, useAppTheme, theme } from "../components/theme";
import { useBookingState, formatBookingDate, getBookingTotal } from "../services/bookings";
import { supabase } from "../lib/supabase";
import * as ImagePicker from "expo-image-picker";



const PRESET_AVATARS = [
  { name: "Classic Golfer", url: "preset:classic_golfer" },
  { name: "Club House", url: "preset:club_house" },
  { name: "Fairway", url: "preset:fairway" },
  { name: "Tee Shot", url: "preset:tee_shot" },
];

const COUNTRY_CODES = [
  { code: "+1", name: "United States" },
  { code: "+1", name: "Canada" },
  { code: "+44", name: "United Kingdom" },
  { code: "+91", name: "India" },
  { code: "+61", name: "Australia" },
  { code: "+64", name: "New Zealand" },
  { code: "+65", name: "Singapore" },
  { code: "+94", name: "Sri Lanka" },
  { code: "+971", name: "United Arab Emirates" },
  { code: "+81", name: "Japan" },
  { code: "+82", name: "South Korea" },
  { code: "+86", name: "China" },
  { code: "+33", name: "France" },
  { code: "+49", name: "Germany" },
  { code: "+39", name: "Italy" },
  { code: "+34", name: "Spain" },
  { code: "+31", name: "Netherlands" },
  { code: "+41", name: "Switzerland" },
  { code: "+46", name: "Sweden" },
  { code: "+47", name: "Norway" },
  { code: "+353", name: "Ireland" },
  { code: "+27", name: "South Africa" },
  { code: "+55", name: "Brazil" },
  { code: "+52", name: "Mexico" },
  { code: "+54", name: "Argentina" },
  { code: "+60", name: "Malaysia" },
  { code: "+66", name: "Thailand" },
  { code: "+62", name: "Indonesia" },
  { code: "+63", name: "Philippines" },
  { code: "+90", name: "Turkey" },
  { code: "+966", name: "Saudi Arabia" },
  { code: "+20", name: "Egypt" },
  { code: "+92", name: "Pakistan" },
  { code: "+880", name: "Bangladesh" },
  { code: "+84", name: "Vietnam" },
];

function PremiumInput({
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
  const { colors } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  return (
    <View style={[styles.inputContainer, !editable && styles.inputDisabled]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.inputText}
        keyboardType={keyboardType}
        autoCapitalize="words"
        autoCorrect={false}
        editable={editable}
      />
    </View>
  );
}

export default function AccountScreen() {
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const auth = useAuthSession();
  const { horizontalPadding, screenBottomPadding, isTabletLike } = useResponsiveLayout();
  const catalog = useCourseCatalog();
  const bookingState = useBookingState();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [homeClubId, setHomeClubId] = useState("");
  const [handicap, setHandicap] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);


  // Phone code & validation states
  const [countryCode, setCountryCode] = useState("+94");
  const [localPhone, setLocalPhone] = useState("");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);

  // OTP Verification Modal
  const [isOtpModalVisible, setIsOtpModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Modals state
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isBillingModalVisible, setIsBillingModalVisible] = useState(false);

  useEffect(() => {
    setFullName(auth.profile?.full_name ?? "");
    setEmail(auth.session?.user.email ?? "");
    setHomeClubId(auth.profile?.home_club_id ?? "");
    setHandicap(auth.profile?.handicap != null ? auth.profile.handicap.toFixed(1) : "");

    // Split phone number into country code + local number
    const rawPhone = auth.profile?.phone ?? "";
    if (rawPhone.startsWith("+")) {
      const match = rawPhone.match(/^(\+\d+)\s*(.*)$/);
      if (match) {
        setCountryCode(match[1]);
        setLocalPhone(match[2]);
      } else {
        setLocalPhone(rawPhone);
      }
    } else {
      setLocalPhone(rawPhone);
    }

    // Determine verification status from Supabase Session
    setIsPhoneVerified(!!auth.session?.user.phone_confirmed_at);
  }, [auth.profile, auth.session]);

  const membershipTier = (auth.profile as any)?.membership_tiers?.name || "Free";
  const memberId = auth.session?.user.id.slice(0, 8).toUpperCase() ?? "PENDING";
  
  const memberSince = auth.profile?.member_since
    ? new Date(auth.profile.member_since).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
      })
    : "Pending";



  const handleSave = async () => {
    if (isSaving) return;
    if (handicap.trim() && Number.isNaN(Number(handicap))) {
      setStatusMessage("Handicap must be a valid number.");
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    try {
      let isEmailChanged = false;
      const currentEmail = auth.session?.user.email ?? "";
      if (email.trim() && email.trim().toLowerCase() !== currentEmail.toLowerCase()) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim().toLowerCase(),
        });
        if (emailError) throw emailError;
        isEmailChanged = true;
      }

      const formattedPhone = `${countryCode} ${localPhone.trim().replace(/\D/g, "")}`;
      await updateProfile({
        full_name: fullName.trim() || null,
        phone: formattedPhone || null,
        home_club_id: homeClubId.trim() || null,
        handicap: handicap.trim() ? Number(handicap) : null,
      });

      if (isEmailChanged) {
        setStatusMessage("Profile updated. Verification link sent to new email.");
      } else {
        setStatusMessage("Changes saved successfully.");
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAvatar = async (url: string) => {
    if (isSavingAvatar) return;
    setIsSavingAvatar(true);
    setStatusMessage(null);
    try {
      await updateProfile({ avatar_url: url });
      setStatusMessage("Avatar updated.");
      setIsPhotoModalVisible(false);
    } catch {
      setStatusMessage("Unable to save avatar.");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleUploadImage = async (uri: string) => {
    if (!auth.session?.user.id || isSavingAvatar) return;
    setIsSavingAvatar(true);
    setStatusMessage(null);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${auth.session.user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}. Make sure the 'avatars' storage bucket is created.`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      await updateProfile({ avatar_url: publicUrl });
      setStatusMessage("Avatar updated successfully.");
      setIsPhotoModalVisible(false);
    } catch (err: any) {
      setStatusMessage(err.message || "Unable to upload avatar.");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setStatusMessage("Permission to access gallery was denied.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      await handleUploadImage(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setStatusMessage("Permission to access camera was denied.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      await handleUploadImage(result.assets[0].uri);
    }
  };

  // Phone Verification Flow
  const handleStartPhoneVerification = async () => {
    if (!localPhone.trim()) return;
    setStatusMessage(null);
    setOtpError(null);
    const fullPhone = `${countryCode}${localPhone.trim().replace(/\D/g, "")}`;

    try {
      const { error } = await supabase.auth.updateUser({ phone: fullPhone });
      if (error) throw error;
      setIsOtpModalVisible(true);
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to trigger phone verification.");
    }
  };

  const handleConfirmOtp = async () => {
    setOtpError(null);
    setIsVerifyingOtp(true);
    const fullPhone = `${countryCode}${localPhone.trim().replace(/\D/g, "")}`;

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otpCode.trim(),
        type: "phone_change",
      });
      if (error) throw error;

      setIsPhoneVerified(true);
      const formattedPhone = `${countryCode} ${localPhone.trim().replace(/\D/g, "")}`;
      await updateProfile({ phone: formattedPhone });
      setIsOtpModalVisible(false);
      setOtpCode("");
      setStatusMessage("Phone number verified successfully!");
    } catch (err: any) {
      setOtpError(err.message || "Invalid verification code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={Platform.OS === "web"}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: Math.max(screenBottomPadding - 30, 120) },
        ]}
        bounces={false}
        overScrollMode="never"
      >
        {isTabletLike ? (
          <View style={styles.desktopLayoutRow}>
            <View style={styles.desktopColumnLeft}>
              {/* Premium Profile Summary Card */}
              <View style={styles.profileCard}>
                <View style={styles.photoRow}>
                  <View style={styles.avatarWrapContainer}>
                    <Pressable style={styles.avatarWrap} onPress={() => setIsPhotoModalVisible(true)} variant="card">
                      {auth.profile?.avatar_url ? (
                        <AppImage source={{ uri: auth.profile.avatar_url }} style={styles.avatarImage} />
                      ) : (
                        <View style={styles.avatarInitialContainer}>
                          <Text style={styles.avatarInitialText}>
                            {(fullName || auth.session?.user.email || "G")[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                    <Pressable style={styles.avatarEditBadge} onPress={() => setIsPhotoModalVisible(true)} variant="icon">
                      <Ionicons name="create" size={12} color={colors.surface} />
                    </Pressable>
                  </View>
                  <View style={styles.photoCopy}>
                    <Text style={styles.photoTitle}>{fullName || "Golfer Profile"}</Text>
                    <Text style={styles.photoSubtitle}>Member since {memberSince}</Text>
                  </View>
                </View>

                <View style={styles.profileMetaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillLabel}>MEMBERSHIP</Text>
                    <Text style={styles.metaPillValue}>{membershipTier}</Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillLabel}>MEMBER ID</Text>
                    <Text style={styles.metaPillValue}>GT-{memberId}</Text>
                  </View>
                </View>
              </View>

              {/* Profile details */}
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Golfer Credentials</Text>
                <View style={styles.card}>
                  <PremiumInput
                    label="FULL NAME"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter full name"
                  />
                  <PremiumInput
                    label="EMAIL ADDRESS"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email address"
                    keyboardType="email-address"
                  />

                  {/* Phone Number Input with Country Code & Verification Badge */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                    <View style={styles.phoneRowField}>
                      <Pressable
                        style={styles.countryCodePill}
                        onPress={() => setIsCountryModalVisible(true)}
                        variant="chip"
                      >
                        <Text style={styles.countryCodeText}>{countryCode}</Text>
                        <Ionicons name="chevron-down" size={10} color={colors.textSoft} />
                      </Pressable>
                      
                      <TextInput
                        value={localPhone}
                        onChangeText={(val) => {
                          setLocalPhone(val);
                          setIsPhoneVerified(false); // Reset verification if number changes
                        }}
                        placeholder="555 555 5555"
                        placeholderTextColor={colors.muted}
                        style={styles.localPhoneInput}
                        keyboardType="phone-pad"
                      />

                      <Pressable
                        style={[styles.verifyBadge, isPhoneVerified && styles.verifyBadgeSuccess]}
                        onPress={isPhoneVerified ? undefined : () => void handleStartPhoneVerification()}
                        disabled={!localPhone.trim()}
                        variant="chip"
                      >
                        {isPhoneVerified ? (
                          <>
                            <Ionicons name="checkmark-circle" size={13} color={colors.successText} />
                            <Text style={styles.verifyBadgeTextActive}>Verified</Text>
                          </>
                        ) : (
                          <Text style={styles.verifyBadgeText}>Verify</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>

                  <PremiumInput
                    label="CURRENT HANDICAP"
                    value={handicap}
                    onChangeText={setHandicap}
                    placeholder="e.g. 10.4"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>

            <View style={styles.desktopColumnRight}>
              {/* Home Club Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Home Club Selection</Text>
                <View style={styles.card}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>CHOOSE YOUR HOME CLUB</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={Platform.OS === "web"}
                      contentContainerStyle={styles.clubSelector}
                      bounces={false}
                    >
                      {catalog.courses.map((course) => {
                        const isSelected = homeClubId === course.id;
                        return (
                          <Pressable
                            key={course.id}
                            style={[styles.clubChip, isSelected && styles.clubChipActive]}
                            onPress={() => setHomeClubId(course.id)}
                            variant="chip"
                          >
                            <Text style={[styles.clubChipText, isSelected && styles.clubChipTextActive]}>
                              {course.title}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    {!catalog.courses.length && <Text style={styles.loadingText}>Loading clubs...</Text>}
                  </View>
                </View>
              </View>

              {/* Status card */}
              {statusMessage ? (
                <View style={[styles.noticeCard, { marginTop: 0 }]}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.noticeText}>{statusMessage}</Text>
                </View>
              ) : null}

              {/* Action Panel */}
              <View style={[styles.footerActions, { marginTop: 0 }]}>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => void handleSave()}
                  disabled={isSaving || auth.profileLoading}
                  variant="cta"
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save Details</Text>
                  )}
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => setIsBillingModalVisible(true)}
                  variant="button"
                >
                  <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                  <Text style={styles.secondaryButtonText}>View Booking Statements</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <>
            {/* Premium Profile Summary Card */}
            <View style={styles.profileCard}>
              <View style={styles.photoRow}>
                <View style={styles.avatarWrapContainer}>
                  <Pressable style={styles.avatarWrap} onPress={() => setIsPhotoModalVisible(true)} variant="card">
                    {auth.profile?.avatar_url ? (
                      <AppImage source={{ uri: auth.profile.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarInitialContainer}>
                        <Text style={styles.avatarInitialText}>
                          {(fullName || auth.session?.user.email || "G")[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                  <Pressable style={styles.avatarEditBadge} onPress={() => setIsPhotoModalVisible(true)} variant="icon">
                    <Ionicons name="create" size={12} color={colors.surface} />
                  </Pressable>
                </View>
                <View style={styles.photoCopy}>
                  <Text style={styles.photoTitle}>{fullName || "Golfer Profile"}</Text>
                  <Text style={styles.photoSubtitle}>Member since {memberSince}</Text>
                </View>
              </View>

              <View style={styles.profileMetaRow}>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillLabel}>MEMBERSHIP</Text>
                  <Text style={styles.metaPillValue}>{membershipTier}</Text>
                </View>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillLabel}>MEMBER ID</Text>
                  <Text style={styles.metaPillValue}>GT-{memberId}</Text>
                </View>
              </View>
            </View>

            {/* Profile details */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Golfer Credentials</Text>
              <View style={styles.card}>
                <PremiumInput
                  label="FULL NAME"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter full name"
                />
                <PremiumInput
                  label="EMAIL ADDRESS"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  keyboardType="email-address"
                />

                {/* Phone Number Input with Country Code & Verification Badge */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                  <View style={styles.phoneRowField}>
                    <Pressable
                      style={styles.countryCodePill}
                      onPress={() => setIsCountryModalVisible(true)}
                      variant="chip"
                    >
                      <Text style={styles.countryCodeText}>{countryCode}</Text>
                      <Ionicons name="chevron-down" size={10} color={colors.textSoft} />
                    </Pressable>
                    
                    <TextInput
                      value={localPhone}
                      onChangeText={(val) => {
                        setLocalPhone(val);
                        setIsPhoneVerified(false); // Reset verification if number changes
                      }}
                      placeholder="555 555 5555"
                      placeholderTextColor={colors.muted}
                      style={styles.localPhoneInput}
                      keyboardType="phone-pad"
                    />

                    <Pressable
                      style={[styles.verifyBadge, isPhoneVerified && styles.verifyBadgeSuccess]}
                      onPress={isPhoneVerified ? undefined : () => void handleStartPhoneVerification()}
                      disabled={!localPhone.trim()}
                      variant="chip"
                    >
                      {isPhoneVerified ? (
                        <>
                          <Ionicons name="checkmark-circle" size={13} color={colors.successText} />
                          <Text style={styles.verifyBadgeTextActive}>Verified</Text>
                        </>
                      ) : (
                        <Text style={styles.verifyBadgeText}>Verify</Text>
                      )}
                    </Pressable>
                  </View>
                </View>

                <PremiumInput
                  label="CURRENT HANDICAP"
                  value={handicap}
                  onChangeText={setHandicap}
                  placeholder="e.g. 10.4"
                  keyboardType="decimal-pad"
                />

                {/* Home Club Selection */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>HOME CLUB</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={Platform.OS === "web"}
                    contentContainerStyle={styles.clubSelector}
                    bounces={false}
                  >
                    {catalog.courses.map((course) => {
                      const isSelected = homeClubId === course.id;
                      return (
                        <Pressable
                          key={course.id}
                          style={[styles.clubChip, isSelected && styles.clubChipActive]}
                          onPress={() => setHomeClubId(course.id)}
                          variant="chip"
                        >
                          <Text style={[styles.clubChipText, isSelected && styles.clubChipTextActive]}>
                            {course.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  {!catalog.courses.length && <Text style={styles.loadingText}>Loading clubs...</Text>}
                </View>
              </View>
            </View>

            {/* Status card */}
            {statusMessage ? (
              <View style={styles.noticeCard}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.noticeText}>{statusMessage}</Text>
              </View>
            ) : null}

            {/* Action Panel */}
            <View style={styles.footerActions}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => void handleSave()}
                disabled={isSaving || auth.profileLoading}
                variant="cta"
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={styles.primaryButtonText}>Save Details</Text>
                )}
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setIsBillingModalVisible(true)}
                variant="button"
              >
                <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>View Booking Statements</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      {/* Country Code Selection Modal */}
      <Modal
        visible={isCountryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCountryModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>Country Code</Text>
            <ScrollView showsVerticalScrollIndicator={Platform.OS === "web"}>
              {COUNTRY_CODES.map((item) => (
                <Pressable
                  key={item.name}
                  style={styles.countryRow}
                  onPress={() => {
                    setCountryCode(item.code);
                    setIsCountryModalVisible(false);
                    setIsPhoneVerified(false);
                  }}
                  variant="chip"
                >
                  <Text style={styles.countryCodeNum}>{item.code}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalCloseBtn} onPress={() => setIsCountryModalVisible(false)} variant="chip">
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* OTP Entry Verification Modal */}
      <Modal
        visible={isOtpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOtpModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verify Phone Number</Text>
            <Text style={styles.modalSubtitle}>Enter the 6-digit confirmation code sent via SMS.</Text>

            <View style={styles.inputShell}>
              <Text style={styles.inputLabel}>ENTER CODE</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 1234"
                placeholderTextColor={colors.muted}
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>

            {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}

            <View style={styles.modalActionsRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setIsOtpModalVisible(false);
                  setOtpCode("");
                  setOtpError(null);
                }}
                variant="chip"
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={() => void handleConfirmOtp()}
                disabled={isVerifyingOtp || !otpCode.trim()}
                variant="cta"
              >
                {isVerifyingOtp ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={styles.modalBtnSaveText}>Verify Code</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Avatar Presets Modal */}
      <Modal
        visible={isPhotoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPhotoModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Profile Photo</Text>
            <Text style={styles.modalSubtitle}>Take a photo, choose from your library, or pick a preset.</Text>

            {/* Native Device Capture Actions */}
            <View style={styles.nativePickGroup}>
              <Pressable
                style={styles.nativePickBtn}
                onPress={() => void handleTakePhoto()}
                variant="button"
                disabled={isSavingAvatar}
              >
                <Ionicons name="camera" size={20} color={colors.primary} />
                <Text style={styles.nativePickText}>Take Photo</Text>
              </Pressable>
              
              <Pressable
                style={styles.nativePickBtn}
                onPress={() => void handlePickImage()}
                variant="button"
                disabled={isSavingAvatar}
              >
                <Ionicons name="image" size={20} color={colors.primary} />
                <Text style={styles.nativePickText}>Choose Photo</Text>
              </Pressable>
            </View>

            <View style={styles.modalDividerRow}>
              <View style={styles.modalDividerLine} />
              <Text style={styles.modalDividerText}>OR CHOOSE PRESET</Text>
              <View style={styles.modalDividerLine} />
            </View>

            <View style={styles.presetGrid}>
              {PRESET_AVATARS.map((preset) => (
                <Pressable
                  key={preset.name}
                  style={styles.presetCard}
                  onPress={() => void handleSelectAvatar(preset.url)}
                  variant="card"
                  disabled={isSavingAvatar}
                >
                  <AppImage source={{ uri: preset.url }} style={styles.presetImage} />
                  <Text style={styles.presetLabel}>{preset.name}</Text>
                </Pressable>
              ))}
            </View>



            <Pressable style={styles.modalCloseBtn} onPress={() => setIsPhotoModalVisible(false)} variant="chip">
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Billing statements Modal */}
      <Modal
        visible={isBillingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsBillingModalVisible(false)}
      >
        <View style={styles.billingModalBg}>
          <SafeAreaView style={styles.billingModalContainer}>
            <View style={styles.billingHeader}>
              <View>
                <Text style={styles.billingTitle}>Statements & Invoices</Text>
                <Text style={styles.billingSubtitle}>Transactions history logs</Text>
              </View>
              <Pressable style={styles.billingCloseBtn} onPress={() => setIsBillingModalVisible(false)} variant="icon">
                <Ionicons name="close" size={22} color={colors.primary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.billingScroll} showsVerticalScrollIndicator={Platform.OS === "web"}>
              {bookingState.bookings.length === 0 ? (
                <View style={styles.emptyBillingState}>
                  <Ionicons name="receipt-outline" size={38} color={colors.muted} />
                  <Text style={styles.emptyBillingText}>No transactions recorded.</Text>
                </View>
              ) : (
                bookingState.bookings.map((booking) => {
                  const course = getManagedCourseById(booking.course_id);
                  const totalAmount = getBookingTotal(booking);
                  const isCancelled = booking.status === "cancelled";

                  return (
                    <View key={booking.id} style={styles.invoiceCard}>
                      <View style={styles.invoiceHeaderRow}>
                        <View style={styles.invoiceTitleWrap}>
                          <Text style={styles.invoiceCourseTitle} numberOfLines={1}>{course.title}</Text>
                          <Text style={styles.invoiceDate}>{formatBookingDate(booking.tee_date)}</Text>
                        </View>
                        <Text style={[styles.invoiceAmount, isCancelled && styles.invoiceAmountCancelled]}>
                          ${totalAmount.toFixed(2)}
                        </Text>
                      </View>

                      <View style={styles.invoiceDivider} />

                      <View style={styles.invoiceBreakdown}>
                        <View style={styles.invoiceRow}>
                          <Text style={styles.invoiceLabel}>Green Fee ({booking.players} players)</Text>
                          <Text style={styles.invoiceVal}>${booking.green_fee.toFixed(2)}</Text>
                        </View>
                        {booking.caddy_fee > 0 && (
                          <View style={styles.invoiceRow}>
                            <Text style={styles.invoiceLabel}>Caddy Assistance</Text>
                            <Text style={styles.invoiceVal}>${booking.caddy_fee.toFixed(2)}</Text>
                          </View>
                        )}
                        <View style={styles.invoiceRow}>
                          <Text style={styles.invoiceLabel}>Service Charge</Text>
                          <Text style={styles.invoiceVal}>${booking.service_fee.toFixed(2)}</Text>
                        </View>
                        <View style={styles.invoiceRow}>
                          <Text style={styles.invoiceLabel}>Taxes & Fees</Text>
                          <Text style={styles.invoiceVal}>${booking.taxes.toFixed(2)}</Text>
                        </View>
                      </View>

                      <View style={styles.invoiceFooterRow}>
                        <View style={styles.paymentMethodRow}>
                          <Ionicons
                            name={booking.payment_method === "wallet" ? "wallet-outline" : "card-outline"}
                            size={13}
                            color={colors.textSoft}
                          />
                          <Text style={styles.paymentMethodText}>
                            {booking.payment_method === "wallet" ? "Digital Wallet" : "Card Checkout"}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, isCancelled ? styles.statusBadgeCancelled : styles.statusBadgePaid]}>
                          <Text style={[styles.statusBadgeText, isCancelled ? styles.statusBadgeTextCancelled : styles.statusBadgeTextPaid]}>
                            {isCancelled ? "REFUNDED" : "PAID"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
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
    gap: 16,
  },
  profileCard: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  photoRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  avatarWrapContainer: {
    position: "relative",
  },
  avatarWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: "hidden",
    backgroundColor: colors.primarySoft,
  },
  avatarEditBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitialContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialText: {
    color: colors.surface,
    fontSize: 32,
    fontWeight: "800",
  },
  photoCopy: {
    flex: 1,
  },
  photoTitle: {
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    color: colors.primary,
    fontWeight: "800",
    marginBottom: 2,
  },
  photoSubtitle: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    color: colors.textSoft,
    marginBottom: 8,
  },
  profileMetaRow: {
    flexDirection: "row",
    gap: 10,
  },
  metaPill: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaPillLabel: {
    fontSize: 9,
    color: colors.textSoft,
    letterSpacing: 1.1,
    fontWeight: "700",
    marginBottom: 2,
  },
  metaPillValue: {
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    color: colors.primary,
    fontWeight: "800",
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: theme.typography.subtitle.fontSize,
    color: colors.primary,
    fontWeight: "800",
    marginLeft: 4,
  },
  card: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  inputContainer: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceSoft,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: colors.textSoft,
    marginBottom: 4,
  },
  inputText: {
    fontSize: theme.typography.bodySm.fontSize,
    color: colors.text,
    paddingVertical: 0,
  },
  phoneRowField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  countryCodePill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  countryCodeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  localPhoneInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },
  verifyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  verifyBadgeSuccess: {
    backgroundColor: colors.success,
    borderColor: colors.success,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifyBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
  },
  verifyBadgeTextActive: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.successText,
  },
  clubSelector: {
    gap: 6,
    paddingVertical: 2,
  },
  clubChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clubChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  clubChipText: {
    fontSize: 11,
    color: colors.textSoft,
    fontWeight: "600",
  },
  clubChipTextActive: {
    color: colors.surface,
    fontWeight: "700",
  },
  loadingText: {
    marginTop: 4,
    fontSize: 10,
    color: colors.textSoft,
    fontStyle: "italic",
  },
  noticeCard: {
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: theme.typography.bodySm.fontSize,
    color: colors.text,
    fontWeight: "600",
  },
  footerActions: {
    gap: 8,
  },
  primaryButton: {
    height: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: theme.typography.body.fontSize,
    color: colors.surface,
    fontWeight: "700",
  },
  secondaryButton: {
    height: 48,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: theme.typography.bodySm.fontSize,
    color: colors.primary,
    fontWeight: "700",
  },

  // Modal styles
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  modalTitle: {
    fontSize: theme.typography.h3.fontSize,
    color: colors.primary,
    fontWeight: "800",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: theme.typography.bodySm.fontSize,
    color: colors.textSoft,
    textAlign: "center",
    marginBottom: 8,
  },
  nativePickGroup: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    justifyContent: "space-between",
  },
  nativePickBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nativePickText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  modalDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
    width: "100%",
  },
  modalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderSoft,
  },
  modalDividerText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.8,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  presetCard: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
  },
  presetImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 4,
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  modalCloseBtn: {
    height: 42,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  modalCloseText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSoft,
  },

  // Country Row in Selection list
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    gap: 12,
  },
  countryCodeNum: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
    width: 50,
  },
  countryName: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
  },

  // OTP error
  otpErrorText: {
    fontSize: 11,
    color: colors.danger,
    textAlign: "center",
    fontWeight: "600",
  },

  // Billing
  billingModalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  billingModalContainer: {
    height: "80%",
    backgroundColor: colors.page,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  billingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.borderSoft,
  },
  billingTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    color: colors.primary,
    fontWeight: "800",
  },
  billingSubtitle: {
    fontSize: 10,
    color: colors.textSoft,
    fontWeight: "600",
  },
  billingCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  billingScroll: {
    padding: 16,
    gap: 14,
  },
  emptyBillingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 8,
  },
  emptyBillingText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  invoiceCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  invoiceHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  invoiceTitleWrap: {
    flex: 1,
    marginRight: 8,
  },
  invoiceCourseTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
  },
  invoiceDate: {
    fontSize: 10,
    color: colors.textSoft,
    marginTop: 1,
  },
  invoiceAmount: {
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: "800",
    color: colors.primary,
  },
  invoiceAmountCancelled: {
    textDecorationLine: "line-through",
    color: colors.textSoft,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: colors.borderSoft,
  },
  invoiceBreakdown: {
    gap: 4,
  },
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  invoiceLabel: {
    fontSize: 11,
    color: colors.textSoft,
  },
  invoiceVal: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  invoiceFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  paymentMethodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  paymentMethodText: {
    fontSize: 10,
    color: colors.textSoft,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgePaid: {
    backgroundColor: colors.success,
  },
  statusBadgeCancelled: {
    backgroundColor: `${colors.danger}18`,
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: "800",
  },
  statusBadgeTextPaid: {
    color: colors.successText,
  },
  statusBadgeTextCancelled: {
    color: colors.danger,
  },
  inputShell: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceSoft,
  },
  inputField: {
    fontSize: theme.typography.body.fontSize,
    color: colors.text,
    paddingVertical: 0,
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
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  modalBtnCancelText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: "700",
    color: colors.textSoft,
  },
  modalBtnSave: {
    backgroundColor: colors.primary,
  },
  modalBtnSaveText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: "700",
    color: colors.surface,
  },
  desktopLayoutRow: {
    flexDirection: "row",
    gap: 24,
    width: "100%",
    alignItems: "flex-start",
  },
  desktopColumnLeft: {
    flex: 1,
    gap: 16,
  },
  desktopColumnRight: {
    flex: 1,
    gap: 16,
  },
}));
