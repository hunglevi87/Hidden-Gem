import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const EBAY_CLIENT_ID_KEY = "ebay_client_id";
const EBAY_CLIENT_SECRET_KEY = "ebay_client_secret";
const EBAY_REFRESH_TOKEN_KEY = "ebay_refresh_token";
const EBAY_ENVIRONMENT_KEY = "ebay_environment";
const EBAY_STATUS_KEY = "ebay_status";

export interface EbaySettings {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  environment: "sandbox" | "production";
}

export default function EbaySettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">(
    "sandbox",
  );
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showRefreshToken, setShowRefreshToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const env = await AsyncStorage.getItem(EBAY_ENVIRONMENT_KEY);
      const status = await AsyncStorage.getItem(EBAY_STATUS_KEY);

      if (env === "production" || env === "sandbox") {
        setEnvironment(env);
      }

      if (Platform.OS !== "web") {
        const id = await SecureStore.getItemAsync(EBAY_CLIENT_ID_KEY);
        const secret = await SecureStore.getItemAsync(EBAY_CLIENT_SECRET_KEY);
        const token = await SecureStore.getItemAsync(EBAY_REFRESH_TOKEN_KEY);
        if (id) setClientId(id);
        if (secret) setClientSecret(secret);
        if (token) setRefreshToken(token);
        setIsConfigured(status === "connected");
      } else {
        const id = await AsyncStorage.getItem(EBAY_CLIENT_ID_KEY);
        const secret = await AsyncStorage.getItem(EBAY_CLIENT_SECRET_KEY);
        const token = await AsyncStorage.getItem(EBAY_REFRESH_TOKEN_KEY);
        if (id) setClientId(id);
        if (secret) setClientSecret(secret);
        if (token) setRefreshToken(token);
        setIsConfigured(status === "connected");
      }
    } catch (error) {
      console.error("Failed to load eBay settings:", error);
    }
  };

  const saveSettings = async () => {
    if (!clientId || !clientSecret) {
      Alert.alert(
        "Missing Information",
        "Please fill in at least Client ID and Client Secret.",
      );
      return;
    }

    setSaving(true);
    try {
      await AsyncStorage.setItem(EBAY_ENVIRONMENT_KEY, environment);
      await AsyncStorage.setItem(EBAY_STATUS_KEY, "connected");

      if (Platform.OS !== "web") {
        await SecureStore.setItemAsync(EBAY_CLIENT_ID_KEY, clientId.trim());
        await SecureStore.setItemAsync(
          EBAY_CLIENT_SECRET_KEY,
          clientSecret.trim(),
        );
        if (refreshToken) {
          await SecureStore.setItemAsync(
            EBAY_REFRESH_TOKEN_KEY,
            refreshToken.trim(),
          );
        }
      } else {
        await AsyncStorage.setItem(EBAY_CLIENT_ID_KEY, clientId.trim());
        await AsyncStorage.setItem(EBAY_CLIENT_SECRET_KEY, clientSecret.trim());
        if (refreshToken) {
          await AsyncStorage.setItem(
            EBAY_REFRESH_TOKEN_KEY,
            refreshToken.trim(),
          );
        }
      }

      setIsConfigured(!!(clientId && clientSecret));
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Saved", "eBay settings have been saved securely.");
    } catch (error) {
      Alert.alert("Error", "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!clientId || !clientSecret) {
      Alert.alert(
        "Missing Information",
        "Please fill in Client ID and Client Secret before testing.",
      );
      return;
    }

    setTesting(true);
    try {
      const baseUrl =
        environment === "production"
          ? "https://api.ebay.com"
          : "https://api.sandbox.ebay.com";

      const credentials = btoa(`${clientId.trim()}:${clientSecret.trim()}`);
      const response = await fetch(`${baseUrl}/identity/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
      });

      if (response.ok) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Success", `Connected to eBay ${environment} environment!`);
      } else if (response.status === 401) {
        Alert.alert(
          "Authentication Failed",
          "Please check your Client ID and Client Secret.",
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert(
          "Connection Failed",
          errorData.error_description || `Status: ${response.status}`,
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Connection Error",
        "Could not connect to eBay. Please check your credentials.",
      );
    } finally {
      setTesting(false);
    }
  };

  const clearSettings = () => {
    Alert.alert(
      "Disconnect eBay",
      "Are you sure you want to remove your eBay connection?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(EBAY_ENVIRONMENT_KEY);
              await AsyncStorage.removeItem(EBAY_STATUS_KEY);

              if (Platform.OS !== "web") {
                await SecureStore.deleteItemAsync(EBAY_CLIENT_ID_KEY);
                await SecureStore.deleteItemAsync(EBAY_CLIENT_SECRET_KEY);
                await SecureStore.deleteItemAsync(EBAY_REFRESH_TOKEN_KEY);
              } else {
                await AsyncStorage.removeItem(EBAY_CLIENT_ID_KEY);
                await AsyncStorage.removeItem(EBAY_CLIENT_SECRET_KEY);
                await AsyncStorage.removeItem(EBAY_REFRESH_TOKEN_KEY);
              }

              setClientId("");
              setClientSecret("");
              setRefreshToken("");
              setEnvironment("sandbox");
              setIsConfigured(false);
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
              }
            } catch (error) {
              Alert.alert("Error", "Failed to disconnect.");
            }
          },
        },
      ],
    );
  };

  const openEbayDevPortal = () => {
    Linking.openURL("https://developer.ebay.com/my/keys");
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing["2xl"],
          },
        ]}
      >
        <View style={styles.headerSection}>
          <View style={styles.iconCircle}>
            <Feather name="tag" size={32} color={Colors.dark.primary} />
          </View>
          <ThemedText style={styles.headerTitle}>eBay</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Connect your eBay seller account to list items directly
          </ThemedText>
        </View>

        {Platform.OS === "web" ? (
          <View style={styles.webWarning}>
            <Feather
              name="alert-triangle"
              size={16}
              color={Colors.dark.warning}
            />
            <ThemedText style={styles.webWarningText}>
              For best security, use the mobile app to store credentials
              securely.
            </ThemedText>
          </View>
        ) : null}

        {isConfigured ? (
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <ThemedText style={styles.statusText}>Connected</ThemedText>
            </View>
            <ThemedText style={styles.statusUrl}>
              {environment === "production" ? "Production" : "Sandbox"}{" "}
              Environment
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.formSection}>
          <View style={styles.environmentToggle}>
            <ThemedText style={styles.inputLabel}>Environment</ThemedText>
            <View style={styles.toggleRow}>
              <Pressable
                style={[
                  styles.toggleButton,
                  environment === "sandbox" && styles.toggleButtonActive,
                ]}
                onPress={() => setEnvironment("sandbox")}
              >
                <ThemedText
                  style={[
                    styles.toggleText,
                    environment === "sandbox" && styles.toggleTextActive,
                  ]}
                >
                  Sandbox
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.toggleButton,
                  environment === "production" && styles.toggleButtonActive,
                ]}
                onPress={() => setEnvironment("production")}
              >
                <ThemedText
                  style={[
                    styles.toggleText,
                    environment === "production" && styles.toggleTextActive,
                  ]}
                >
                  Production
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>
              Client ID (App ID)
            </ThemedText>
            <View style={styles.inputContainer}>
              <Feather
                name="user"
                size={18}
                color={Colors.dark.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                value={clientId}
                onChangeText={setClientId}
                placeholder="Your eBay Client ID"
                placeholderTextColor={Colors.dark.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.textInput}
                testID="input-ebay-client-id"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>
              Client Secret (Cert ID)
            </ThemedText>
            <View style={styles.inputContainer}>
              <Feather
                name="key"
                size={18}
                color={Colors.dark.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                value={clientSecret}
                onChangeText={setClientSecret}
                placeholder="Your eBay Client Secret"
                placeholderTextColor={Colors.dark.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showClientSecret}
                style={[styles.textInput, styles.secretInput]}
                testID="input-ebay-client-secret"
              />
              <Pressable
                onPress={() => setShowClientSecret(!showClientSecret)}
                style={styles.eyeButton}
              >
                <Feather
                  name={showClientSecret ? "eye-off" : "eye"}
                  size={18}
                  color={Colors.dark.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>
              Refresh Token (Optional)
            </ThemedText>
            <View style={styles.inputContainer}>
              <Feather
                name="refresh-cw"
                size={18}
                color={Colors.dark.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                value={refreshToken}
                onChangeText={setRefreshToken}
                placeholder="User OAuth refresh token"
                placeholderTextColor={Colors.dark.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showRefreshToken}
                style={[styles.textInput, styles.secretInput]}
                testID="input-ebay-refresh-token"
              />
              <Pressable
                onPress={() => setShowRefreshToken(!showRefreshToken)}
                style={styles.eyeButton}
              >
                <Feather
                  name={showRefreshToken ? "eye-off" : "eye"}
                  size={18}
                  color={Colors.dark.textSecondary}
                />
              </Pressable>
            </View>
            <ThemedText style={styles.inputHint}>
              Required for creating listings on behalf of your account
            </ThemedText>
          </View>

          <Pressable style={styles.helpLink} onPress={openEbayDevPortal}>
            <Feather
              name="external-link"
              size={16}
              color={Colors.dark.primary}
            />
            <ThemedText style={styles.helpLinkText}>
              Open eBay Developer Portal
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.buttonSection}>
          <Pressable
            style={({ pressed }) => [
              styles.testButton,
              pressed && { opacity: 0.8 },
              testing && { opacity: 0.6 },
            ]}
            onPress={testConnection}
            disabled={testing || saving}
            testID="button-test-ebay"
          >
            {testing ? (
              <ActivityIndicator color={Colors.dark.text} size="small" />
            ) : (
              <>
                <Feather name="wifi" size={18} color={Colors.dark.text} />
                <ThemedText style={styles.testButtonText}>
                  Test Connection
                </ThemedText>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && { opacity: 0.8 },
              saving && { opacity: 0.6 },
            ]}
            onPress={saveSettings}
            disabled={saving || testing}
            testID="button-save-ebay"
          >
            {saving ? (
              <ActivityIndicator color={Colors.dark.buttonText} size="small" />
            ) : (
              <>
                <Feather name="save" size={18} color={Colors.dark.buttonText} />
                <ThemedText style={styles.saveButtonText}>
                  Save Settings
                </ThemedText>
              </>
            )}
          </Pressable>

          {isConfigured ? (
            <Pressable
              style={({ pressed }) => [
                styles.disconnectButton,
                pressed && { opacity: 0.8 },
              ]}
              onPress={clearSettings}
              testID="button-disconnect-ebay"
            >
              <Feather name="x-circle" size={18} color={Colors.dark.error} />
              <ThemedText style={styles.disconnectButtonText}>
                Disconnect
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  statusCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
    borderWidth: 1,
    borderColor: Colors.dark.success,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.success,
    marginRight: Spacing.sm,
  },
  statusText: {
    ...Typography.body,
    color: Colors.dark.success,
    fontWeight: "600",
  },
  statusUrl: {
    ...Typography.small,
    color: Colors.dark.textSecondary,
  },
  formSection: {
    marginBottom: Spacing["2xl"],
  },
  environmentToggle: {
    marginBottom: Spacing.xl,
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.sm,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.sm - 2,
  },
  toggleButtonActive: {
    backgroundColor: Colors.dark.primary,
  },
  toggleText: {
    ...Typography.small,
    color: Colors.dark.textSecondary,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: Colors.dark.buttonText,
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    ...Typography.small,
    color: Colors.dark.text,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  textInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.dark.text,
    paddingVertical: Spacing.md,
  },
  secretInput: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
  },
  eyeButton: {
    padding: Spacing.sm,
  },
  inputHint: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xs,
  },
  helpLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  helpLinkText: {
    ...Typography.small,
    color: Colors.dark.primary,
  },
  buttonSection: {
    gap: Spacing.md,
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    height: Spacing.buttonHeight,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  testButtonText: {
    ...Typography.button,
    color: Colors.dark.text,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.primary,
    borderRadius: BorderRadius.md,
    height: Spacing.buttonHeight,
    gap: Spacing.sm,
  },
  saveButtonText: {
    ...Typography.button,
    color: Colors.dark.buttonText,
  },
  disconnectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderRadius: BorderRadius.md,
    height: Spacing.buttonHeight,
    gap: Spacing.sm,
  },
  disconnectButtonText: {
    ...Typography.button,
    color: Colors.dark.error,
  },
  webWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  webWarningText: {
    ...Typography.caption,
    color: Colors.dark.warning,
    flex: 1,
  },
});
