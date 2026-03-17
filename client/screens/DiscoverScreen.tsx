import React, { useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, Image, RefreshControl, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import emptyArticlesImage from "../../assets/images/empty-states/empty-articles.png";

interface Article {
  id: number;
  title: string;
  excerpt: string | null;
  category: string;
  imageUrl: string | null;
  readingTime: number;
  featured: boolean;
}

function ArticleCard({ article, onPress, featured }: { article: Article; onPress: () => void; featured?: boolean }) {
  const { theme } = useTheme();
  if (featured) {
    return (
      <Pressable
        style={({ pressed }) => [styles.featuredCard, { backgroundColor: theme.surface }, pressed && { opacity: 0.9 }]}
        onPress={onPress}
        testID={`card-article-${article.id}`}
      >
        <View style={[styles.featuredImagePlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="book" size={40} color={theme.primary} />
        </View>
        <View style={[styles.featuredOverlay, { backgroundColor: "rgba(17, 24, 39, 0.85)" }]}>
          <View style={[styles.categoryBadge, { backgroundColor: theme.primary }]}>
            <ThemedText style={[styles.categoryText, { color: theme.buttonText }]}>{article.category}</ThemedText>
          </View>
          <ThemedText style={[styles.featuredTitle, { color: "#F9FAFB" }]}>{article.title}</ThemedText>
          <View style={styles.readingTimeRow}>
            <Feather name="clock" size={12} color="#9CA3AF" />
            <ThemedText style={[styles.readingTime, { color: "#9CA3AF" }]}>{article.readingTime} min read</ThemedText>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.articleCard, { backgroundColor: theme.surface }, pressed && { opacity: 0.8 }]}
      onPress={onPress}
      testID={`card-article-${article.id}`}
    >
      <View style={[styles.articleImagePlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="file-text" size={24} color={theme.primary} />
      </View>
      <View style={styles.articleContent}>
        <View style={[styles.categoryBadgeSmall, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText style={[styles.categoryTextSmall, { color: theme.primary }]}>{article.category}</ThemedText>
        </View>
        <ThemedText style={[styles.articleTitle, { color: theme.text }]} numberOfLines={2}>
          {article.title}
        </ThemedText>
        <View style={styles.readingTimeRow}>
          <Feather name="clock" size={10} color={theme.textSecondary} />
          <ThemedText style={[styles.readingTimeSmall, { color: theme.textSecondary }]}>{article.readingTime} min</ThemedText>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

function EmptyState() {
  const { theme } = useTheme();
  return (
    <View style={styles.emptyState}>
      <Image source={emptyArticlesImage} style={styles.emptyImage} resizeMode="contain" />
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>No articles yet</ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Check back soon for reselling tips and authentication guides
      </ThemedText>
    </View>
  );
}

export default function DiscoverScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { data: articles, isLoading, refetch, isRefetching } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });

  const featuredArticles = articles?.filter((a) => a.featured) || [];
  const regularArticles = articles?.filter((a) => !a.featured) || [];

  const handleArticlePress = useCallback((articleId: number) => {
    navigation.navigate("Article", { articleId });
  }, [navigation]);

  const renderHeader = () => (
    <View style={styles.sectionHeader}>
      <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Must-Reads</ThemedText>
      <Pressable style={styles.seeAllButton} testID="button-all-articles">
        <ThemedText style={[styles.seeAllText, { color: theme.primary }]}>All articles</ThemedText>
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.loadingContainer, { paddingTop: headerHeight + Spacing["4xl"] }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </ThemedView>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.emptyContainer, { paddingTop: headerHeight + Spacing["4xl"], paddingBottom: tabBarHeight + Spacing.xl }]}>
          <EmptyState />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={regularArticles}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingTop: headerHeight + Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl }}
        ListHeaderComponent={() => (
          <>
            {renderHeader()}
            {featuredArticles.length > 0 ? (
              <View style={styles.featuredSection}>
                {featuredArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    featured
                    onPress={() => handleArticlePress(article.id)}
                  />
                ))}
              </View>
            ) : null}
            {regularArticles.length > 0 ? (
              <View style={styles.latestHeader}>
                <ThemedText style={[styles.latestTitle, { color: theme.textSecondary }]}>Latest</ThemedText>
              </View>
            ) : null}
          </>
        )}
        renderItem={({ item }) => (
          <ArticleCard article={item} onPress={() => handleArticlePress(item.id)} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  seeAllButton: {
    padding: Spacing.xs,
  },
  seeAllText: {
    ...Typography.small,
  },
  featuredSection: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  featuredCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    height: 200,
  },
  featuredImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    alignSelf: "flex-start",
    marginBottom: Spacing.sm,
  },
  categoryText: {
    ...Typography.caption,
    fontWeight: "600",
  },
  featuredTitle: {
    ...Typography.h4,
    marginBottom: Spacing.xs,
  },
  readingTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  readingTime: {
    ...Typography.caption,
  },
  latestHeader: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  latestTitle: {
    ...Typography.body,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  articleCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  articleImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  articleContent: {
    flex: 1,
  },
  categoryBadgeSmall: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: Spacing.xs,
  },
  categoryTextSmall: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  articleTitle: {
    ...Typography.small,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  readingTimeSmall: {
    fontSize: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: Spacing["2xl"],
    opacity: 0.8,
  },
  emptyTitle: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    textAlign: "center",
    paddingHorizontal: Spacing["2xl"],
  },
});
