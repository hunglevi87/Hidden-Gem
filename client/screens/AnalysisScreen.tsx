import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import type { HandmadeDetails } from "@shared/types";

type AnalysisRouteProp = RouteProp<RootStackParamList, "Analysis">;

type AppraisalState = "appraising" | "reviewing" | "editing" | "retrying" | "stashed";
type AIProvider = "gemini" | "openai" | "anthropic" | "openfang" | "custom";

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

interface AnalysisResult {
  // Legacy fields
  title: string;
  description: string;
  category: string;
  estimatedValue: string;
  condition: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  tags: string[];
  // New enhanced fields
  brand: string;
  subtitle: string;
  shortDescription: string;
  fullDescription: string;
  estimatedValueLow: number;
  estimatedValueHigh: number;
  suggestedListPrice: number;
  confidence: "high" | "medium" | "low";
  authenticity: "Authentic" | "Likely Authentic" | "Uncertain" | "Likely Counterfeit" | "Counterfeit";
  authenticityConfidence: number;
  authenticityDetails: string;
  authenticationTips: string[];
  marketAnalysis: string;
  aspects: Record<string, string[]>;
  ebayCategoryId: string;
  wooCategory: string;
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS !== "web") {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

async function getAnalysisProviderPayload(): Promise<Record<string, string>> {
  const active = await AsyncStorage.getItem(ACTIVE_PROVIDER_KEY);
  const provider: AIProvider =
    active === "gemini" || active === "openai" || active === "anthropic" || active === "openfang" || active === "custom"
      ? active
      : "gemini";

  const payload: Record<string, string> = { provider };

  if (provider === "gemini") {
    const key = await secureGet(GEMINI_API_KEY);
    if (key) payload.apiKey = key;
    return payload;
  }

  if (provider === "openai") {
    const key = await secureGet(OPENAI_API_KEY);
    const model = await AsyncStorage.getItem(OPENAI_MODEL_KEY);
    if (key) payload.apiKey = key;
    if (model) payload.model = model;
    return payload;
  }

  if (provider === "anthropic") {
    const key = await secureGet(ANTHROPIC_API_KEY);
    const model = await AsyncStorage.getItem(ANTHROPIC_MODEL_KEY);
    if (key) payload.apiKey = key;
    if (model) payload.model = model;
    return payload;
  }

  if (provider === "openfang") {
    const key = await secureGet(OPENFANG_API_KEY);
    const endpoint = await AsyncStorage.getItem(OPENFANG_BASE_URL_KEY);
    const model = await AsyncStorage.getItem(OPENFANG_MODEL_KEY);
    if (key) payload.apiKey = key;
    if (endpoint) payload.endpoint = endpoint;
    if (model) payload.model = model;
    return payload;
  }

  const endpoint = await AsyncStorage.getItem(CUSTOM_ENDPOINT_KEY);
  const key = await secureGet(CUSTOM_API_KEY);
  const model = await AsyncStorage.getItem(CUSTOM_MODEL_KEY);
  if (endpoint) payload.endpoint = endpoint;
  if (key) payload.apiKey = key;
  if (model) payload.model = model;
  return payload;
}

const CONDITION_OPTIONS = ["New", "Like New", "Very Good", "Good", "Acceptable", "For Parts"];

const AUTHENTICITY_COLORS: Record<string, string> = {
  "Authentic": Colors.dark.success,
  "Likely Authentic": "#22c55e",
  "Uncertain": Colors.dark.warning || "#f59e0b",
  "Likely Counterfeit": Colors.dark.error,
  "Counterfeit": "#dc2626",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  "high": Colors.dark.success,
  "medium": Colors.dark.warning || "#f59e0b",
  "low": Colors.dark.error,
};

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<AnalysisRouteProp>();
  const queryClient = useQueryClient();
  const { fullImageUri, labelImageUri, itemType, handmadeDetails } = route.params;

  const [state, setState] = useState<AppraisalState>("appraising");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [editedResult, setEditedResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryFeedback, setRetryFeedback] = useState("");
  const [aspectKey, setAspectKey] = useState("");
  const [aspectValue, setAspectValue] = useState("");

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/stash", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stash/count"] });
      setState("stashed");
    },
    onError: () => {
      Alert.alert("Error", "Failed to save item. Please try again.");
    },
  });

  useEffect(() => {
    analyzeImages();
  }, []);

  const analyzeImages = async () => {
    setState("appraising");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("fullImage", { uri: fullImageUri, type: "image/jpeg", name: "full.jpg" } as any);
      if (labelImageUri) {
        formData.append("labelImage", { uri: labelImageUri, type: "image/jpeg", name: "label.jpg" } as any);
      }
      if (itemType) formData.append("itemType", itemType);
      if (handmadeDetails) formData.append("handmadeDetails", JSON.stringify(handmadeDetails));
      const providerPayload = await getAnalysisProviderPayload();
      for (const [key, value] of Object.entries(providerPayload)) {
        formData.append(key, value);
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Analysis failed");

      const result = await response.json();
      setAnalysisResult(result);
      setEditedResult(result);
      setState("reviewing");
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Failed to analyze images. Please try again.");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleRetryAnalysis = async () => {
    if (!analysisResult || !retryFeedback.trim()) return;
    
    setState("appraising");
    
    try {
      const formData = new FormData();
      formData.append("fullImage", { uri: fullImageUri, type: "image/jpeg", name: "full.jpg" } as any);
      formData.append("labelImage", { uri: labelImageUri, type: "image/jpeg", name: "label.jpg" } as any);
      formData.append("previousResult", JSON.stringify(analysisResult));
      formData.append("feedback", retryFeedback);
      const providerPayload = await getAnalysisProviderPayload();
      for (const [key, value] of Object.entries(providerPayload)) {
        formData.append(key, value);
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/analyze/retry`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Retry analysis failed");

      const result = await response.json();
      setAnalysisResult(result);
      setEditedResult(result);
      setRetryFeedback("");
      setState("reviewing");
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error("Retry error:", err);
      Alert.alert("Error", "Failed to re-analyze. Please try again.");
      setState("retrying");
    }
  };

  const handleSave = () => {
    const dataToSave = state === "editing" ? editedResult : analysisResult;
    if (!dataToSave) return;

    saveMutation.mutate({
      ...dataToSave,
      fullImageUrl: fullImageUri,
      labelImageUrl: labelImageUri,
      aiAnalysis: dataToSave,
      itemType: itemType || "designer",
      handmadeDetails: handmadeDetails || null,
    });
  };

  const handleEdit = () => {
    setState("editing");
  };

  const handleRetry = () => {
    setState("retrying");
  };

  const handleBackToReview = () => {
    setState("reviewing");
  };

  const handleRescan = () => {
    navigation.goBack();
  };

  const handleStashedComplete = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    navigation.navigate("Main");
  };

  const updateEditedField = (field: keyof AnalysisResult, value: any) => {
    if (!editedResult) return;
    setEditedResult({ ...editedResult, [field]: value });
  };

  const addAspect = () => {
    if (!editedResult || !aspectKey.trim() || !aspectValue.trim()) return;
    const newAspects = { ...editedResult.aspects, [aspectKey.trim()]: [aspectValue.trim()] };
    setEditedResult({ ...editedResult, aspects: newAspects });
    setAspectKey("");
    setAspectValue("");
  };

  const removeAspect = (key: string) => {
    if (!editedResult) return;
    const { [key]: _, ...rest } = editedResult.aspects;
    setEditedResult({ ...editedResult, aspects: rest });
  };

  // ==================== RENDER STATES ====================

  if (state === "appraising") {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
          <View style={styles.loadingAnimation}>
            <Feather name="star" size={48} color={Colors.dark.primary} />
          </View>
          <ThemedText style={styles.loadingTitle}>Emma is Looking...</ThemedText>
          <ThemedText style={styles.loadingSubtitle}>Emma is identifying and appraising your find</ThemedText>
          <ActivityIndicator size="large" color={Colors.dark.primary} style={{ marginTop: Spacing["2xl"] }} />
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.errorContainer, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
          <View style={styles.errorIcon}>
            <Feather name="alert-circle" size={48} color={Colors.dark.error} />
          </View>
          <ThemedText style={styles.errorTitle}>Analysis Failed</ThemedText>
          <ThemedText style={styles.errorSubtitle}>{error}</ThemedText>
          <Pressable style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.8 }]} onPress={analyzeImages}>
            <Feather name="refresh-cw" size={20} color={Colors.dark.buttonText} />
            <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (state === "stashed") {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.successContainer, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
          <View style={styles.successIconLarge}>
            <Feather name="check-circle" size={64} color={Colors.dark.success} />
          </View>
          <ThemedText style={styles.successTitle}>Saved to Stash!</ThemedText>
          <ThemedText style={styles.successSubtitle}>Your item has been added to your collection</ThemedText>
          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8 }]} onPress={handleStashedComplete}>
            <ThemedText style={styles.primaryButtonText}>View My Stash</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (state === "retrying") {
    return (
      <ThemedView style={styles.container}>
        <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
          <View style={styles.imagesRow}>
            <View style={[styles.imageContainer, !labelImageUri && { flex: undefined, width: 140 }]}>
              <Image source={{ uri: fullImageUri }} style={styles.previewImage} resizeMode="cover" />
              <ThemedText style={styles.imageLabel}>{itemType === "handmade" ? "Product" : "Full Item"}</ThemedText>
            </View>
            {labelImageUri ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: labelImageUri }} style={styles.previewImage} resizeMode="cover" />
                <ThemedText style={styles.imageLabel}>Label</ThemedText>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Tell Emma What to Fix</ThemedText>
            <ThemedText style={styles.cardSubtitle}>Describe what Emma missed or got wrong</ThemedText>
            
            <TextInput
              style={styles.feedbackInput}
              multiline
              numberOfLines={4}
              placeholder="e.g., This is actually a vintage Coach bag from the 1990s, not a generic handbag. The serial number is visible in the second image..."
              placeholderTextColor={Colors.dark.textSecondary}
              value={retryFeedback}
              onChangeText={setRetryFeedback}
            />

            <View style={styles.buttonRow}>
              <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.8 }]} onPress={handleBackToReview}>
                <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
              </Pressable>
              <Pressable 
                style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8 }, !retryFeedback.trim() && { opacity: 0.5 }]} 
                onPress={handleRetryAnalysis}
                disabled={!retryFeedback.trim()}
              >
                <Feather name="refresh-cw" size={18} color={Colors.dark.buttonText} />
                <ThemedText style={styles.primaryButtonText}>Re-Appraise with Emma</ThemedText>
              </Pressable>
            </View>
          </View>
        </KeyboardAwareScrollViewCompat>
      </ThemedView>
    );
  }

  if (state === "editing" && editedResult) {
    return (
      <ThemedView style={styles.container}>
        <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Edit Listing</ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Title ({editedResult.title.length}/80)</ThemedText>
              <TextInput
                style={styles.textInput}
                value={editedResult.title}
                onChangeText={(v) => updateEditedField("title", v.slice(0, 80))}
                maxLength={80}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Subtitle ({editedResult.subtitle?.length || 0}/55)</ThemedText>
              <TextInput
                style={styles.textInput}
                value={editedResult.subtitle || ""}
                onChangeText={(v) => updateEditedField("subtitle", v.slice(0, 55))}
                maxLength={55}
                placeholder="Short subtitle for eBay"
                placeholderTextColor={Colors.dark.textSecondary}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.inputLabel}>List Price ($)</ThemedText>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={editedResult.suggestedListPrice?.toString() || ""}
                  onChangeText={(v) => updateEditedField("suggestedListPrice", parseFloat(v) || 0)}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.inputLabel}>Condition</ThemedText>
                <View style={styles.conditionButtons}>
                  {CONDITION_OPTIONS.map((c) => (
                    <Pressable
                      key={c}
                      style={[styles.conditionChip, editedResult.condition === c && styles.conditionChipActive]}
                      onPress={() => updateEditedField("condition", c)}
                    >
                      <ThemedText style={[styles.conditionChipText, editedResult.condition === c && styles.conditionChipTextActive]}>
                        {c}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Short Description</ThemedText>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                multiline
                numberOfLines={3}
                value={editedResult.shortDescription || ""}
                onChangeText={(v) => updateEditedField("shortDescription", v)}
                placeholder="Brief description for WooCommerce"
                placeholderTextColor={Colors.dark.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Full Description</ThemedText>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                multiline
                numberOfLines={6}
                value={editedResult.fullDescription || ""}
                onChangeText={(v) => updateEditedField("fullDescription", v)}
                placeholder="Detailed HTML description for eBay"
                placeholderTextColor={Colors.dark.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Item Specifics</ThemedText>
              <View style={styles.aspectInputRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="Key (e.g., Brand)"
                  placeholderTextColor={Colors.dark.textSecondary}
                  value={aspectKey}
                  onChangeText={setAspectKey}
                />
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="Value (e.g., Nike)"
                  placeholderTextColor={Colors.dark.textSecondary}
                  value={aspectValue}
                  onChangeText={setAspectValue}
                />
                <Pressable style={styles.addAspectButton} onPress={addAspect}>
                  <Feather name="plus" size={20} color={Colors.dark.primary} />
                </Pressable>
              </View>
              {Object.entries(editedResult.aspects || {}).map(([key, values]) => (
                <View key={key} style={styles.aspectRow}>
                  <ThemedText style={styles.aspectKey}>{key}:</ThemedText>
                  <ThemedText style={styles.aspectValue}>{values.join(", ")}</ThemedText>
                  <Pressable onPress={() => removeAspect(key)}>
                    <Feather name="x" size={16} color={Colors.dark.error} />
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.inputLabel}>eBay Category ID</ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={editedResult.ebayCategoryId || ""}
                  onChangeText={(v) => updateEditedField("ebayCategoryId", v)}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.inputLabel}>WooCommerce Category</ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={editedResult.wooCategory || ""}
                  onChangeText={(v) => updateEditedField("wooCategory", v)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Tags (comma separated)</ThemedText>
              <TextInput
                style={styles.textInput}
                value={editedResult.tags?.join(", ") || ""}
                onChangeText={(v) => updateEditedField("tags", v.split(",").map((t) => t.trim()).filter(Boolean))}
                placeholder="vintage, collectible, rare"
                placeholderTextColor={Colors.dark.textSecondary}
              />
            </View>

            <View style={styles.buttonRow}>
              <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.8 }]} onPress={handleBackToReview}>
                <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
              </Pressable>
              <Pressable 
                style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8 }, saveMutation.isPending && { opacity: 0.6 }]} 
                onPress={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color={Colors.dark.buttonText} size="small" />
                ) : (
                  <>
                    <Feather name="save" size={18} color={Colors.dark.buttonText} />
                    <ThemedText style={styles.primaryButtonText}>Save to Stash</ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAwareScrollViewCompat>
      </ThemedView>
    );
  }

  // ==================== REVIEWING STATE ====================
  if (state === "reviewing" && analysisResult) {
    const result = analysisResult;
    
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
          <View style={styles.imagesRow}>
            <View style={[styles.imageContainer, !labelImageUri && { flex: undefined, width: 140 }]}>
              <Image source={{ uri: fullImageUri }} style={styles.previewImage} resizeMode="cover" />
              <ThemedText style={styles.imageLabel}>{itemType === "handmade" ? "Product" : "Full Item"}</ThemedText>
            </View>
            {labelImageUri ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: labelImageUri }} style={styles.previewImage} resizeMode="cover" />
                <ThemedText style={styles.imageLabel}>Label</ThemedText>
              </View>
            ) : null}
          </View>

          {/* Header */}
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View style={styles.brandBadge}>
                <ThemedText style={styles.brandText}>{result.brand || "Unknown Brand"}</ThemedText>
              </View>
              {itemType === "handmade" && (
                <View style={styles.handmadeBadge}>
                  <Feather name="feather" size={12} color="#a78bfa" />
                  <ThemedText style={styles.handmadeBadgeText}>Handmade</ThemedText>
                </View>
              )}
              <View style={[styles.confidenceBadge, { backgroundColor: CONFIDENCE_COLORS[result.confidence] + "20" }]}>
                <View style={[styles.confidenceDot, { backgroundColor: CONFIDENCE_COLORS[result.confidence] }]} />
                <ThemedText style={[styles.confidenceText, { color: CONFIDENCE_COLORS[result.confidence] }]}>
                  {result.confidence} confidence
                </ThemedText>
              </View>
            </View>
            <ThemedText style={styles.itemTitle}>{result.title}</ThemedText>
            {result.subtitle ? <ThemedText style={styles.itemSubtitle}>{result.subtitle}</ThemedText> : null}
          </View>

          {/* Value Card */}
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Market Valuation</ThemedText>
            <View style={styles.valueRangeRow}>
              <View style={styles.valueBox}>
                <ThemedText style={styles.valueLabel}>Value Range</ThemedText>
                <ThemedText style={styles.valueAmount}>${result.estimatedValueLow} - ${result.estimatedValueHigh}</ThemedText>
              </View>
              <View style={styles.valueBox}>
                <ThemedText style={styles.valueLabel}>Suggested List Price</ThemedText>
                <ThemedText style={styles.listPrice}>${result.suggestedListPrice}</ThemedText>
              </View>
            </View>
            <View style={styles.conditionRow}>
              <ThemedText style={styles.conditionLabel}>Condition:</ThemedText>
              <ThemedText style={styles.conditionValue}>{result.condition}</ThemedText>
            </View>
          </View>

          {/* Authentication */}
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Authentication Assessment</ThemedText>
            <View style={styles.authHeader}>
              <View style={[styles.authBadge, { backgroundColor: AUTHENTICITY_COLORS[result.authenticity] + "20" }]}>
                <ThemedText style={[styles.authBadgeText, { color: AUTHENTICITY_COLORS[result.authenticity] }]}>
                  {result.authenticity}
                </ThemedText>
              </View>
              <View style={styles.confidenceBar}>
                <View style={[styles.confidenceFill, { width: `${result.authenticityConfidence}%`, backgroundColor: AUTHENTICITY_COLORS[result.authenticity] }]} />
              </View>
              <ThemedText style={styles.confidencePercent}>{result.authenticityConfidence}%</ThemedText>
            </View>
            <ThemedText style={styles.authDetails}>{result.authenticityDetails}</ThemedText>
            
            <ThemedText style={styles.sectionSubtitle}>Authentication Tips</ThemedText>
            {result.authenticationTips?.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Feather name="shield" size={14} color={Colors.dark.primary} style={styles.tipIcon} />
                <ThemedText style={styles.tipText}>{i + 1}. {tip}</ThemedText>
              </View>
            ))}
          </View>

          {/* Market Analysis */}
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Market Analysis</ThemedText>
            <ThemedText style={styles.marketText}>{result.marketAnalysis}</ThemedText>
          </View>

          {/* Listing Preview */}
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Generated Listing Preview</ThemedText>
            <View style={styles.listingPreview}>
              <ThemedText style={styles.previewLabel}>eBay Title</ThemedText>
              <ThemedText style={styles.previewText}>{result.seoTitle}</ThemedText>
              
              <ThemedText style={styles.previewLabel}>Category</ThemedText>
              <ThemedText style={styles.previewText}>{result.category} (eBay: {result.ebayCategoryId})</ThemedText>
              
              {result.aspects && Object.keys(result.aspects).length > 0 && (
                <>
                  <ThemedText style={styles.previewLabel}>Item Specifics</ThemedText>
                  {Object.entries(result.aspects).slice(0, 4).map(([key, values]) => (
                    <ThemedText key={key} style={styles.aspectPreview}>• {key}: {values.join(", ")}</ThemedText>
                  ))}
                </>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8 }]} onPress={handleSave}>
              <Feather name="check" size={20} color={Colors.dark.buttonText} />
              <ThemedText style={styles.primaryButtonText}>Looks Good — Save</ThemedText>
            </Pressable>
            
            <View style={styles.secondaryButtons}>
              <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.8 }]} onPress={handleEdit}>
                <Feather name="edit-2" size={18} color={Colors.dark.text} />
                <ThemedText style={styles.secondaryButtonText}>Edit</ThemedText>
              </Pressable>
              
              <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.8 }]} onPress={handleRetry}>
                <Feather name="refresh-cw" size={18} color={Colors.dark.text} />
                <ThemedText style={styles.secondaryButtonText}>Try Again</ThemedText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.backgroundRoot },
  scrollContent: { padding: Spacing.lg },
  
  // Loading & Error States
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing["2xl"] },
  loadingAnimation: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center", marginBottom: Spacing["2xl"] },
  loadingTitle: { ...Typography.h3, color: Colors.dark.text, marginBottom: Spacing.sm },
  loadingSubtitle: { ...Typography.body, color: Colors.dark.textSecondary, textAlign: "center" },
  
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing["2xl"] },
  errorIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(239, 68, 68, 0.15)", alignItems: "center", justifyContent: "center", marginBottom: Spacing["2xl"] },
  errorTitle: { ...Typography.h3, color: Colors.dark.text, marginBottom: Spacing.sm },
  errorSubtitle: { ...Typography.body, color: Colors.dark.textSecondary, textAlign: "center", marginBottom: Spacing["2xl"] },
  retryButton: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.dark.primary, paddingHorizontal: Spacing["2xl"], paddingVertical: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.sm },
  retryButtonText: { ...Typography.button, color: Colors.dark.buttonText },
  
  // Success State
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing["2xl"] },
  successIconLarge: { width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(34, 197, 94, 0.15)", alignItems: "center", justifyContent: "center", marginBottom: Spacing["2xl"] },
  successTitle: { ...Typography.h2, color: Colors.dark.text, marginBottom: Spacing.sm },
  successSubtitle: { ...Typography.body, color: Colors.dark.textSecondary, marginBottom: Spacing["2xl"] },
  
  // Images
  imagesRow: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.lg },
  imageContainer: { flex: 1 },
  previewImage: { width: "100%", aspectRatio: 1, borderRadius: BorderRadius.md, marginBottom: Spacing.xs },
  imageLabel: { ...Typography.caption, color: Colors.dark.textSecondary, textAlign: "center" },
  
  // Cards
  card: { backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  cardTitle: { ...Typography.h4, color: Colors.dark.text, marginBottom: Spacing.md },
  cardSubtitle: { ...Typography.body, color: Colors.dark.textSecondary, marginBottom: Spacing.md },
  
  // Review State
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md },
  brandBadge: { backgroundColor: Colors.dark.primary + "20", paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  brandText: { ...Typography.small, color: Colors.dark.primary, fontWeight: "600" },
  handmadeBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#a78bfa20", paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  handmadeBadgeText: { fontSize: 11, fontWeight: "600", color: "#a78bfa" },
  confidenceBadge: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  confidenceDot: { width: 8, height: 8, borderRadius: 4 },
  confidenceText: { ...Typography.caption, fontWeight: "500" },
  itemTitle: { ...Typography.h3, color: Colors.dark.text, marginBottom: Spacing.xs },
  itemSubtitle: { ...Typography.body, color: Colors.dark.textSecondary },
  
  // Value
  valueRangeRow: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.md },
  valueBox: { flex: 1, backgroundColor: Colors.dark.backgroundSecondary, padding: Spacing.md, borderRadius: BorderRadius.sm },
  valueLabel: { ...Typography.caption, color: Colors.dark.textSecondary, marginBottom: Spacing.xs },
  valueAmount: { ...Typography.h4, color: Colors.dark.text, fontWeight: "700" },
  listPrice: { ...Typography.h4, color: Colors.dark.primary, fontWeight: "700" },
  conditionRow: { flexDirection: "row", gap: Spacing.sm },
  conditionLabel: { ...Typography.body, color: Colors.dark.textSecondary },
  conditionValue: { ...Typography.body, color: Colors.dark.text, fontWeight: "600" },
  
  // Authentication
  authHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  authBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  authBadgeText: { ...Typography.small, fontWeight: "600" },
  confidenceBar: { flex: 1, height: 6, backgroundColor: Colors.dark.border, borderRadius: 3, overflow: "hidden" },
  confidenceFill: { height: "100%", borderRadius: 3 },
  confidencePercent: { ...Typography.small, color: Colors.dark.textSecondary, minWidth: 35 },
  authDetails: { ...Typography.body, color: Colors.dark.text, marginBottom: Spacing.md },
  sectionSubtitle: { ...Typography.small, color: Colors.dark.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.sm, textTransform: "uppercase" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, marginBottom: Spacing.sm },
  tipIcon: { marginTop: 2 },
  tipText: { ...Typography.body, color: Colors.dark.text, flex: 1 },
  
  // Market
  marketText: { ...Typography.body, color: Colors.dark.text, lineHeight: 22 },
  
  // Listing Preview
  listingPreview: { backgroundColor: Colors.dark.backgroundSecondary, padding: Spacing.md, borderRadius: BorderRadius.sm },
  previewLabel: { ...Typography.caption, color: Colors.dark.textSecondary, marginTop: Spacing.sm },
  previewText: { ...Typography.body, color: Colors.dark.text },
  aspectPreview: { ...Typography.body, color: Colors.dark.textSecondary },
  
  // Buttons
  actionButtons: { gap: Spacing.md, marginTop: Spacing.md },
  primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.dark.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.sm },
  primaryButtonText: { ...Typography.button, color: Colors.dark.buttonText },
  secondaryButtons: { flexDirection: "row", gap: Spacing.md },
  secondaryButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.sm },
  secondaryButtonText: { ...Typography.button, color: Colors.dark.text },
  buttonRow: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg },
  
  // Edit Form
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { ...Typography.small, color: Colors.dark.textSecondary, marginBottom: Spacing.xs },
  textInput: { backgroundColor: Colors.dark.backgroundSecondary, borderRadius: BorderRadius.sm, padding: Spacing.md, color: Colors.dark.text, ...Typography.body, borderWidth: 1, borderColor: Colors.dark.border },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  rowInputs: { flexDirection: "row", gap: Spacing.md },
  conditionButtons: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  conditionChip: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm, backgroundColor: Colors.dark.backgroundSecondary, borderWidth: 1, borderColor: Colors.dark.border },
  conditionChipActive: { backgroundColor: Colors.dark.primary, borderColor: Colors.dark.primary },
  conditionChipText: { ...Typography.caption, color: Colors.dark.textSecondary },
  conditionChipTextActive: { color: Colors.dark.buttonText },
  aspectInputRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.sm },
  addAspectButton: { width: 44, height: 44, borderRadius: BorderRadius.sm, backgroundColor: Colors.dark.backgroundSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.dark.border },
  aspectRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.xs },
  aspectKey: { ...Typography.body, color: Colors.dark.textSecondary, fontWeight: "600" },
  aspectValue: { ...Typography.body, color: Colors.dark.text, flex: 1 },
  
  // Retry
  feedbackInput: { backgroundColor: Colors.dark.backgroundSecondary, borderRadius: BorderRadius.sm, padding: Spacing.md, color: Colors.dark.text, ...Typography.body, minHeight: 100, textAlignVertical: "top", borderWidth: 1, borderColor: Colors.dark.border },
});
