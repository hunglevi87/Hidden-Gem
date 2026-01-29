import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { useAuthContext } from "@/contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

interface SettingsRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  isDestructive?: boolean;
  showChevron?: boolean;
  status?: "connected" | "not_connected";
}

function SettingsRow({ icon, label, value, onPress, isDestructive, showChevron = true, status }: SettingsRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingsRowLeft}>
        <View style={[styles.iconContainer, isDestructive && styles.iconContainerDestructive]}>
          <Feather name={icon} size={18} color={isDestructive ? Colors.dark.error : Colors.dark.primary} />
        </View>
        <ThemedText style={[styles.settingsLabel, isDestructive && styles.settingsLabelDestructive]}>
          {label}
        </ThemedText>
      </View>
      <View style={styles.settingsRowRight}>
        {status ? (
          <View style={[styles.statusBadge, status === "connected" ? styles.statusBadgeConnected : styles.statusBadgeDisconnected]}>
            <View style={[styles.statusDot, status === "connected" ? styles.statusDotConnected : styles.statusDotDisconnected]} />
            <ThemedText style={[styles.statusBadgeText, status === "connected" ? styles.statusTextConnected : styles.statusTextDisconnected]}>
              {status === "connected" ? "Connected" : "Not Connected"}
            </ThemedText>
          </View>
        ) : value ? (
          <ThemedText style={styles.settingsValue}>{value}</ThemedText>
        ) : null}
        {showChevron && onPress ? (
          <Feather name="chevron-right" size={20} color={Colors.dark.textSecondary} />
        ) : null}
      </View>
    </Pressable>
  );
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut } = useAuthContext();
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [huggingfaceApiKey, setHuggingfaceApiKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showHuggingfaceKey, setShowHuggingfaceKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wooCommerceStatus, setWooCommerceStatus] = useState("Not configured");
  const [ebayStatus, setEbayStatus] = useState("Not configured");

  const loadIntegrationStatus = useCallback(async () => {
    try {
      const wooStatus = await AsyncStorage.getItem("woocommerce_status");
      if (wooStatus === "connected") {
        setWooCommerceStatus("Connected");
      } else {
        setWooCommerceStatus("Not configured");
      }

      const ebayStatus = await AsyncStorage.getItem("ebay_status");
      if (ebayStatus === "connected") {
        setEbayStatus("Connected");
      } else {
        setEbayStatus("Not configured");
      }
    } catch (error) {
      console.error("Failed to load integration status:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadIntegrationStatus();
    }, [loadIntegrationStatus])
  );

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const gemini = await AsyncStorage.getItem("gemini_api_key");
      const huggingface = await AsyncStorage.getItem("huggingface_api_key");
      if (gemini) setGeminiApiKey(gemini);
      if (huggingface) setHuggingfaceApiKey(huggingface);
    } catch (error) {
      console.error("Failed to load API keys:", error);
    }
  };

  const saveApiKeys = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem("gemini_api_key", geminiApiKey);
      await AsyncStorage.setItem("huggingface_api_key", huggingfaceApiKey);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Saved", "API keys have been saved securely.");
    } catch (error) {
      Alert.alert("Error", "Failed to save API keys.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          } catch (error) {
            Alert.alert("Error", "Failed to sign out.");
          }
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title="AI Configuration">
          <View style={styles.apiKeySection}>
            <View style={styles.apiKeyHeader}>
              <Feather name="cpu" size={18} color={Colors.dark.primary} />
              <ThemedText style={styles.apiKeyTitle}>Google Gemini API Key</ThemedText>
            </View>
            <View style={styles.apiKeyInputContainer}>
              <TextInput
                value={geminiApiKey}
                onChangeText={setGeminiApiKey}
                placeholder="Enter your Gemini API key"
                placeholderTextColor={Colors.dark.textSecondary}
                secureTextEntry={!showGeminiKey}
                style={styles.apiKeyInput}
                testID="input-gemini-key"
              />
              <Pressable onPress={() => setShowGeminiKey(!showGeminiKey)} style={styles.eyeButton}>
                <Feather name={showGeminiKey ? "eye-off" : "eye"} size={18} color={Colors.dark.textSecondary} />
              </Pressable>
            </View>
            <ThemedText style={styles.apiKeyHint}>
              Get your key from Google AI Studio
            </ThemedText>
          </View>

          <View style={styles.apiKeySection}>
            <View style={styles.apiKeyHeader}>
              <Feather name="box" size={18} color={Colors.dark.primary} />
              <ThemedText style={styles.apiKeyTitle}>HuggingFace API Key</ThemedText>
            </View>
            <View style={styles.apiKeyInputContainer}>
              <TextInput
                value={huggingfaceApiKey}
                onChangeText={setHuggingfaceApiKey}
                placeholder="Enter your HuggingFace API key"
                placeholderTextColor={Colors.dark.textSecondary}
                secureTextEntry={!showHuggingfaceKey}
                style={styles.apiKeyInput}
                testID="input-huggingface-key"
              />
              <Pressable onPress={() => setShowHuggingfaceKey(!showHuggingfaceKey)} style={styles.eyeButton}>
                <Feather name={showHuggingfaceKey ? "eye-off" : "eye"} size={18} color={Colors.dark.textSecondary} />
              </Pressable>
            </View>
            <ThemedText style={styles.apiKeyHint}>
              Get your key from huggingface.co/settings/tokens
            </ThemedText>
          </View>

          <Pressable
            style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.8 }, saving && { opacity: 0.6 }]}
            onPress={saveApiKeys}
            disabled={saving}
            testID="button-save-keys"
          >
            {saving ? (
              <ActivityIndicator color={Colors.dark.buttonText} size="small" />
            ) : (
              <>
                <Feather name="save" size={18} color={Colors.dark.buttonText} />
                <ThemedText style={styles.saveButtonText}>Save API Keys</ThemedText>
              </>
            )}
          </Pressable>
        </SettingsSection>

        <View style={styles.accountHeader}>
          <View style={styles.avatarContainer}>
            <ThemedText style={styles.avatarText}>
              {user?.email?.charAt(0).toUpperCase() || "?"}
            </ThemedText>
          </View>
          <View style={styles.accountInfo}>
            <ThemedText style={styles.accountEmail}>{user?.email || "Unknown"}</ThemedText>
            <ThemedText style={styles.accountLabel}>Signed in</ThemedText>
          </View>
          <Pressable
            style={({ pressed }) => [styles.signOutButton, pressed && { opacity: 0.7 }]}
            onPress={handleSignOut}
            testID="button-sign-out"
          >
            <Feather name="log-out" size={18} color={Colors.dark.error} />
            <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
          </Pressable>
        </View>

        <SettingsSection title="Connected Marketplaces">
          <SettingsRow
            icon="shopping-bag"
            label="WooCommerce"
            status={wooCommerceStatus === "Connected" ? "connected" : "not_connected"}
            onPress={() => navigation.navigate("WooCommerceSettings")}
          />
          <SettingsRow
            icon="tag"
            label="eBay"
            status={ebayStatus === "Connected" ? "connected" : "not_connected"}
            onPress={() => navigation.navigate("EbaySettings")}
          />
        </SettingsSection>

        <SettingsSection title="App">
          <SettingsRow icon="info" label="Version" value="1.0.0" showChevron={false} />
          <SettingsRow icon="file-text" label="Terms of Service" onPress={() => navigation.navigate("TermsOfService")} />
          <SettingsRow icon="shield" label="Privacy Policy" onPress={() => navigation.navigate("PrivacyPolicy")} />
        </SettingsSection>
      </ScrollView>
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
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    ...Typography.small,
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  sectionContent: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  settingsRowPressed: {
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  settingsRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  settingsRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.dark.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainerDestructive: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  settingsLabel: {
    ...Typography.body,
    color: Colors.dark.text,
  },
  settingsLabelDestructive: {
    color: Colors.dark.error,
  },
  settingsValue: {
    ...Typography.small,
    color: Colors.dark.textSecondary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  statusBadgeConnected: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  statusBadgeDisconnected: {
    backgroundColor: "rgba(156, 163, 175, 0.15)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotConnected: {
    backgroundColor: Colors.dark.success,
  },
  statusDotDisconnected: {
    backgroundColor: Colors.dark.textSecondary,
  },
  statusBadgeText: {
    ...Typography.caption,
    fontWeight: "500",
  },
  statusTextConnected: {
    color: Colors.dark.success,
  },
  statusTextDisconnected: {
    color: Colors.dark.textSecondary,
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...Typography.h4,
    color: Colors.dark.buttonText,
    fontWeight: "700",
  },
  accountInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  accountEmail: {
    ...Typography.body,
    color: Colors.dark.text,
    fontWeight: "600",
  },
  accountLabel: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  signOutText: {
    ...Typography.small,
    color: Colors.dark.error,
    fontWeight: "600",
  },
  apiKeySection: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  apiKeyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  apiKeyTitle: {
    ...Typography.body,
    fontWeight: "600",
    color: Colors.dark.text,
  },
  apiKeyInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  apiKeyInput: {
    flex: 1,
    ...Typography.small,
    color: Colors.dark.text,
    paddingVertical: Spacing.md,
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  apiKeyHint: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.sm,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.primary,
    margin: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  saveButtonText: {
    ...Typography.button,
    color: Colors.dark.buttonText,
  },
});
