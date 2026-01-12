import React from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type ArticleRouteProp = RouteProp<RootStackParamList, "Article">;

interface Article {
  id: number;
  title: string;
  content: string;
  excerpt: string | null;
  category: string;
  imageUrl: string | null;
  readingTime: number;
  createdAt: string;
}

export default function ArticleScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const route = useRoute<ArticleRouteProp>();
  const { articleId } = route.params;

  const { data: article, isLoading, error } = useQuery<Article>({
    queryKey: ["/api/articles", articleId],
  });

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: headerHeight + Spacing["4xl"] }]}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      </ThemedView>
    );
  }

  if (error || !article) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.errorContainer, { paddingTop: headerHeight + Spacing["4xl"] }]}>
          <Feather name="alert-circle" size={48} color={Colors.dark.error} />
          <ThemedText style={styles.errorTitle}>Article Not Found</ThemedText>
          <ThemedText style={styles.errorSubtitle}>
            We couldn't load this article. Please try again later.
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
        <View style={styles.headerSection}>
          <View style={styles.categoryBadge}>
            <ThemedText style={styles.categoryText}>{article.category}</ThemedText>
          </View>
          <ThemedText style={styles.title}>{article.title}</ThemedText>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="clock" size={14} color={Colors.dark.textSecondary} />
              <ThemedText style={styles.metaText}>{article.readingTime} min read</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.heroImagePlaceholder}>
          <Feather name="image" size={48} color={Colors.dark.textSecondary} />
        </View>

        <View style={styles.contentSection}>
          <ThemedText style={styles.contentText}>{article.content}</ThemedText>
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
  headerSection: {
    marginBottom: Spacing["2xl"],
  },
  categoryBadge: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    alignSelf: "flex-start",
    marginBottom: Spacing.lg,
  },
  categoryText: {
    ...Typography.caption,
    fontWeight: "600",
    color: Colors.dark.buttonText,
  },
  title: {
    ...Typography.h2,
    color: Colors.dark.text,
    marginBottom: Spacing.lg,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  metaText: {
    ...Typography.small,
    color: Colors.dark.textSecondary,
  },
  heroImagePlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  contentSection: {
    marginBottom: Spacing["2xl"],
  },
  contentText: {
    ...Typography.body,
    color: Colors.dark.text,
    lineHeight: 26,
  },
});
