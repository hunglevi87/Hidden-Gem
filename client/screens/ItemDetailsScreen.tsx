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
  publishedToWoocommerce: boolean;
  publishedToEbay: boolean;
  woocommerceUrl: string | null;
  ebayUrl: string | null;
  createdAt: string;
}

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
      return apiRequest(`/api/stash/${itemId}`, { method: "DELETE" });
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

  const handlePublishWooCommerce = async () => {
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
      
      const result = await publishToWooCommerce(itemId, settings);
      
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
  
  const handlePublishEbay = async () => {
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
      
      const result = await publishToEbay(itemId, settings);
      
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
                onPress={handlePublishWooCommerce}
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
                onPress={handlePublishEbay}
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
});
