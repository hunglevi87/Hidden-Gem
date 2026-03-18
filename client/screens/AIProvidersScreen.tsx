import React, { useState, useEffect, useCallback } from "react";
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
import { getApiUrl } from "@/lib/query-client";

const ACTIVE_PROVIDER_KEY = "ai_active_provider";
const GEMINI_API_KEY = "gemini_api_key";
const OPENAI_API_KEY = "openai_api_key";
const OPENAI_MODEL_KEY = "openai_model";
const ANTHROPIC_API_KEY = "anthropic_api_key";
const ANTHROPIC_MODEL_KEY = "anthropic_model";
const OPENFANG_API_KEY = "openfang_api_key";
const OPENFANG_BASE_URL_KEY = "openfang_base_url";
const OPENFANG_MODEL_KEY = "openfang_model";
const CUSTOM_ENDPOINT_KEY = "custom_ai_endpoint";
const CUSTOM_API_KEY = "custom_ai_api_key";
const CUSTOM_MODEL_KEY = "custom_ai_model_name";

type AIProvider = "gemini" | "openai" | "anthropic" | "openfang" | "custom";

const OPENAI_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"];
const ANTHROPIC_MODELS = ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"];

interface ProviderSectionProps {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  isActive: boolean;
  isConfigured: boolean;
  onSetActive: () => void;
  children: React.ReactNode;
}

function ProviderSection({ title, icon, isActive, isConfigured, onSetActive, children }: ProviderSectionProps) {
  return (
    <View style={styles.providerCard}>
      <View style={styles.providerHeader}>
        <View style={styles.providerHeaderLeft}>
          <View style={styles.providerIcon}>
            <Feather name={icon} size={20} color={Colors.dark.primary} />
          </View>
          <View>
            <ThemedText style={styles.providerTitle}>{title}</ThemedText>
            <View style={styles.providerStatusRow}>
              {isConfigured ? (
                <View style={styles.statusBadgeConnected}>
                  <View style={styles.statusDotConnected} />
                  <ThemedText style={styles.statusTextConnected}>Configured</ThemedText>
                </View>
              ) : (
                <View style={styles.statusBadgeDisconnected}>
                  <View style={styles.statusDotDisconnected} />
                  <ThemedText style={styles.statusTextDisconnected}>Not Configured</ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>
        <Pressable
          style={[styles.activeToggle, isActive && styles.activeToggleSelected]}
          onPress={onSetActive}
          disabled={!isConfigured && title !== "Gemini"}
        >
          {isActive ? (
            <Feather name="check-circle" size={20} color={Colors.dark.primary} />
          ) : (
            <Feather name="circle" size={20} color={Colors.dark.textSecondary} />
          )}
        </Pressable>
      </View>
      {children}
    </View>
  );
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS !== "web") {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS !== "web") {
    await SecureStore.setItemAsync(key, value);
  } else {
    await AsyncStorage.setItem(key, value);
  }
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS !== "web") {
    await SecureStore.deleteItemAsync(key);
  } else {
    await AsyncStorage.removeItem(key);
  }
}

export default function AIProvidersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const [activeProvider, setActiveProvider] = useState<AIProvider>("gemini");
  const [geminiKey, setGeminiKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [openaiModel, setOpenaiModel] = useState("gpt-4o");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [anthropicModel, setAnthropicModel] = useState("claude-sonnet-4-20250514");
  const [openfangKey, setOpenfangKey] = useState("");
  const [showOpenfangKey, setShowOpenfangKey] = useState(false);
  const [openfangBaseUrl, setOpenfangBaseUrl] = useState("");
  const [openfangModel, setOpenfangModel] = useState("");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");
  const [showCustomKey, setShowCustomKey] = useState(false);
  const [customModel, setCustomModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<AIProvider | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const active = await AsyncStorage.getItem(ACTIVE_PROVIDER_KEY);
      if (active === "gemini" || active === "openai" || active === "anthropic" || active === "openfang" || active === "custom") {
        setActiveProvider(active);
      }

      const gKey = await secureGet(GEMINI_API_KEY);
      if (gKey) setGeminiKey(gKey);

      const oKey = await secureGet(OPENAI_API_KEY);
      if (oKey) setOpenaiKey(oKey);
      const oModel = await AsyncStorage.getItem(OPENAI_MODEL_KEY);
      if (oModel) setOpenaiModel(oModel);

      const aKey = await secureGet(ANTHROPIC_API_KEY);
      if (aKey) setAnthropicKey(aKey);
      const aModel = await AsyncStorage.getItem(ANTHROPIC_MODEL_KEY);
      if (aModel) setAnthropicModel(aModel);

      const ofKey = await secureGet(OPENFANG_API_KEY);
      if (ofKey) setOpenfangKey(ofKey);
      const ofUrl = await AsyncStorage.getItem(OPENFANG_BASE_URL_KEY);
      if (ofUrl) setOpenfangBaseUrl(ofUrl);
      const ofModel = await AsyncStorage.getItem(OPENFANG_MODEL_KEY);
      if (ofModel) setOpenfangModel(ofModel);

      const cEndpoint = await AsyncStorage.getItem(CUSTOM_ENDPOINT_KEY);
      if (cEndpoint) setCustomEndpoint(cEndpoint);
      const cKey = await secureGet(CUSTOM_API_KEY);
      if (cKey) setCustomApiKey(cKey);
      const cModel = await AsyncStorage.getItem(CUSTOM_MODEL_KEY);
      if (cModel) setCustomModel(cModel);
    } catch (error) {
      console.error("Failed to load AI provider settings:", error);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(ACTIVE_PROVIDER_KEY, activeProvider);

      if (geminiKey) {
        await secureSet(GEMINI_API_KEY, geminiKey.trim());
      } else {
        await secureDelete(GEMINI_API_KEY);
      }

      if (openaiKey) {
        await secureSet(OPENAI_API_KEY, openaiKey.trim());
      } else {
        await secureDelete(OPENAI_API_KEY);
      }
      await AsyncStorage.setItem(OPENAI_MODEL_KEY, openaiModel);

      if (anthropicKey) {
        await secureSet(ANTHROPIC_API_KEY, anthropicKey.trim());
      } else {
        await secureDelete(ANTHROPIC_API_KEY);
      }
      await AsyncStorage.setItem(ANTHROPIC_MODEL_KEY, anthropicModel);

      if (openfangKey) {
        await secureSet(OPENFANG_API_KEY, openfangKey.trim());
      } else {
        await secureDelete(OPENFANG_API_KEY);
      }
      if (openfangBaseUrl) {
        await AsyncStorage.setItem(OPENFANG_BASE_URL_KEY, openfangBaseUrl.trim());
      } else {
        await AsyncStorage.removeItem(OPENFANG_BASE_URL_KEY);
      }
      if (openfangModel) {
        await AsyncStorage.setItem(OPENFANG_MODEL_KEY, openfangModel.trim());
      } else {
        await AsyncStorage.removeItem(OPENFANG_MODEL_KEY);
      }

      if (customEndpoint) {
        await AsyncStorage.setItem(CUSTOM_ENDPOINT_KEY, customEndpoint.trim());
      } else {
        await AsyncStorage.removeItem(CUSTOM_ENDPOINT_KEY);
      }
      if (customApiKey) {
        await secureSet(CUSTOM_API_KEY, customApiKey.trim());
      } else {
        await secureDelete(CUSTOM_API_KEY);
      }
      if (customModel) {
        await AsyncStorage.setItem(CUSTOM_MODEL_KEY, customModel.trim());
      } else {
        await AsyncStorage.removeItem(CUSTOM_MODEL_KEY);
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Saved", "AI provider settings have been saved.");
    } catch (error) {
      Alert.alert("Error", "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (provider: AIProvider) => {
    setTestingProvider(provider);
    try {
      let body: Record<string, string> = { provider };

      if (provider === "openai") {
        if (!openaiKey) {
          Alert.alert("Missing API Key", "Please enter your OpenAI API key first.");
          return;
        }
        body.apiKey = openaiKey.trim();
        body.model = openaiModel;
      } else if (provider === "anthropic") {
        if (!anthropicKey) {
          Alert.alert("Missing API Key", "Please enter your Anthropic API key first.");
          return;
        }
        body.apiKey = anthropicKey.trim();
        body.model = anthropicModel;
      } else if (provider === "openfang") {
        if (!openfangKey) {
          Alert.alert("Missing API Key", "Please enter your OpenFang API key first.");
          return;
        }
        body.apiKey = openfangKey.trim();
        if (openfangBaseUrl) body.endpoint = openfangBaseUrl.trim();
        if (openfangModel) body.model = openfangModel.trim();
      } else if (provider === "custom") {
        if (!customEndpoint) {
          Alert.alert("Missing Endpoint", "Please enter your custom endpoint URL first.");
          return;
        }
        body.endpoint = customEndpoint.trim();
        if (customApiKey) body.apiKey = customApiKey.trim();
        if (customModel) body.model = customModel.trim();
      } else if (provider === "gemini") {
        if (geminiKey) body.apiKey = geminiKey.trim();
      }

      const url = new URL("/api/ai-providers/test", getApiUrl());
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Success", result.message || `Connected to ${provider} successfully!`);
      } else {
        Alert.alert("Connection Failed", result.message || `Could not connect to ${provider}.`);
      }
    } catch (error: any) {
      Alert.alert("Connection Error", error.message || "Could not reach the server.");
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSetActive = (provider: AIProvider) => {
    setActiveProvider(provider);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const geminiConfigured = true;
  const openaiConfigured = !!openaiKey;
  const anthropicConfigured = !!anthropicKey;
  const openfangConfigured = !!openfangKey;
  const customConfigured = !!customEndpoint;

  const providerLabel = (p: AIProvider) => {
    switch (p) {
      case "gemini": return "Gemini";
      case "openai": return "OpenAI";
      case "anthropic": return "Anthropic";
      case "openfang": return "OpenFang";
      case "custom": return "Custom / Local";
    }
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
            <Feather name="cpu" size={32} color={Colors.dark.primary} />
          </View>
          <ThemedText style={styles.headerTitle}>Emma's Brain</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Configure which AI models power Emma's appraisals and listing generation
          </ThemedText>
        </View>

        <View style={styles.activeProviderBanner}>
          <Feather name="zap" size={16} color={Colors.dark.primary} />
          <ThemedText style={styles.activeProviderText}>
            Active: {providerLabel(activeProvider)}
          </ThemedText>
        </View>

        <ProviderSection
          title="Gemini"
          icon="cpu"
          isActive={activeProvider === "gemini"}
          isConfigured={geminiConfigured}
          onSetActive={() => handleSetActive("gemini")}
        >
          <View style={styles.providerBody}>
            <View style={styles.infoRow}>
              <Feather name="check-circle" size={14} color={Colors.dark.success} />
              <ThemedText style={styles.infoText}>Available via Replit AI integrations</ThemedText>
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Custom API Key (Optional)</ThemedText>
              <View style={styles.inputContainer}>
                <TextInput
                  value={geminiKey}
                  onChangeText={setGeminiKey}
                  placeholder="Use your own Gemini API key"
                  placeholderTextColor={Colors.dark.textSecondary}
                  secureTextEntry={!showGeminiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                  testID="input-gemini-key"
                />
                <Pressable onPress={() => setShowGeminiKey(!showGeminiKey)} style={styles.eyeButton}>
                  <Feather name={showGeminiKey ? "eye-off" : "eye"} size={18} color={Colors.dark.textSecondary} />
                </Pressable>
              </View>
              <ThemedText style={styles.inputHint}>Leave blank to use Replit integration</ThemedText>
            </View>
            <Pressable
              style={({ pressed }) => [styles.testButton, pressed && { opacity: 0.8 }]}
              onPress={() => testConnection("gemini")}
              disabled={testingProvider !== null}
              testID="button-test-gemini"
            >
              {testingProvider === "gemini" ? (
                <ActivityIndicator color={Colors.dark.text} size="small" />
              ) : (
                <>
                  <Feather name="wifi" size={16} color={Colors.dark.text} />
                  <ThemedText style={styles.testButtonText}>Test</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </ProviderSection>

        <ProviderSection
          title="OpenAI"
          icon="aperture"
          isActive={activeProvider === "openai"}
          isConfigured={openaiConfigured}
          onSetActive={() => handleSetActive("openai")}
        >
          <View style={styles.providerBody}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>API Key</ThemedText>
              <View style={styles.inputContainer}>
                <TextInput
                  value={openaiKey}
                  onChangeText={setOpenaiKey}
                  placeholder="sk-..."
                  placeholderTextColor={Colors.dark.textSecondary}
                  secureTextEntry={!showOpenaiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                  testID="input-openai-key"
                />
                <Pressable onPress={() => setShowOpenaiKey(!showOpenaiKey)} style={styles.eyeButton}>
                  <Feather name={showOpenaiKey ? "eye-off" : "eye"} size={18} color={Colors.dark.textSecondary} />
                </Pressable>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Model</ThemedText>
              <View style={styles.modelSelector}>
                {OPENAI_MODELS.map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.modelChip, openaiModel === m && styles.modelChipActive]}
                    onPress={() => setOpenaiModel(m)}
                  >
                    <ThemedText style={[styles.modelChipText, openaiModel === m && styles.modelChipTextActive]}>
                      {m}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.testButton, pressed && { opacity: 0.8 }]}
              onPress={() => testConnection("openai")}
              disabled={testingProvider !== null}
              testID="button-test-openai"
            >
              {testingProvider === "openai" ? (
                <ActivityIndicator color={Colors.dark.text} size="small" />
              ) : (
                <>
                  <Feather name="wifi" size={16} color={Colors.dark.text} />
                  <ThemedText style={styles.testButtonText}>Test</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </ProviderSection>

        <ProviderSection
          title="Anthropic"
          icon="triangle"
          isActive={activeProvider === "anthropic"}
          isConfigured={anthropicConfigured}
          onSetActive={() => handleSetActive("anthropic")}
        >
          <View style={styles.providerBody}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>API Key</ThemedText>
              <View style={styles.inputContainer}>
                <TextInput
                  value={anthropicKey}
                  onChangeText={setAnthropicKey}
                  placeholder="sk-ant-..."
                  placeholderTextColor={Colors.dark.textSecondary}
                  secureTextEntry={!showAnthropicKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                  testID="input-anthropic-key"
                />
                <Pressable onPress={() => setShowAnthropicKey(!showAnthropicKey)} style={styles.eyeButton}>
                  <Feather name={showAnthropicKey ? "eye-off" : "eye"} size={18} color={Colors.dark.textSecondary} />
                </Pressable>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Model</ThemedText>
              <View style={styles.modelSelector}>
                {ANTHROPIC_MODELS.map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.modelChip, anthropicModel === m && styles.modelChipActive]}
                    onPress={() => setAnthropicModel(m)}
                  >
                    <ThemedText style={[styles.modelChipText, anthropicModel === m && styles.modelChipTextActive]}>
                      {m.replace("claude-", "").replace("-20250514", "").replace("-20241022", "").replace("-20240307", "")}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.testButton, pressed && { opacity: 0.8 }]}
              onPress={() => testConnection("anthropic")}
              disabled={testingProvider !== null}
              testID="button-test-anthropic"
            >
              {testingProvider === "anthropic" ? (
                <ActivityIndicator color={Colors.dark.text} size="small" />
              ) : (
                <>
                  <Feather name="wifi" size={16} color={Colors.dark.text} />
                  <ThemedText style={styles.testButtonText}>Test</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </ProviderSection>

        <ProviderSection
          title="OpenFang"
          icon="layers"
          isActive={activeProvider === "openfang"}
          isConfigured={openfangConfigured}
          onSetActive={() => handleSetActive("openfang")}
        >
          <View style={styles.providerBody}>
            <View style={styles.infoRow}>
              <Feather name="info" size={14} color={Colors.dark.textSecondary} />
              <ThemedText style={styles.infoText}>Multi-model AI routing with automatic vision model selection</ThemedText>
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>API Key</ThemedText>
              <View style={styles.inputContainer}>
                <TextInput
                  value={openfangKey}
                  onChangeText={setOpenfangKey}
                  placeholder="Your OpenFang API key"
                  placeholderTextColor={Colors.dark.textSecondary}
                  secureTextEntry={!showOpenfangKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                  testID="input-openfang-key"
                />
                <Pressable onPress={() => setShowOpenfangKey(!showOpenfangKey)} style={styles.eyeButton}>
                  <Feather name={showOpenfangKey ? "eye-off" : "eye"} size={18} color={Colors.dark.textSecondary} />
                </Pressable>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Base URL (Optional)</ThemedText>
              <View style={styles.inputContainer}>
                <Feather name="globe" size={18} color={Colors.dark.textSecondary} style={styles.inputIcon} />
                <TextInput
                  value={openfangBaseUrl}
                  onChangeText={setOpenfangBaseUrl}
                  placeholder="https://api.openfang.io"
                  placeholderTextColor={Colors.dark.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={styles.textInput}
                  testID="input-openfang-base-url"
                />
              </View>
              <ThemedText style={styles.inputHint}>Leave blank to use env default or OPENFANG_BASE_URL</ThemedText>
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Model (Optional)</ThemedText>
              <View style={styles.inputContainer}>
                <TextInput
                  value={openfangModel}
                  onChangeText={setOpenfangModel}
                  placeholder="auto (recommended)"
                  placeholderTextColor={Colors.dark.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                  testID="input-openfang-model"
                />
              </View>
              <ThemedText style={styles.inputHint}>Leave blank for automatic model routing</ThemedText>
            </View>
            <Pressable
              style={({ pressed }) => [styles.testButton, pressed && { opacity: 0.8 }]}
              onPress={() => testConnection("openfang")}
              disabled={testingProvider !== null}
              testID="button-test-openfang"
            >
              {testingProvider === "openfang" ? (
                <ActivityIndicator color={Colors.dark.text} size="small" />
              ) : (
                <>
                  <Feather name="wifi" size={16} color={Colors.dark.text} />
                  <ThemedText style={styles.testButtonText}>Test</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </ProviderSection>

        <ProviderSection
          title="Custom / Local"
          icon="server"
          isActive={activeProvider === "custom"}
          isConfigured={customConfigured}
          onSetActive={() => handleSetActive("custom")}
        >
          <View style={styles.providerBody}>
            <View style={styles.infoRow}>
              <Feather name="info" size={14} color={Colors.dark.textSecondary} />
              <ThemedText style={styles.infoText}>Ollama, LM Studio, or any OpenAI-compatible API</ThemedText>
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Endpoint URL</ThemedText>
              <View style={styles.inputContainer}>
                <Feather name="globe" size={18} color={Colors.dark.textSecondary} style={styles.inputIcon} />
                <TextInput
                  value={customEndpoint}
                  onChangeText={setCustomEndpoint}
                  placeholder="http://localhost:11434/v1"
                  placeholderTextColor={Colors.dark.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={styles.textInput}
                  testID="input-custom-endpoint"
                />
              </View>
              <ThemedText style={styles.inputHint}>Base URL of the OpenAI-compatible API</ThemedText>
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>API Key (Optional)</ThemedText>
              <View style={styles.inputContainer}>
                <TextInput
                  value={customApiKey}
                  onChangeText={setCustomApiKey}
                  placeholder="Leave blank if not required"
                  placeholderTextColor={Colors.dark.textSecondary}
                  secureTextEntry={!showCustomKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                  testID="input-custom-api-key"
                />
                <Pressable onPress={() => setShowCustomKey(!showCustomKey)} style={styles.eyeButton}>
                  <Feather name={showCustomKey ? "eye-off" : "eye"} size={18} color={Colors.dark.textSecondary} />
                </Pressable>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Model Name</ThemedText>
              <View style={styles.inputContainer}>
                <TextInput
                  value={customModel}
                  onChangeText={setCustomModel}
                  placeholder="e.g., llava, llama3.2-vision"
                  placeholderTextColor={Colors.dark.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                  testID="input-custom-model"
                />
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.testButton, pressed && { opacity: 0.8 }]}
              onPress={() => testConnection("custom")}
              disabled={testingProvider !== null}
              testID="button-test-custom"
            >
              {testingProvider === "custom" ? (
                <ActivityIndicator color={Colors.dark.text} size="small" />
              ) : (
                <>
                  <Feather name="wifi" size={16} color={Colors.dark.text} />
                  <ThemedText style={styles.testButtonText}>Test Connection</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </ProviderSection>

        <Pressable
          style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.8 }, saving && { opacity: 0.6 }]}
          onPress={saveAll}
          disabled={saving}
          testID="button-save-ai-providers"
        >
          {saving ? (
            <ActivityIndicator color={Colors.dark.buttonText} size="small" />
          ) : (
            <>
              <Feather name="save" size={18} color={Colors.dark.buttonText} />
              <ThemedText style={styles.saveButtonText}>Save All Settings</ThemedText>
            </>
          )}
        </Pressable>
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
    marginBottom: Spacing["2xl"],
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
  activeProviderBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
    gap: Spacing.sm,
  },
  activeProviderText: {
    ...Typography.body,
    color: Colors.dark.primary,
    fontWeight: "600",
  },
  providerCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  providerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  providerHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.dark.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  providerTitle: {
    ...Typography.body,
    color: Colors.dark.text,
    fontWeight: "600",
  },
  providerStatusRow: {
    flexDirection: "row",
    marginTop: 2,
  },
  statusBadgeConnected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusBadgeDisconnected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDotConnected: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.success,
  },
  statusDotDisconnected: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.textSecondary,
  },
  statusTextConnected: {
    ...Typography.caption,
    color: Colors.dark.success,
  },
  statusTextDisconnected: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
  },
  activeToggle: {
    padding: Spacing.sm,
  },
  activeToggleSelected: {},
  providerBody: {
    padding: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
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
    backgroundColor: Colors.dark.backgroundSecondary,
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
    ...Typography.small,
    color: Colors.dark.text,
    paddingVertical: Spacing.md,
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  inputHint: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xs,
  },
  modelSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  modelChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  modelChipActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  modelChipText: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    fontWeight: "500",
  },
  modelChipTextActive: {
    color: Colors.dark.buttonText,
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  testButtonText: {
    ...Typography.small,
    color: Colors.dark.text,
    fontWeight: "600",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.primary,
    borderRadius: BorderRadius.md,
    height: Spacing.buttonHeight,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  saveButtonText: {
    ...Typography.button,
    color: Colors.dark.buttonText,
  },
});
