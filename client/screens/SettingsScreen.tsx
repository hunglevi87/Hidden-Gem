import React, { useState, useEffect } from "react";
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
}

function SettingsRow({ icon, label, value, onPress, isDestructive, showChevron = true }: SettingsRowProps) {
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
        {value ? <ThemedText style={styles.settingsValue}>{value}</ThemedText> : null}
        {showChevron && onPress ? (
          <Feather name="chevron-right" size={20} color={Colors.dark.textSecondary} />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { user, signOut } = useAuthContext();
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [huggingfaceApiKey, setHuggingfaceApiKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showHuggingfaceKey, setShowHuggingfaceKey] = useState(false);
  const [saving, setSaving] = useState(false);

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

        <SettingsSection title="Integrations">
          <SettingsRow icon="shopping-bag" label="WooCommerce" value="Not configured" onPress={() => {}} />
          <SettingsRow icon="tag" label="eBay" value="Not configured" onPress={() => {}} />
        </SettingsSection>

        <SettingsSection title="Account">
          <SettingsRow icon="mail" label="Email" value={user?.email || "Unknown"} showChevron={false} />
          <SettingsRow icon="log-out" label="Sign Out" onPress={handleSignOut} isDestructive showChevron={false} />
        </SettingsSection>

        <SettingsSection title="App">
          <SettingsRow icon="info" label="Version" value="1.0.0" showChevron={false} />
          <SettingsRow icon="file-text" label="Terms of Service" onPress={() => {}} />
          <SettingsRow icon="shield" label="Privacy Policy" onPress={() => {}} />
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
