import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert, Platform, ActivityIndicator, Linking } from "react-native";
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
import { useNavigation } from "@react-navigation/native";

const WOOCOMMERCE_URL_KEY = "woocommerce_url";
const WOOCOMMERCE_CONSUMER_KEY = "woocommerce_consumer_key";
const WOOCOMMERCE_CONSUMER_SECRET = "woocommerce_consumer_secret";
const WOOCOMMERCE_STATUS_KEY = "woocommerce_status";

export interface WooCommerceSettings {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export default function WooCommerceSettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [showConsumerKey, setShowConsumerKey] = useState(false);
  const [showConsumerSecret, setShowConsumerSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const url = await AsyncStorage.getItem(WOOCOMMERCE_URL_KEY);
      const status = await AsyncStorage.getItem(WOOCOMMERCE_STATUS_KEY);
      
      if (url) setStoreUrl(url);
      
      if (Platform.OS !== "web") {
        const key = await SecureStore.getItemAsync(WOOCOMMERCE_CONSUMER_KEY);
        const secret = await SecureStore.getItemAsync(WOOCOMMERCE_CONSUMER_SECRET);
        if (key) setConsumerKey(key);
        if (secret) setConsumerSecret(secret);
        setIsConfigured(status === "connected");
      } else {
        const key = await AsyncStorage.getItem(WOOCOMMERCE_CONSUMER_KEY);
        const secret = await AsyncStorage.getItem(WOOCOMMERCE_CONSUMER_SECRET);
        if (key) setConsumerKey(key);
        if (secret) setConsumerSecret(secret);
        setIsConfigured(status === "connected");
      }
    } catch (error) {
      console.error("Failed to load WooCommerce settings:", error);
    }
  };

  const saveSettings = async () => {
    if (!storeUrl || !consumerKey || !consumerSecret) {
      Alert.alert("Missing Information", "Please fill in all fields.");
      return;
    }

    let formattedUrl = storeUrl.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = "https://" + formattedUrl;
    }
    if (formattedUrl.endsWith("/")) {
      formattedUrl = formattedUrl.slice(0, -1);
    }

    setSaving(true);
    try {
      await AsyncStorage.setItem(WOOCOMMERCE_URL_KEY, formattedUrl);
      await AsyncStorage.setItem(WOOCOMMERCE_STATUS_KEY, "connected");
      
      if (Platform.OS !== "web") {
        await SecureStore.setItemAsync(WOOCOMMERCE_CONSUMER_KEY, consumerKey.trim());
        await SecureStore.setItemAsync(WOOCOMMERCE_CONSUMER_SECRET, consumerSecret.trim());
      } else {
        await AsyncStorage.setItem(WOOCOMMERCE_CONSUMER_KEY, consumerKey.trim());
        await AsyncStorage.setItem(WOOCOMMERCE_CONSUMER_SECRET, consumerSecret.trim());
      }
      
      setStoreUrl(formattedUrl);
      setIsConfigured(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Saved", "WooCommerce settings have been saved securely.");
    } catch (error) {
      Alert.alert("Error", "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!storeUrl || !consumerKey || !consumerSecret) {
      Alert.alert("Missing Information", "Please fill in all fields before testing.");
      return;
    }

    setTesting(true);
    try {
      let formattedUrl = storeUrl.trim();
      if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
        formattedUrl = "https://" + formattedUrl;
      }
      if (formattedUrl.endsWith("/")) {
        formattedUrl = formattedUrl.slice(0, -1);
      }

      const credentials = btoa(`${consumerKey.trim()}:${consumerSecret.trim()}`);
      const response = await fetch(`${formattedUrl}/wp-json/wc/v3/system_status`, {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      if (response.ok) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Success", "Connection to WooCommerce store verified!");
      } else if (response.status === 401) {
        Alert.alert("Authentication Failed", "Please check your consumer key and secret.");
      } else {
        Alert.alert("Connection Failed", `Status: ${response.status}. Please check your store URL.`);
      }
    } catch (error: any) {
      Alert.alert("Connection Error", "Could not connect to store. Please check the URL and ensure WooCommerce REST API is enabled.");
    } finally {
      setTesting(false);
    }
  };

  const clearSettings = () => {
    Alert.alert("Disconnect WooCommerce", "Are you sure you want to remove your WooCommerce connection?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem(WOOCOMMERCE_URL_KEY);
            await AsyncStorage.removeItem(WOOCOMMERCE_STATUS_KEY);
            
            if (Platform.OS !== "web") {
              await SecureStore.deleteItemAsync(WOOCOMMERCE_CONSUMER_KEY);
              await SecureStore.deleteItemAsync(WOOCOMMERCE_CONSUMER_SECRET);
            } else {
              await AsyncStorage.removeItem(WOOCOMMERCE_CONSUMER_KEY);
              await AsyncStorage.removeItem(WOOCOMMERCE_CONSUMER_SECRET);
            }
            
            setStoreUrl("");
            setConsumerKey("");
            setConsumerSecret("");
            setIsConfigured(false);
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          } catch (error) {
            Alert.alert("Error", "Failed to disconnect.");
          }
        },
      },
    ]);
  };

  const openWooCommerceHelp = () => {
    Linking.openURL("https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication");
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
      >
        <View style={styles.headerSection}>
          <View style={styles.iconCircle}>
            <Feather name="shopping-bag" size={32} color={Colors.dark.primary} />
          </View>
          <ThemedText style={styles.headerTitle}>WooCommerce</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Connect your WooCommerce store to publish listings directly
          </ThemedText>
        </View>

        {Platform.OS === "web" ? (
          <View style={styles.webWarning}>
            <Feather name="alert-triangle" size={16} color={Colors.dark.warning} />
            <ThemedText style={styles.webWarningText}>
              For best security, use the mobile app to store credentials securely.
            </ThemedText>
          </View>
        ) : null}

        {isConfigured ? (
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <ThemedText style={styles.statusText}>Connected</ThemedText>
            </View>
            <ThemedText style={styles.statusUrl}>{storeUrl}</ThemedText>
          </View>
        ) : null}

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Store URL</ThemedText>
            <View style={styles.inputContainer}>
              <Feather name="globe" size={18} color={Colors.dark.textSecondary} style={styles.inputIcon} />
              <TextInput
                value={storeUrl}
                onChangeText={setStoreUrl}
                placeholder="yourstore.com"
                placeholderTextColor={Colors.dark.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={styles.textInput}
                testID="input-woo-url"
              />
            </View>
            <ThemedText style={styles.inputHint}>
              Your WooCommerce store domain (e.g., mystore.com)
            </ThemedText>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Consumer Key</ThemedText>
            <View style={styles.inputContainer}>
              <Feather name="key" size={18} color={Colors.dark.textSecondary} style={styles.inputIcon} />
              <TextInput
                value={consumerKey}
                onChangeText={setConsumerKey}
                placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                placeholderTextColor={Colors.dark.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showConsumerKey}
                style={[styles.textInput, styles.secretInput]}
                testID="input-woo-key"
              />
              <Pressable onPress={() => setShowConsumerKey(!showConsumerKey)} style={styles.eyeButton}>
                <Feather name={showConsumerKey ? "eye-off" : "eye"} size={18} color={Colors.dark.textSecondary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Consumer Secret</ThemedText>
            <View style={styles.inputContainer}>
              <Feather name="lock" size={18} color={Colors.dark.textSecondary} style={styles.inputIcon} />
              <TextInput
                value={consumerSecret}
                onChangeText={setConsumerSecret}
                placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                placeholderTextColor={Colors.dark.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showConsumerSecret}
                style={[styles.textInput, styles.secretInput]}
                testID="input-woo-secret"
              />
              <Pressable onPress={() => setShowConsumerSecret(!showConsumerSecret)} style={styles.eyeButton}>
                <Feather name={showConsumerSecret ? "eye-off" : "eye"} size={18} color={Colors.dark.textSecondary} />
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.helpLink} onPress={openWooCommerceHelp}>
            <Feather name="help-circle" size={16} color={Colors.dark.primary} />
            <ThemedText style={styles.helpLinkText}>How to get API credentials</ThemedText>
          </Pressable>
        </View>

        <View style={styles.buttonSection}>
          <Pressable
            style={({ pressed }) => [styles.testButton, pressed && { opacity: 0.8 }, testing && { opacity: 0.6 }]}
            onPress={testConnection}
            disabled={testing || saving}
            testID="button-test-woo"
          >
            {testing ? (
              <ActivityIndicator color={Colors.dark.text} size="small" />
            ) : (
              <>
                <Feather name="wifi" size={18} color={Colors.dark.text} />
                <ThemedText style={styles.testButtonText}>Test Connection</ThemedText>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.8 }, saving && { opacity: 0.6 }]}
            onPress={saveSettings}
            disabled={saving || testing}
            testID="button-save-woo"
          >
            {saving ? (
              <ActivityIndicator color={Colors.dark.buttonText} size="small" />
            ) : (
              <>
                <Feather name="save" size={18} color={Colors.dark.buttonText} />
                <ThemedText style={styles.saveButtonText}>Save Settings</ThemedText>
              </>
            )}
          </Pressable>

          {isConfigured ? (
            <Pressable
              style={({ pressed }) => [styles.disconnectButton, pressed && { opacity: 0.8 }]}
              onPress={clearSettings}
              testID="button-disconnect-woo"
            >
              <Feather name="x-circle" size={18} color={Colors.dark.error} />
              <ThemedText style={styles.disconnectButtonText}>Disconnect</ThemedText>
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
