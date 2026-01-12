import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, Alert, Platform } from "react-native";
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
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import successImage from "../../assets/images/success-scan.png";

type AnalysisRouteProp = RouteProp<RootStackParamList, "Analysis">;

interface AnalysisResult {
  title: string;
  description: string;
  category: string;
  estimatedValue: string;
  condition: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  tags: string[];
}

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<AnalysisRouteProp>();
  const queryClient = useQueryClient();
  const { fullImageUri, labelImageUri } = route.params;

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/stash", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stash"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Saved!", "Item has been added to your stash.", [
        { text: "OK", onPress: () => navigation.navigate("Main") },
      ]);
    },
    onError: (error) => {
      Alert.alert("Error", "Failed to save item. Please try again.");
    },
  });

  useEffect(() => {
    analyzeImages();
  }, []);

  const analyzeImages = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("fullImage", {
        uri: fullImageUri,
        type: "image/jpeg",
        name: "full.jpg",
      } as any);
      formData.append("labelImage", {
        uri: labelImageUri,
        type: "image/jpeg",
        name: "label.jpg",
      } as any);

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ""}/api/analyze`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const result = await response.json();
      setAnalysisResult(result);
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Failed to analyze images. Please try again.");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!analysisResult) return;

    saveMutation.mutate({
      ...analysisResult,
      fullImageUrl: fullImageUri,
      labelImageUrl: labelImageUri,
    });
  };

  const handleRescan = () => {
    navigation.goBack();
  };

  if (analyzing) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
          <View style={styles.loadingAnimation}>
            <Feather name="star" size={48} color={Colors.dark.primary} />
          </View>
          <ThemedText style={styles.loadingTitle}>Analyzing Item...</ThemedText>
          <ThemedText style={styles.loadingSubtitle}>
            Our AI is identifying and appraising your find
          </ThemedText>
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
          <Pressable
            style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.8 }]}
            onPress={analyzeImages}
            testID="button-retry"
          >
            <Feather name="refresh-cw" size={20} color={Colors.dark.buttonText} />
            <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing["2xl"] }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imagesRow}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: fullImageUri }} style={styles.previewImage} resizeMode="cover" />
            <ThemedText style={styles.imageLabel}>Full Item</ThemedText>
          </View>
          <View style={styles.imageContainer}>
            <Image source={{ uri: labelImageUri }} style={styles.previewImage} resizeMode="cover" />
            <ThemedText style={styles.imageLabel}>Label</ThemedText>
          </View>
        </View>

        <View style={styles.successBadge}>
          <Image source={successImage} style={styles.successIcon} resizeMode="contain" />
        </View>

        <View style={styles.resultCard}>
          <ThemedText style={styles.resultTitle}>{analysisResult?.title || "Unknown Item"}</ThemedText>
          
          <View style={styles.valueRow}>
            <ThemedText style={styles.valueLabel}>Estimated Value</ThemedText>
            <ThemedText style={styles.valueAmount}>{analysisResult?.estimatedValue || "N/A"}</ThemedText>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <ThemedText style={styles.detailLabel}>Category</ThemedText>
              <ThemedText style={styles.detailValue}>{analysisResult?.category || "N/A"}</ThemedText>
            </View>
            <View style={styles.detailItem}>
              <ThemedText style={styles.detailLabel}>Condition</ThemedText>
              <ThemedText style={styles.detailValue}>{analysisResult?.condition || "N/A"}</ThemedText>
            </View>
          </View>

          <View style={styles.descriptionSection}>
            <ThemedText style={styles.sectionLabel}>AI-Generated Description</ThemedText>
            <ThemedText style={styles.descriptionText}>
              {analysisResult?.description || "No description available"}
            </ThemedText>
          </View>

          {analysisResult?.tags && analysisResult.tags.length > 0 ? (
            <View style={styles.tagsSection}>
              <ThemedText style={styles.sectionLabel}>Tags</ThemedText>
              <View style={styles.tagsRow}>
                {analysisResult.tags.map((tag, index) => (
                  <View key={index} style={styles.tagBadge}>
                    <ThemedText style={styles.tagText}>{tag}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.8 }]}
            onPress={handleRescan}
            testID="button-rescan"
          >
            <Feather name="camera" size={20} color={Colors.dark.text} />
            <ThemedText style={styles.secondaryButtonText}>Rescan</ThemedText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && { opacity: 0.8 },
              saveMutation.isPending && { opacity: 0.6 },
            ]}
            onPress={handleSave}
            disabled={saveMutation.isPending}
            testID="button-save-stash"
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color={Colors.dark.buttonText} size="small" />
            ) : (
              <>
                <Feather name="save" size={20} color={Colors.dark.buttonText} />
                <ThemedText style={styles.primaryButtonText}>Save to Stash</ThemedText>
              </>
            )}
          </Pressable>
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
  scrollContent: {
    padding: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
  },
  loadingAnimation: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  loadingTitle: {
    ...Typography.h3,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  loadingSubtitle: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  errorTitle: {
    ...Typography.h3,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  errorSubtitle: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  retryButtonText: {
    ...Typography.button,
    color: Colors.dark.buttonText,
  },
  imagesRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  imageContainer: {
    flex: 1,
  },
  previewImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  imageLabel: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  successBadge: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  successIcon: {
    width: 60,
    height: 60,
  },
  resultCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  resultTitle: {
    ...Typography.h3,
    color: Colors.dark.text,
    marginBottom: Spacing.lg,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
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
    backgroundColor: Colors.dark.backgroundSecondary,
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
  descriptionSection: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    ...Typography.small,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  descriptionText: {
    ...Typography.body,
    color: Colors.dark.text,
  },
  tagsSection: {
    marginBottom: Spacing.sm,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tagBadge: {
    backgroundColor: Colors.dark.backgroundSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  tagText: {
    ...Typography.caption,
    color: Colors.dark.primary,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    ...Typography.button,
    color: Colors.dark.text,
  },
  primaryButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    ...Typography.button,
    color: Colors.dark.buttonText,
  },
});
