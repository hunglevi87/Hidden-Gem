import React, { type ComponentProps, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
  Linking,
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
import { apiRequest } from "@/lib/query-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type ListingEditorRouteProp = RouteProp<RootStackParamList, "ListingEditor">;

type Platform_ = "ebay" | "poshmark" | "depop" | "stripe";

type FeatherIconName = ComponentProps<typeof Feather>["name"];

interface ExportResult {
  success?: boolean;
  listingUrl?: string;
  productId?: string;
  error?: string;
}

const PLATFORMS: { key: Platform_; label: string; icon: FeatherIconName; color: string }[] = [
  { key: "ebay", label: "eBay", icon: "shopping-bag", color: "#E53238" },
  { key: "poshmark", label: "Poshmark", icon: "heart", color: "#C11C84" },
  { key: "depop", label: "Depop", icon: "tag", color: "#FF4040" },
  { key: "stripe", label: "Stripe", icon: "credit-card", color: "#635BFF" },
];

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS !== "web") {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

export default function ListingEditorScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ListingEditorRouteProp>();
  const queryClient = useQueryClient();

  const { analysisResult, fullImageUri, labelImageUri, itemType, stashItemId } = route.params;

  const [activeTab, setActiveTab] = useState<Platform_>("ebay");
  const [editedVersions, setEditedVersions] = useState(() => {
    const pv = analysisResult.platformVersions;
    return {
      ebay: pv?.ebay
        ? { ...pv.ebay }
        : { title: analysisResult.seoTitle || analysisResult.title, description: analysisResult.fullDescription || analysisResult.description, tags: analysisResult.tags || [], suggestedPrice: analysisResult.suggestedListPrice || 0 },
      poshmark: pv?.poshmark
        ? { ...pv.poshmark }
        : { title: analysisResult.title, description: analysisResult.shortDescription || analysisResult.description, tags: analysisResult.tags || [], suggestedPrice: analysisResult.suggestedListPrice || 0 },
      depop: pv?.depop
        ? { ...pv.depop }
        : { title: analysisResult.title.toLowerCase(), description: analysisResult.shortDescription || analysisResult.description, tags: analysisResult.tags || [], suggestedPrice: Math.round((analysisResult.suggestedListPrice || 0) * 0.9) },
      stripe: pv?.stripe
        ? { ...pv.stripe }
        : { title: analysisResult.title, description: analysisResult.shortDescription || analysisResult.description, tags: analysisResult.tags || [], suggestedPrice: analysisResult.suggestedListPrice || 0 },
    };
  });

  const [globalPrice, setGlobalPrice] = useState<string>(String(analysisResult.suggestedListPrice || ""));
  const [exportingEbay, setExportingEbay] = useState(false);
  const [exportingStripe, setExportingStripe] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("POST", "/api/stash", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stash/count"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Saved!", "Your item has been saved to your stash.", [
        { text: "View Stash", onPress: () => navigation.navigate("Main") },
        { text: "Keep Editing", style: "cancel" },
      ]);
    },
    onError: () => {
      Alert.alert("Error", "Failed to save item. Please try again.");
    },
  });

  const updateField = (field: "title" | "description" | "tags" | "suggestedPrice", value: string | number | string[]) => {
    setEditedVersions((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [field]: value },
    }));
  };

  const applyGlobalPrice = () => {
    const price = parseFloat(globalPrice);
    if (isNaN(price)) return;
    setEditedVersions((prev) => ({
      ebay: { ...prev.ebay, suggestedPrice: price },
      poshmark: { ...prev.poshmark, suggestedPrice: price },
      depop: { ...prev.depop, suggestedPrice: price },
      stripe: { ...prev.stripe, suggestedPrice: price },
    }));
  };

  const handleSave = () => {
    const dataToSave = {
      ...analysisResult,
      fullImageUrl: fullImageUri,
      labelImageUrl: labelImageUri,
      aiAnalysis: { ...analysisResult, platformVersions: editedVersions },
      itemType: itemType || "designer",
      platformVersions: editedVersions,
      marketMatches: analysisResult.marketMatches,
    };
    saveMutation.mutate(dataToSave);
  };

  const handleExportEbay = async () => {
    const ebayStatus = await AsyncStorage.getItem("ebay_status");
    if (ebayStatus !== "connected") {
      Alert.alert(
        "eBay Not Connected",
        "Connect your eBay seller account in Settings to export listings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Settings", onPress: () => navigation.navigate("EbaySettings") },
        ]
      );
      return;
    }

    if (!stashItemId) {
      Alert.alert("Save First", "Please save the item to your stash before exporting to eBay.");
      return;
    }

    setExportingEbay(true);
    try {
      const clientId = await AsyncStorage.getItem("ebay_client_id");
      const clientSecret = await secureGet("ebay_client_secret");
      const refreshToken = await secureGet("ebay_refresh_token");
      const environment = await AsyncStorage.getItem("ebay_environment") || "sandbox";
      const merchantLocationKey = await AsyncStorage.getItem("ebay_merchant_location_key") || "DEFAULT";

      if (!clientId || !clientSecret) {
        Alert.alert("eBay Not Configured", "Please complete your eBay configuration in Settings.");
        return;
      }

      const ebayData = editedVersions.ebay;
      const response = await apiRequest("POST", `/api/stash/${stashItemId}/publish/ebay`, {
        clientId,
        clientSecret,
        refreshToken,
        environment,
        merchantLocationKey,
        customTitle: ebayData.title,
        customDescription: ebayData.description,
        customPrice: ebayData.suggestedPrice,
      });
      const result = await response.json() as ExportResult;

      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Exported to eBay!", `Your listing has been created on eBay.\n\n${result.listingUrl || ""}`);
        queryClient.invalidateQueries({ queryKey: ["/api/stash"] });
      } else {
        Alert.alert("Export Failed", result.error || "Unknown error occurred");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to export to eBay";
      Alert.alert("Error", message);
    } finally {
      setExportingEbay(false);
    }
  };

  const handleExportStripe = async () => {
    Alert.alert(
      "Export to Stripe",
      "This will create a product in your Stripe account. Make sure your Stripe keys are configured.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Export",
          onPress: async () => {
            if (!stashItemId) {
              Alert.alert("Save First", "Please save the item to your stash before exporting to Stripe.");
              return;
            }
            setExportingStripe(true);
            try {
              const stripeData = editedVersions.stripe;
              const response = await apiRequest("POST", `/api/stash/${stashItemId}/publish/stripe`, {
                customTitle: stripeData.title,
                customDescription: stripeData.description,
                customPrice: stripeData.suggestedPrice,
              });
              const result = await response.json() as ExportResult;
              if (result.success) {
                if (Platform.OS !== "web") {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                Alert.alert("Exported to Stripe!", "Your product has been created in Stripe.");
              } else {
                Alert.alert("Export Failed", result.error || "Unknown error occurred");
              }
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : "Failed to export to Stripe";
              Alert.alert("Error", message);
            } finally {
              setExportingStripe(false);
            }
          },
        },
      ]
    );
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Alert.alert("Copied!", `${label} copied to clipboard.`);
  };

  const currentVersion = editedVersions[activeTab];
  const currentPlatform = PLATFORMS.find((p) => p.key === activeTab)!;

  const marketMatches = analysisResult.marketMatches || [];

  return (
    <ThemedView style={styles.container}>
      {/* Platform Tab Bar */}
      <View style={styles.tabBar}>
        {PLATFORMS.map((platform) => (
          <Pressable
            key={platform.key}
            style={[styles.tab, activeTab === platform.key && { borderBottomColor: platform.color, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(platform.key)}
          >
            <Feather
              name={platform.icon}
              size={16}
              color={activeTab === platform.key ? platform.color : Colors.dark.textSecondary}
            />
            <ThemedText style={[styles.tabLabel, activeTab === platform.key && { color: platform.color }]}>
              {platform.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
        {/* Global Price Setter */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Global Price</ThemedText>
          <View style={styles.globalPriceRow}>
            <View style={styles.priceInputWrapper}>
              <ThemedText style={styles.dollarSign}>$</ThemedText>
              <TextInput
                style={styles.priceInput}
                value={globalPrice}
                onChangeText={setGlobalPrice}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={Colors.dark.textSecondary}
              />
            </View>
            <Pressable style={({ pressed }) => [styles.applyPriceButton, pressed && { opacity: 0.8 }]} onPress={applyGlobalPrice}>
              <ThemedText style={styles.applyPriceButtonText}>Apply to All</ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Platform Editor */}
        <View style={styles.card}>
          <View style={styles.platformHeader}>
            <View style={[styles.platformBadge, { backgroundColor: currentPlatform.color + "20" }]}>
              <Feather name={currentPlatform.icon} size={14} color={currentPlatform.color} />
              <ThemedText style={[styles.platformBadgeText, { color: currentPlatform.color }]}>
                {currentPlatform.label}
              </ThemedText>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <ThemedText style={styles.inputLabel}>
                Title ({currentVersion.title.length}/{activeTab === "ebay" ? "80" : "60"} chars)
              </ThemedText>
              <Pressable onPress={() => handleCopyToClipboard(currentVersion.title, "Title")}>
                <Feather name="copy" size={14} color={Colors.dark.textSecondary} />
              </Pressable>
            </View>
            <TextInput
              style={styles.textInput}
              value={currentVersion.title}
              onChangeText={(v) => updateField("title", v.slice(0, activeTab === "ebay" ? 80 : 60))}
              maxLength={activeTab === "ebay" ? 80 : 60}
              placeholder={`${currentPlatform.label} title`}
              placeholderTextColor={Colors.dark.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <ThemedText style={styles.inputLabel}>Description</ThemedText>
              <Pressable onPress={() => handleCopyToClipboard(currentVersion.description, "Description")}>
                <Feather name="copy" size={14} color={Colors.dark.textSecondary} />
              </Pressable>
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              multiline
              numberOfLines={6}
              value={currentVersion.description}
              onChangeText={(v) => updateField("description", v)}
              placeholder={`${currentPlatform.label} description`}
              placeholderTextColor={Colors.dark.textSecondary}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <ThemedText style={styles.inputLabel}>Tags (comma separated)</ThemedText>
              <Pressable onPress={() => handleCopyToClipboard(currentVersion.tags.join(", "), "Tags")}>
                <Feather name="copy" size={14} color={Colors.dark.textSecondary} />
              </Pressable>
            </View>
            <TextInput
              style={styles.textInput}
              value={currentVersion.tags.join(", ")}
              onChangeText={(v) => updateField("tags", v.split(",").map((t) => t.trim()).filter(Boolean))}
              placeholder="tag1, tag2, tag3"
              placeholderTextColor={Colors.dark.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Price ($)</ThemedText>
            <View style={styles.priceInputWrapper}>
              <ThemedText style={styles.dollarSign}>$</ThemedText>
              <TextInput
                style={[styles.priceInput, { flex: 1 }]}
                value={String(currentVersion.suggestedPrice)}
                onChangeText={(v) => updateField("suggestedPrice", parseFloat(v) || 0)}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={Colors.dark.textSecondary}
              />
            </View>
          </View>

          {/* Platform-specific action buttons */}
          {activeTab === "ebay" && (
            <Pressable
              style={({ pressed }) => [styles.exportButton, { backgroundColor: "#E53238" }, pressed && { opacity: 0.8 }, exportingEbay && { opacity: 0.6 }]}
              onPress={handleExportEbay}
              disabled={exportingEbay}
            >
              <Feather name="shopping-bag" size={18} color="#fff" />
              <ThemedText style={styles.exportButtonText}>
                {exportingEbay ? "Exporting..." : "Export to eBay"}
              </ThemedText>
            </Pressable>
          )}

          {activeTab === "stripe" && (
            <Pressable
              style={({ pressed }) => [styles.exportButton, { backgroundColor: "#635BFF" }, pressed && { opacity: 0.8 }, exportingStripe && { opacity: 0.6 }]}
              onPress={handleExportStripe}
              disabled={exportingStripe}
            >
              <Feather name="credit-card" size={18} color="#fff" />
              <ThemedText style={styles.exportButtonText}>
                {exportingStripe ? "Exporting..." : "Export to Stripe"}
              </ThemedText>
            </Pressable>
          )}

          {(activeTab === "poshmark" || activeTab === "depop") && (
            <View style={styles.copyHintBox}>
              <Feather name="info" size={14} color={Colors.dark.textSecondary} />
              <ThemedText style={styles.copyHintText}>
                Copy the title and description above, then paste into {currentPlatform.label} when creating your listing.
              </ThemedText>
            </View>
          )}
        </View>

        {/* Market Comparable Sales */}
        {marketMatches.length > 0 && (
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Comparable Sales</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.marketMatchesScroll}>
              {marketMatches.map((match, i) => (
                <Pressable
                  key={i}
                  style={styles.marketMatchCard}
                  onPress={() => { if (match.url) Linking.openURL(match.url).catch(() => {}); }}
                >
                  <View style={styles.marketMatchSource}>
                    <ThemedText style={styles.marketMatchSourceText}>{match.source}</ThemedText>
                  </View>
                  <ThemedText style={styles.marketMatchPrice}>${match.price}</ThemedText>
                  <ThemedText style={styles.marketMatchTitle} numberOfLines={2}>{match.title}</ThemedText>
                  <Feather name="external-link" size={12} color={Colors.dark.textSecondary} style={{ marginTop: 4 }} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Save Button */}
        {!stashItemId && (
          <Pressable
            style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.8 }, saveMutation.isPending && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saveMutation.isPending}
          >
            <Feather name="save" size={18} color={Colors.dark.buttonText} />
            <ThemedText style={styles.saveButtonText}>
              {saveMutation.isPending ? "Saving..." : "Save to Stash"}
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.backgroundRoot },

  tabBar: { flexDirection: "row", backgroundColor: Colors.dark.surface, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  tab: { flex: 1, flexDirection: "column", alignItems: "center", paddingVertical: Spacing.md, gap: 4, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabLabel: { fontSize: 11, fontWeight: "600", color: Colors.dark.textSecondary },

  scrollContent: { padding: Spacing.lg },

  card: { backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  cardTitle: { ...Typography.h4, color: Colors.dark.text, marginBottom: Spacing.md },

  globalPriceRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  priceInputWrapper: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: Colors.dark.backgroundSecondary, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.dark.border, paddingHorizontal: Spacing.md },
  dollarSign: { ...Typography.body, color: Colors.dark.textSecondary, marginRight: 4 },
  priceInput: { flex: 1, paddingVertical: Spacing.md, color: Colors.dark.text, ...Typography.body },
  applyPriceButton: { backgroundColor: Colors.dark.primary + "20", borderWidth: 1, borderColor: Colors.dark.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.sm },
  applyPriceButtonText: { ...Typography.small, color: Colors.dark.primary, fontWeight: "600" },

  platformHeader: { flexDirection: "row", marginBottom: Spacing.md },
  platformBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  platformBadgeText: { fontSize: 13, fontWeight: "700" },

  inputGroup: { marginBottom: Spacing.md },
  inputLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xs },
  inputLabel: { ...Typography.small, color: Colors.dark.textSecondary },
  textInput: { backgroundColor: Colors.dark.backgroundSecondary, borderRadius: BorderRadius.sm, padding: Spacing.md, color: Colors.dark.text, ...Typography.body, borderWidth: 1, borderColor: Colors.dark.border },
  textArea: { minHeight: 120, textAlignVertical: "top" },

  exportButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.sm, marginTop: Spacing.sm },
  exportButtonText: { ...Typography.button, color: "#fff" },

  copyHintBox: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, backgroundColor: Colors.dark.backgroundSecondary, padding: Spacing.md, borderRadius: BorderRadius.sm, marginTop: Spacing.sm },
  copyHintText: { ...Typography.caption, color: Colors.dark.textSecondary, flex: 1, lineHeight: 18 },

  marketMatchesScroll: { marginTop: Spacing.sm },
  marketMatchCard: { width: 140, backgroundColor: Colors.dark.backgroundSecondary, borderRadius: BorderRadius.md, padding: Spacing.md, marginRight: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  marketMatchSource: { backgroundColor: Colors.dark.primary + "20", paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, marginBottom: Spacing.xs, alignSelf: "flex-start" },
  marketMatchSourceText: { fontSize: 10, color: Colors.dark.primary, fontWeight: "600" },
  marketMatchPrice: { ...Typography.h4, color: Colors.dark.success, fontWeight: "700", marginBottom: Spacing.xs },
  marketMatchTitle: { ...Typography.caption, color: Colors.dark.text, lineHeight: 16 },

  saveButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.dark.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.sm },
  saveButtonText: { ...Typography.button, color: Colors.dark.buttonText },
});
