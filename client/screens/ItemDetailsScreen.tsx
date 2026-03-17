import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, Alert, Share, Platform } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getWooCommerceSettings, getEbaySettings, publishToWooCommerce, publishToEbay } from "@/lib/marketplace";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ItemDetailsRouteProp = RouteProp<RootStackParamList, "ItemDetails">;

interface AIAnalysis {
  title: string;
  description: string;
  category: string;
  estimatedValue: string;
  estimatedValueLow?: number;
  estimatedValueHigh?: number;
  suggestedListPrice?: number;
  condition: string;
  brand?: string;
  subtitle?: string;
  shortDescription?: string;
  fullDescription?: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  tags: string[];
  confidence?: "high" | "medium" | "low";
  authenticity?: "Authentic" | "Likely Authentic" | "Uncertain" | "Likely Counterfeit" | "Counterfeit";
  authenticityConfidence?: number;
  authenticityDetails?: string;
  authenticationTips?: string[];
  marketAnalysis?: string;
  aspects?: Record<string, string[]>;
  ebayCategoryId?: string;
  wooCategory?: string;
}

interface StashItem {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  estimatedValue: string | null;
  condition: string | null;
  tags: string[] | null;
  fullImageUrl: string | null;
  labelImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[] | null;
  publishStatus: string | null;
  publishedToWoocommerce: boolean;
  publishedToEbay: boolean;
  woocommerceUrl: string | null;
  ebayUrl: string | null;
  aiAnalysis: AIAnalysis | null;
  userId: string;
  createdAt: string;
}

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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ItemDetailsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ItemDetailsRouteProp>();
  const queryClient = useQueryClient();
  const { itemId } = route.params;
  
  const [wooConnected, setWooConnected] = useState(false);
  const [ebayConnected, setEbayConnected] = useState(false);
  const [publishingWoo, setPublishingWoo] = useState(false);
  const [publishingEbay, setPublishingEbay] = useState(false);
  const [generatingSEO, setGeneratingSEO] = useState(false);
  const [approvalGate, setApprovalGate] = useState<{
    visible: boolean;
    platform: "woocommerce" | "ebay" | null;
    suggestedPrice: number;
    threshold: number;
    message: string;
  }>({ visible: false, platform: null, suggestedPrice: 0, threshold: 500, message: "" });

  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    const wooStatus = await AsyncStorage.getItem("woocommerce_status");
    const ebayStatus = await AsyncStorage.getItem("ebay_status");
    setWooConnected(wooStatus === "connected");
    setEbayConnected(ebayStatus === "connected");
  };

  const { data: item, isLoading, error } = useQuery<StashItem>({
    queryKey: ["/api/stash", itemId],
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/stash/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stash"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      navigation.goBack();
    },
  });

  const handleShare = async () => {
    try {
      await Share.share({
        title: item?.title || "Check out this item",
        message: `${item?.title}\n${item?.description || ""}\nEstimated Value: ${item?.estimatedValue || "N/A"}`,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Item", "Are you sure you want to delete this item from your stash?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  };

  const handlePublishWooCommerce = async (skipThresholdCheck = false) => {
    if (!item) return;
    
    if (!wooConnected) {
      Alert.alert(
        "WooCommerce Not Connected",
        "Connect your WooCommerce store in Settings to publish listings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Settings", onPress: () => navigation.navigate("WooCommerceSettings") },
        ]
      );
      return;
    }
    
    if (item.publishedToWoocommerce) {
      Alert.alert("Already Published", "This item has already been published to WooCommerce.");
      return;
    }
    
    setPublishingWoo(true);
    try {
      const settings = await getWooCommerceSettings();
      if (!settings) {
        Alert.alert("Error", "Could not retrieve WooCommerce settings.");
        return;
      }
      
      const result = await publishToWooCommerce(itemId, settings, skipThresholdCheck);
      
      if ((result as any).held) {
        setApprovalGate({
          visible: true,
          platform: "woocommerce",
          suggestedPrice: (result as any).suggestedPrice,
          threshold: (result as any).threshold,
          message: (result as any).message,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/stash", itemId] });
        return;
      }
      
      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Published!", `Your item has been listed on WooCommerce.\n\n${result.productUrl || ""}`);
        queryClient.invalidateQueries({ queryKey: ["/api/stash", itemId] });
        queryClient.invalidateQueries({ queryKey: ["/api/stash"] });
      } else {
        Alert.alert("Publishing Failed", result.error || "Unknown error occurred");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to publish to WooCommerce");
    } finally {
      setPublishingWoo(false);
    }
  };
  
  const handlePublishEbay = async (skipThresholdCheck = false) => {
    if (!item) return;
    
    if (!ebayConnected) {
      Alert.alert(
        "eBay Not Connected",
        "Connect your eBay seller account in Settings to publish listings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Settings", onPress: () => navigation.navigate("EbaySettings") },
        ]
      );
      return;
    }
    
    if (item.publishedToEbay) {
      Alert.alert("Already Published", "This item has already been published to eBay.");
      return;
    }
    
    setPublishingEbay(true);
    try {
      const settings = await getEbaySettings();
      if (!settings) {
        Alert.alert("Error", "Could not retrieve eBay settings.");
        return;
      }
      
      const result = await publishToEbay(itemId, settings, skipThresholdCheck);
      
      if ((result as any).held) {
        setApprovalGate({
          visible: true,
          platform: "ebay",
          suggestedPrice: (result as any).suggestedPrice,
          threshold: (result as any).threshold,
          message: (result as any).message,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/stash", itemId] });
        return;
      }
      
      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Published!", `Your item has been listed on eBay.\n\n${result.listingUrl || ""}`);
        queryClient.invalidateQueries({ queryKey: ["/api/stash", itemId] });
        queryClient.invalidateQueries({ queryKey: ["/api/stash"] });
      } else {
        Alert.alert("Publishing Failed", result.error || "Unknown error occurred");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to publish to eBay");
    } finally {
      setPublishingEbay(false);
    }
  };

  const handleApproveAndPublish = async () => {
    if (!approvalGate.platform) return;
    
    try {
      await apiRequest("POST", `/api/stash/${itemId}/approve-publish`);
      queryClient.invalidateQueries({ queryKey: ["/api/stash", itemId] });
      
      setApprovalGate({ visible: false, platform: null, suggestedPrice: 0, threshold: 500, message: "" });
      
      if (approvalGate.platform === "woocommerce") {
        handlePublishWooCommerce(true);
      } else {
        handlePublishEbay(true);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to approve item");
    }
  };

  const handleDismissApproval = () => {
    setApprovalGate({ visible: false, platform: null, suggestedPrice: 0, threshold: 500, message: "" });
  };

  const handleGenerateSEOListing = async () => {
    if (!item) return;

    setGeneratingSEO(true);
    try {
      const response = await apiRequest("POST", "/api/seo/generate", {
        itemId: item.id,
        userId: item.userId || "demo-user",
      });
      
      const updatedItem = await response.json();
      
      if (updatedItem.id) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Success", "SEO listing generated and updated successfully!");
        queryClient.invalidateQueries({ queryKey: ["/api/stash", itemId] });
      } else {
        Alert.alert("Error", "Failed to generate SEO listing");
      }
    } catch (error: any) {
      console.error("SEO Generation error:", error);
      Alert.alert("Error", error.message || "Failed to generate SEO listing");
    } finally {
      setGeneratingSEO(false);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: headerHeight + Spacing["4xl"] }]}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      </ThemedView>
    );
  }

  if (error || !item) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.errorContainer, { paddingTop: headerHeight + Spacing["4xl"] }]}>
          <Feather name="alert-circle" size={48} color={Colors.dark.error} />
          <ThemedText style={styles.errorTitle}>Item Not Found</ThemedText>
          <ThemedText style={styles.errorSubtitle}>
            This item may have been deleted or is unavailable.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {item.fullImageUrl ? (
          <Image source={{ uri: item.fullImageUrl }} style={styles.mainImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="package" size={48} color={Colors.dark.textSecondary} />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{item.title}</ThemedText>
            <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
                onPress={handleShare}
                testID="button-share"
              >
                <Feather name="share-2" size={20} color={Colors.dark.text} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
                onPress={handleDelete}
                testID="button-delete"
              >
                <Feather name="trash-2" size={20} color={Colors.dark.error} />
              </Pressable>
            </View>
          </View>

          <View style={styles.valueCard}>
            <ThemedText style={styles.valueLabel}>Estimated Value</ThemedText>
            <ThemedText style={styles.valueAmount}>{item.estimatedValue || "N/A"}</ThemedText>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <ThemedText style={styles.detailLabel}>Category</ThemedText>
              <ThemedText style={styles.detailValue}>{item.category || "N/A"}</ThemedText>
            </View>
            <View style={styles.detailItem}>
              <ThemedText style={styles.detailLabel}>Condition</ThemedText>
              <ThemedText style={styles.detailValue}>{item.condition || "N/A"}</ThemedText>
            </View>
          </View>

          {item.description ? (
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel}>Description</ThemedText>
              <ThemedText style={styles.descriptionText}>{item.description}</ThemedText>
            </View>
          ) : null}

          {item.tags && item.tags.length > 0 ? (
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel}>Tags</ThemedText>
              <View style={styles.tagsRow}>
                {item.tags.map((tag, index) => (
                  <View key={index} style={styles.tagBadge}>
                    <ThemedText style={styles.tagText}>{tag}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Authentication Assessment Section */}
          {item.aiAnalysis?.authenticity && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel}>Authentication Assessment</ThemedText>
              <View style={styles.authCard}>
                <View style={styles.authHeader}>
                  <View
                    style={[
                      styles.authBadge,
                      { backgroundColor: AUTHENTICITY_COLORS[item.aiAnalysis.authenticity] || Colors.dark.textSecondary },
                    ]}
                  >
                    <ThemedText style={styles.authBadgeText}>
                      {item.aiAnalysis.authenticity}
                    </ThemedText>
                  </View>
                  {item.aiAnalysis.confidence && (
                    <View style={styles.confidenceContainer}>
                      <View style={styles.confidenceBar}>
                        <View
                          style={[
                            styles.confidenceFill,
                            {
                              width:
                                item.aiAnalysis.confidence === "high"
                                  ? "100%"
                                  : item.aiAnalysis.confidence === "medium"
                                    ? "60%"
                                    : "30%",
                              backgroundColor: CONFIDENCE_COLORS[item.aiAnalysis.confidence],
                            },
                          ]}
                        />
                      </View>
                      <ThemedText style={styles.confidenceText}>
                        {item.aiAnalysis.confidence.charAt(0).toUpperCase() +
                          item.aiAnalysis.confidence.slice(1)}{" "}
                        Confidence
                      </ThemedText>
                    </View>
                  )}
                </View>
                {item.aiAnalysis.authenticityDetails && (
                  <ThemedText style={styles.authDetails}>
                    {item.aiAnalysis.authenticityDetails}
                  </ThemedText>
                )}
              </View>
            </View>
          )}

          {/* Authentication Tips Section */}
          {item.aiAnalysis?.authenticationTips &&
            item.aiAnalysis.authenticationTips.length > 0 && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionLabel}>Authentication Tips</ThemedText>
                <View style={styles.tipsCard}>
                  {item.aiAnalysis.authenticationTips.map((tip, index) => (
                    <View key={index} style={styles.tipItem}>
                      <View style={styles.tipNumber}>
                        <ThemedText style={styles.tipNumberText}>{index + 1}</ThemedText>
                      </View>
                      <ThemedText style={styles.tipText}>{tip}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}

          {/* Market Value Analysis Section */}
          {item.aiAnalysis?.marketAnalysis && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <ThemedText style={styles.sectionLabel}>Market Value Analysis</ThemedText>
                <Pressable
                  style={({ pressed }) => [
                    styles.generateButton,
                    pressed && { opacity: 0.7 },
                    generatingSEO && { opacity: 0.5 },
                  ]}
                  onPress={handleGenerateSEOListing}
                  disabled={generatingSEO}
                  testID="button-generate-seo"
                >
                  {generatingSEO ? (
                    <ActivityIndicator size="small" color={Colors.dark.primary} />
                  ) : (
                    <>
                      <Feather name="zap" size={14} color={Colors.dark.primary} style={{ marginRight: 4 }} />
                      <ThemedText style={styles.generateButtonText}>Generate Listing</ThemedText>
                    </>
                  )}
                </Pressable>
              </View>
              <View style={styles.marketCard}>
                <ThemedText style={styles.marketText}>
                  {item.aiAnalysis.marketAnalysis}
                </ThemedText>
                {(item.aiAnalysis.estimatedValueLow || item.aiAnalysis.estimatedValueHigh) && (
                  <View style={styles.valueRange}>
                    <ThemedText style={styles.valueRangeLabel}>AI Estimated Range</ThemedText>
                    <ThemedText style={styles.valueRangeAmount}>
                      ${item.aiAnalysis.estimatedValueLow || "?"} - ${
                        item.aiAnalysis.estimatedValueHigh || "?"
                      }
                    </ThemedText>
                    {item.aiAnalysis.suggestedListPrice && (
                      <ThemedText style={styles.suggestedPrice}>
                        Suggested List: ${item.aiAnalysis.suggestedListPrice}
                      </ThemedText>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Listing Details Section */}
          {item.aiAnalysis && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel}>Listing Details</ThemedText>
              <View style={styles.listingCard}>
                {item.aiAnalysis.brand && (
                  <View style={styles.listingRow}>
                    <ThemedText style={styles.listingLabel}>Brand</ThemedText>
                    <ThemedText style={styles.listingValue}>{item.aiAnalysis.brand}</ThemedText>
                  </View>
                )}
                {item.aiAnalysis.subtitle && (
                  <View style={styles.listingRow}>
                    <ThemedText style={styles.listingLabel}>Subtitle</ThemedText>
                    <ThemedText style={styles.listingValue}>{item.aiAnalysis.subtitle}</ThemedText>
                  </View>
                )}
                {item.aiAnalysis.ebayCategoryId && (
                  <View style={styles.listingRow}>
                    <ThemedText style={styles.listingLabel}>eBay Category</ThemedText>
                    <ThemedText style={styles.listingValue}>
                      {item.aiAnalysis.ebayCategoryId}
                    </ThemedText>
                  </View>
                )}
                {item.aiAnalysis.wooCategory && (
                  <View style={styles.listingRow}>
                    <ThemedText style={styles.listingLabel}>WooCommerce Category</ThemedText>
                    <ThemedText style={styles.listingValue}>
                      {item.aiAnalysis.wooCategory}
                    </ThemedText>
                  </View>
                )}
                {item.aiAnalysis.aspects && Object.keys(item.aiAnalysis.aspects).length > 0 && (
                  <View style={styles.aspectsSection}>
                    <ThemedText style={styles.aspectsTitle}>Item Specifics</ThemedText>
                    {Object.entries(item.aiAnalysis.aspects).map(([key, values]) => (
                      <View key={key} style={styles.aspectRow}>
                        <ThemedText style={styles.aspectKey}>{key}</ThemedText>
                        <ThemedText style={styles.aspectValue}>{values.join(", ")}</ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {item.publishStatus === "held_for_review" ? (
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel}>Review Required</ThemedText>
              <View style={styles.approvalCard}>
                <View style={styles.approvalIconRow}>
                  <View style={styles.approvalIconCircle}>
                    <Feather name="alert-triangle" size={24} color={Colors.dark.warning} />
                  </View>
                </View>
                <ThemedText style={styles.approvalTitle}>High-Value Item</ThemedText>
                <ThemedText style={styles.approvalMessage}>
                  This item has been held for review because its suggested price exceeds your approval threshold. Please review the details and confirm before publishing.
                </ThemedText>
                {item.aiAnalysis?.suggestedListPrice ? (
                  <View style={styles.approvalPriceRow}>
                    <ThemedText style={styles.approvalPriceLabel}>Suggested Price</ThemedText>
                    <ThemedText style={styles.approvalPriceValue}>${item.aiAnalysis.suggestedListPrice}</ThemedText>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {approvalGate.visible ? (
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel}>Approval Required</ThemedText>
              <View style={styles.approvalCard}>
                <View style={styles.approvalIconRow}>
                  <View style={styles.approvalIconCircle}>
                    <Feather name="shield" size={24} color={Colors.dark.warning} />
                  </View>
                </View>
                <ThemedText style={styles.approvalTitle}>Confirm High-Value Publish</ThemedText>
                <ThemedText style={styles.approvalMessage}>{approvalGate.message}</ThemedText>
                <View style={styles.approvalPriceRow}>
                  <ThemedText style={styles.approvalPriceLabel}>Suggested Price</ThemedText>
                  <ThemedText style={styles.approvalPriceValue}>${approvalGate.suggestedPrice}</ThemedText>
                </View>
                <View style={styles.approvalPriceRow}>
                  <ThemedText style={styles.approvalPriceLabel}>Your Threshold</ThemedText>
                  <ThemedText style={styles.approvalThresholdValue}>${approvalGate.threshold}</ThemedText>
                </View>
                <View style={styles.approvalActions}>
                  <Pressable
                    style={({ pressed }) => [styles.approvalCancelButton, pressed && { opacity: 0.7 }]}
                    onPress={handleDismissApproval}
                    testID="button-dismiss-approval"
                  >
                    <ThemedText style={styles.approvalCancelText}>Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.approvalConfirmButton, pressed && { opacity: 0.7 }]}
                    onPress={handleApproveAndPublish}
                    testID="button-approve-publish"
                  >
                    <Feather name="check-circle" size={18} color={Colors.dark.buttonText} />
                    <ThemedText style={styles.approvalConfirmText}>Approve & Publish</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Publish</ThemedText>
            <View style={styles.publishGrid}>
              <Pressable
                style={({ pressed }) => [
                  styles.publishButton,
                  item.publishedToWoocommerce && styles.publishButtonActive,
                  wooConnected && !item.publishedToWoocommerce && styles.publishButtonConnected,
                  pressed && { opacity: 0.8 },
                  publishingWoo && { opacity: 0.6 },
                ]}
                onPress={() => handlePublishWooCommerce()}
                disabled={publishingWoo || publishingEbay}
                testID="button-publish-woocommerce"
              >
                {publishingWoo ? (
                  <ActivityIndicator color={Colors.dark.primary} size="small" />
                ) : (
                  <Feather
                    name="shopping-bag"
                    size={24}
                    color={item.publishedToWoocommerce ? Colors.dark.buttonText : wooConnected ? Colors.dark.primary : Colors.dark.textSecondary}
                  />
                )}
                <ThemedText
                  style={[
                    styles.publishButtonText,
                    item.publishedToWoocommerce && styles.publishButtonTextActive,
                    !wooConnected && !item.publishedToWoocommerce && styles.publishButtonTextDisabled,
                  ]}
                >
                  WooCommerce
                </ThemedText>
                {item.publishedToWoocommerce ? (
                  <View style={styles.publishedBadge}>
                    <Feather name="check" size={12} color={Colors.dark.success} />
                  </View>
                ) : !wooConnected ? (
                  <ThemedText style={styles.notConnectedText}>Not connected</ThemedText>
                ) : null}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.publishButton,
                  item.publishedToEbay && styles.publishButtonActive,
                  ebayConnected && !item.publishedToEbay && styles.publishButtonConnected,
                  pressed && { opacity: 0.8 },
                  publishingEbay && { opacity: 0.6 },
                ]}
                onPress={() => handlePublishEbay()}
                disabled={publishingWoo || publishingEbay}
                testID="button-publish-ebay"
              >
                {publishingEbay ? (
                  <ActivityIndicator color={Colors.dark.primary} size="small" />
                ) : (
                  <Feather
                    name="tag"
                    size={24}
                    color={item.publishedToEbay ? Colors.dark.buttonText : ebayConnected ? Colors.dark.primary : Colors.dark.textSecondary}
                  />
                )}
                <ThemedText
                  style={[
                    styles.publishButtonText,
                    item.publishedToEbay && styles.publishButtonTextActive,
                    !ebayConnected && !item.publishedToEbay && styles.publishButtonTextDisabled,
                  ]}
                >
                  eBay
                </ThemedText>
                {item.publishedToEbay ? (
                  <View style={styles.publishedBadge}>
                    <Feather name="check" size={12} color={Colors.dark.success} />
                  </View>
                ) : !ebayConnected ? (
                  <ThemedText style={styles.notConnectedText}>Not connected</ThemedText>
                ) : null}
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  errorTitle: {
    ...Typography.h3,
    color: Colors.dark.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorSubtitle: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  mainImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing["2xl"],
  },
  imagePlaceholder: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h3,
    color: Colors.dark.text,
    flex: 1,
    marginRight: Spacing.md,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  valueCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  valueLabel: {
    ...Typography.small,
    color: Colors.dark.textSecondary,
  },
  valueAmount: {
    ...Typography.h4,
    color: Colors.dark.primary,
    fontWeight: "700",
  },
  detailsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  detailItem: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  detailLabel: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    ...Typography.body,
    color: Colors.dark.text,
    fontWeight: "600",
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionLabel: {
    ...Typography.small,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  descriptionText: {
    ...Typography.body,
    color: Colors.dark.text,
    lineHeight: 24,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tagBadge: {
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    ...Typography.small,
    color: Colors.dark.primary,
  },
  publishGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  publishButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    position: "relative",
  },
  publishButtonActive: {
    backgroundColor: Colors.dark.primary,
  },
  publishButtonConnected: {
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  publishButtonText: {
    ...Typography.small,
    color: Colors.dark.text,
    fontWeight: "600",
  },
  publishButtonTextActive: {
    color: Colors.dark.buttonText,
  },
  publishButtonTextDisabled: {
    color: Colors.dark.textSecondary,
  },
  notConnectedText: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
  },
  publishedBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  // Authentication Section Styles
  authCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  authHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flexWrap: "wrap",
  },
  authBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  authBadgeText: {
    ...Typography.small,
    color: Colors.dark.buttonText,
    fontWeight: "700",
  },
  confidenceContainer: {
    flex: 1,
    minWidth: 120,
  },
  confidenceBar: {
    height: 6,
    backgroundColor: Colors.dark.backgroundRoot,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: Spacing.xs,
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 3,
  },
  confidenceText: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
  },
  authDetails: {
    ...Typography.body,
    color: Colors.dark.text,
    lineHeight: 22,
  },

  // Tips Section Styles
  tipsCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  tipItem: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tipNumberText: {
    ...Typography.small,
    color: Colors.dark.buttonText,
    fontWeight: "700",
  },
  tipText: {
    ...Typography.body,
    color: Colors.dark.text,
    flex: 1,
    lineHeight: 22,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  generateButtonText: {
    color: Colors.dark.primary,
    fontSize: 12,
    fontWeight: "600",
  },

  // Market Analysis Section Styles
  marketCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  marketText: {
    ...Typography.body,
    color: Colors.dark.text,
    lineHeight: 24,
  },
  valueRange: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.backgroundRoot,
    paddingTop: Spacing.lg,
    gap: Spacing.xs,
  },
  valueRangeLabel: {
    ...Typography.small,
    color: Colors.dark.textSecondary,
  },
  valueRangeAmount: {
    ...Typography.h4,
    color: Colors.dark.primary,
    fontWeight: "700",
  },
  suggestedPrice: {
    ...Typography.body,
    color: Colors.dark.success,
    fontWeight: "600",
  },

  // Listing Details Section Styles
  listingCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  listingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundRoot,
  },
  listingLabel: {
    ...Typography.small,
    color: Colors.dark.textSecondary,
  },
  listingValue: {
    ...Typography.body,
    color: Colors.dark.text,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    marginLeft: Spacing.md,
  },
  aspectsSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.backgroundRoot,
    gap: Spacing.sm,
  },
  aspectsTitle: {
    ...Typography.small,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.sm,
  },
  aspectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  aspectKey: {
    ...Typography.small,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  aspectValue: {
    ...Typography.small,
    color: Colors.dark.text,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  approvalCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.warning,
  },
  approvalIconRow: {
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  approvalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  approvalTitle: {
    ...Typography.h4,
    color: Colors.dark.text,
    textAlign: "center",
  },
  approvalMessage: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  approvalPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.backgroundRoot,
  },
  approvalPriceLabel: {
    ...Typography.small,
    color: Colors.dark.textSecondary,
  },
  approvalPriceValue: {
    ...Typography.h4,
    color: Colors.dark.primary,
    fontWeight: "700",
  },
  approvalThresholdValue: {
    ...Typography.body,
    color: Colors.dark.warning,
    fontWeight: "600",
  },
  approvalActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  approvalCancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  approvalCancelText: {
    ...Typography.button,
    color: Colors.dark.text,
  },
  approvalConfirmButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.primary,
    gap: Spacing.sm,
  },
  approvalConfirmText: {
    ...Typography.button,
    color: Colors.dark.buttonText,
  },
});
