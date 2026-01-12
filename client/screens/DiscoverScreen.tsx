import React, { useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, Image, RefreshControl, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
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
  if (featured) {
    return (
      <Pressable
        style={({ pressed }) => [styles.featuredCard, pressed && { opacity: 0.9 }]}
        onPress={onPress}
        testID={`card-article-${article.id}`}
      >
        <View style={styles.featuredImagePlaceholder}>
          <Feather name="book" size={40} color={Colors.dark.primary} />
        </View>
        <View style={styles.featuredOverlay}>
          <View style={styles.categoryBadge}>
            <ThemedText style={styles.categoryText}>{article.category}</ThemedText>
          </View>
          <ThemedText style={styles.featuredTitle}>{article.title}</ThemedText>
          <View style={styles.readingTimeRow}>
            <Feather name="clock" size={12} color={Colors.dark.textSecondary} />
            <ThemedText style={styles.readingTime}>{article.readingTime} min read</ThemedText>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.articleCard, pressed && { opacity: 0.8 }]}
      onPress={onPress}
      testID={`card-article-${article.id}`}
    >
      <View style={styles.articleImagePlaceholder}>
        <Feather name="file-text" size={24} color={Colors.dark.primary} />
      </View>
      <View style={styles.articleContent}>
        <View style={styles.categoryBadgeSmall}>
          <ThemedText style={styles.categoryTextSmall}>{article.category}</ThemedText>
        </View>
        <ThemedText style={styles.articleTitle} numberOfLines={2}>
          {article.title}
        </ThemedText>
        <View style={styles.readingTimeRow}>
          <Feather name="clock" size={10} color={Colors.dark.textSecondary} />
          <ThemedText style={styles.readingTimeSmall}>{article.readingTime} min</ThemedText>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={Colors.dark.textSecondary} />
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Image source={emptyArticlesImage} style={styles.emptyImage} resizeMode="contain" />
      <ThemedText style={styles.emptyTitle}>No articles yet</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Check back soon for reselling tips and authentication guides
      </ThemedText>
    </View>
  );
}

export default function DiscoverScreen() {
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
      <ThemedText style={styles.sectionTitle}>Must-Reads</ThemedText>
      <Pressable style={styles.seeAllButton} testID="button-all-articles">
        <ThemedText style={styles.seeAllText}>All articles</ThemedText>
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: headerHeight + Spacing["4xl"] }]}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      </ThemedView>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.emptyContainer, { paddingTop: headerHeight + Spacing["4xl"], paddingBottom: tabBarHeight + Spacing.xl }]}>
          <EmptyState />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
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
                <ThemedText style={styles.latestTitle}>Latest</ThemedText>
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
            tintColor={Colors.dark.primary}
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
    backgroundColor: Colors.dark.backgroundRoot,
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
    color: Colors.dark.text,
  },
  seeAllButton: {
    padding: Spacing.xs,
  },
  seeAllText: {
    ...Typography.small,
    color: Colors.dark.primary,
  },
  featuredSection: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  featuredCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    height: 200,
  },
  featuredImagePlaceholder: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: "rgba(17, 24, 39, 0.85)",
  },
  categoryBadge: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    alignSelf: "flex-start",
    marginBottom: Spacing.sm,
  },
  categoryText: {
    ...Typography.caption,
    fontWeight: "600",
    color: Colors.dark.buttonText,
  },
  featuredTitle: {
    ...Typography.h4,
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  readingTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  readingTime: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
  },
  latestHeader: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  latestTitle: {
    ...Typography.body,
    fontWeight: "600",
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  articleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  articleImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  articleContent: {
    flex: 1,
  },
  categoryBadgeSmall: {
    backgroundColor: Colors.dark.backgroundSecondary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: Spacing.xs,
  },
  categoryTextSmall: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.dark.primary,
    textTransform: "uppercase",
  },
  articleTitle: {
    ...Typography.small,
    fontWeight: "600",
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  readingTimeSmall: {
    fontSize: 10,
    color: Colors.dark.textSecondary,
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
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    paddingHorizontal: Spacing["2xl"],
  },
});
