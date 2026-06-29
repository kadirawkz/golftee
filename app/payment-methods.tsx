import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { createThemedStyleSheet, useThemedStyles, useAppTheme, theme } from "../components/theme";

export interface PaymentMethod {
  id: string;
  type: "wallet" | "card";
  brand: string;
  last4: string;
  expiry?: string;
  cardholderName?: string;
}

const DEFAULT_METHODS: PaymentMethod[] = [
  {
    id: "default-wallet",
    type: "wallet",
    brand: Platform.OS === "ios" ? "Apple Pay" : "Google Pay",
    last4: "",
  },
  {
    id: "default-card",
    type: "card",
    brand: "Mastercard",
    last4: "8829",
    expiry: "08/25",
    cardholderName: "Alex Morgan",
  },
];

export default function PaymentMethodsScreen() {
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const { horizontalPadding, screenBottomPadding } = useResponsiveLayout();
  const insets = useSafeAreaInsets();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [defaultMethodId, setDefaultMethodId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isCardModalVisible, setIsCardModalVisible] = useState(false);
  const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);

  // Form State
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Load methods
  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        const storedMethods = await AsyncStorage.getItem("golftee:payment_methods");
        const storedDefault = await AsyncStorage.getItem("golftee:settings:default_payment_id");

        let loadedMethods: PaymentMethod[] = [];
        if (storedMethods) {
          loadedMethods = JSON.parse(storedMethods);
        } else {
          // Seed defaults
          loadedMethods = [...DEFAULT_METHODS];
          await AsyncStorage.setItem("golftee:payment_methods", JSON.stringify(loadedMethods));
        }

        setMethods(loadedMethods);

        if (storedDefault && loadedMethods.some((m) => m.id === storedDefault)) {
          setDefaultMethodId(storedDefault);
        } else if (loadedMethods.length > 0) {
          setDefaultMethodId(loadedMethods[0].id);
          await AsyncStorage.setItem("golftee:settings:default_payment_id", loadedMethods[0].id);
        }
      } catch (err) {
        console.warn("Failed to load payment methods", err);
      } finally {
        setLoading(false);
      }
    };
    loadPaymentData();
  }, []);

  const saveMethodsToStorage = async (newMethods: PaymentMethod[]) => {
    try {
      await AsyncStorage.setItem("golftee:payment_methods", JSON.stringify(newMethods));
    } catch (err) {
      console.warn("Failed to save payment methods", err);
    }
  };

  const handleSetDefault = async (id: string) => {
    setDefaultMethodId(id);
    try {
      await AsyncStorage.setItem("golftee:settings:default_payment_id", id);
      // Map to legacy setting type as well for backwards compatibility
      const selected = methods.find((m) => m.id === id);
      if (selected) {
        await AsyncStorage.setItem("golftee:settings:default_payment", selected.type);
      }
    } catch (err) {
      console.warn("Failed to save default payment setting", err);
    }
  };

  const handleDelete = (id: string) => {
    const confirmDelete = async () => {
      const updated = methods.filter((m) => m.id !== id);
      setMethods(updated);
      await saveMethodsToStorage(updated);

      if (defaultMethodId === id && updated.length > 0) {
        const newDefaultId = updated[0].id;
        setDefaultMethodId(newDefaultId);
        await AsyncStorage.setItem("golftee:settings:default_payment_id", newDefaultId);
        await AsyncStorage.setItem("golftee:settings:default_payment", updated[0].type);
      } else if (updated.length === 0) {
        setDefaultMethodId("");
        await AsyncStorage.removeItem("golftee:settings:default_payment_id");
        await AsyncStorage.removeItem("golftee:settings:default_payment");
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to remove this payment method?");
      if (confirmed) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        "Remove Payment Method",
        "Are you sure you want to remove this payment method?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: confirmDelete,
          },
        ]
      );
    }
  };

  // Card formatting
  const handleCardNumberChange = (text: string) => {
    // Remove all non-digits
    const clean = text.replace(/\D/g, "");
    // Format in blocks of 4
    const formatted = clean.match(/.{1,4}/g)?.join(" ") || clean;
    setCardNumber(formatted.substring(0, 19)); // Max 16 digits + 3 spaces
  };

  const handleExpiryChange = (text: string) => {
    const clean = text.replace(/\D/g, "");
    if (clean.length > 2) {
      setCardExpiry(`${clean.substring(0, 2)}/${clean.substring(2, 4)}`);
    } else {
      setCardExpiry(clean);
    }
  };

  const handleAddCard = async () => {
    setFormError(null);
    const cleanNum = cardNumber.replace(/\s/g, "");

    // Validations
    if (!cardName.trim()) {
      setFormError("Please enter cardholder name.");
      return;
    }
    if (cleanNum.length < 15 || cleanNum.length > 16) {
      setFormError("Card number must be 15 or 16 digits.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      setFormError("Expiry date must be in MM/YY format.");
      return;
    }
    const month = parseInt(cardExpiry.split("/")[0], 10);
    if (month < 1 || month > 12) {
      setFormError("Invalid month in expiry.");
      return;
    }
    if (cardCvv.length < 3 || cardCvv.length > 4) {
      setFormError("CVV must be 3 or 4 digits.");
      return;
    }

    // Determine brand based on starting digit
    let brand = "Visa";
    if (cleanNum.startsWith("5")) brand = "Mastercard";
    else if (cleanNum.startsWith("3")) brand = "Amex";
    else if (cleanNum.startsWith("6")) brand = "Discover";

    const last4 = cleanNum.substring(cleanNum.length - 4);
    if (methods.some((m) => m.type === "card" && m.brand === brand && m.last4 === last4)) {
      setFormError(`This ${brand} card ending in ${last4} is already added.`);
      return;
    }

    const newMethod: PaymentMethod = {
      id: `card-${Date.now()}`,
      type: "card",
      brand,
      last4,
      expiry: cardExpiry,
      cardholderName: cardName,
    };

    const updated = [...methods, newMethod];
    setMethods(updated);
    await saveMethodsToStorage(updated);

    // If it's the only method, set it default
    if (updated.length === 1 || !defaultMethodId) {
      await handleSetDefault(newMethod.id);
    }

    // Reset fields & close
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setIsCardModalVisible(false);
  };

  const handleAddWallet = async (walletType: "Apple Pay" | "Google Pay") => {
    // Check if wallet already exists
    if (methods.some((m) => m.type === "wallet" && m.brand === walletType)) {
      Alert.alert("Wallet Exists", `You have already added ${walletType} to your payment methods.`);
      setIsWalletModalVisible(false);
      return;
    }

    const newMethod: PaymentMethod = {
      id: `wallet-${Date.now()}`,
      type: "wallet",
      brand: walletType,
      last4: "",
    };

    const updated = [...methods, newMethod];
    setMethods(updated);
    await saveMethodsToStorage(updated);

    if (updated.length === 1 || !defaultMethodId) {
      await handleSetDefault(newMethod.id);
    }

    setIsWalletModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={Platform.OS === "web"}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: Math.max(screenBottomPadding - 20, 140) },
        ]}
        bounces={false}
        overScrollMode="never"
      >


        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <View style={styles.methodsSection}>
            <Text style={styles.sectionTitle}>YOUR PAYMENT METHODS</Text>
            {methods.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="card-outline" size={32} color={colors.textSoft} />
                <Text style={styles.emptyText}>No payment methods saved yet.</Text>
              </View>
            ) : (
              methods.map((method) => {
                const isDefault = method.id === defaultMethodId;
                const isWallet = method.type === "wallet";

                return (
                  <Pressable
                    key={method.id}
                    style={[styles.paymentCard, isDefault && styles.paymentCardActive]}
                    onPress={() => void handleSetDefault(method.id)}
                    variant="card"
                  >
                    <View style={styles.cardLeft}>
                      <View
                        style={[
                          styles.cardIconWrap,
                          isWallet && method.brand === "Apple Pay" && styles.appleIcon,
                          isWallet && method.brand === "Google Pay" && styles.gpayIcon,
                        ]}
                      >
                        {isWallet ? (
                          <Ionicons
                            name={method.brand === "Apple Pay" ? "logo-apple" : "logo-google"}
                            size={20}
                            color={method.brand === "Apple Pay" ? "#000000" : colors.primary}
                          />
                        ) : (
                          <Ionicons name="card" size={22} color={colors.primary} />
                        )}
                      </View>

                      <View>
                        <View style={styles.titleRow}>
                          <Text style={styles.methodName}>
                            {isWallet ? method.brand : `•••• ${method.last4}`}
                          </Text>
                          {isDefault && (
                            <View style={styles.defaultBadge}>
                              <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.methodSubtitle}>
                          {isWallet
                            ? "Digital Wallet Checkout"
                            : `${method.brand} - Exp. ${method.expiry}`}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(method.id)}
                      variant="icon"
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footerCtaWrap, { paddingHorizontal: horizontalPadding, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.actionButtonsRowFixed}>
          <Pressable
            style={[styles.actionBtn, { borderColor: colors.border }]}
            onPress={() => setIsCardModalVisible(true)}
            variant="chip"
          >
            <Ionicons name="add" size={18} color={colors.text} />
            <Text style={styles.actionBtnText}>Add Card</Text>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, { borderColor: colors.border }]}
            onPress={() => setIsWalletModalVisible(true)}
            variant="chip"
          >
            <Ionicons name="wallet-outline" size={18} color={colors.text} />
            <Text style={styles.actionBtnText}>Add Wallet</Text>
          </Pressable>
        </View>
      </View>

      {/* Add Card Modal */}
      <Modal
        visible={isCardModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCardModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Credit/Debit Card</Text>
            <Text style={styles.modalSubtitle}>Fill in your card credentials to store mock card.</Text>

            <View style={styles.inputShell}>
              <Text style={styles.inputLabel}>CARDHOLDER NAME</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. John Doe"
                placeholderTextColor={colors.muted}
                value={cardName}
                onChangeText={setCardName}
              />
            </View>

            <View style={styles.inputShell}>
              <Text style={styles.inputLabel}>CARD NUMBER</Text>
              <TextInput
                style={styles.inputField}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                value={cardNumber}
                onChangeText={handleCardNumberChange}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputShell, { flex: 1 }]}>
                <Text style={styles.inputLabel}>EXPIRY DATE</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="MM/YY"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  value={cardExpiry}
                  onChangeText={handleExpiryChange}
                  maxLength={5}
                />
              </View>

              <View style={[styles.inputShell, { flex: 1 }]}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="123"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  value={cardCvv}
                  onChangeText={setCardCvv}
                  secureTextEntry
                  maxLength={4}
                />
              </View>
            </View>

            {formError ? <Text style={styles.statusTextError}>{formError}</Text> : null}

            <View style={styles.modalActionsRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setIsCardModalVisible(false);
                  setCardName("");
                  setCardNumber("");
                  setCardExpiry("");
                  setCardCvv("");
                  setFormError(null);
                }}
                variant="chip"
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={() => void handleAddCard()}
                variant="cta"
              >
                <Text style={styles.modalBtnSaveText}>Add Card</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Wallet Modal */}
      <Modal
        visible={isWalletModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsWalletModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Digital Wallet</Text>
            <Text style={styles.modalSubtitle}>Link Google Pay or Apple Pay to your account.</Text>

            <View style={styles.walletOptions}>
              <Pressable
                style={styles.walletOptionBtn}
                onPress={() => void handleAddWallet("Google Pay")}
                variant="card"
              >
                <Ionicons name="logo-google" size={24} color={colors.primary} />
                <Text style={styles.walletOptionText}>Google Pay</Text>
              </Pressable>

              <Pressable
                style={styles.walletOptionBtn}
                onPress={() => void handleAddWallet("Apple Pay")}
                variant="card"
              >
                <Ionicons name="logo-apple" size={24} color={colors.primary} />
                <Text style={styles.walletOptionText}>Apple Pay</Text>
              </Pressable>
            </View>

            <View style={styles.modalActionsRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel, { flex: 1 }]}
                onPress={() => setIsWalletModalVisible(false)}
                variant="chip"
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 140,
    gap: 20,
  },
  infoCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  infoEyebrow: {
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 2.2,
  },
  infoTitle: {
    fontSize: theme.typography.h1.fontSize,
    lineHeight: theme.typography.h1.lineHeight,
    color: colors.primary,
    fontWeight: "800",
  },
  infoText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: colors.textSoft,
    maxWidth: 360,
  },
  methodsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: colors.muted,
    marginBottom: 4,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSoft,
    fontWeight: "500",
  },
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  paymentCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSoft,
  },
  appleIcon: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  appleBadgeText: {
    color: colors.surface,
    fontWeight: "800",
  },
  gpayIcon: {
    backgroundColor: colors.primarySoft,
  },
  gpayBadgeText: {
    color: colors.primary,
    fontWeight: "800",
  },
  walletBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  methodName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  methodSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.surface,
  },
  deleteBtn: {
    padding: 8,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },

  // Modals
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
    marginBottom: 6,
  },
  inputShell: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSoft,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.muted,
    marginBottom: 4,
  },
  inputField: {
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },
  rowInputs: {
    flexDirection: "row",
    gap: 12,
  },
  statusTextError: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.danger,
    textAlign: "center",
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
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

  // Wallet selector modal content
  walletOptions: {
    gap: 12,
    marginVertical: 10,
  },
  walletOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  walletOptionText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  footerCtaWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.glass,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    alignItems: "center",
  },
  actionButtonsRowFixed: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
}));
