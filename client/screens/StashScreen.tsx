import React, { useCallback, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Image, RefreshControl, ActivityIndicator, Dimensions, TextInput } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { apiRequest } from "@/lib/query-client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import emptyStashImage from "../../assets/images/empty-states/empty-stash.png";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 3) / 2;

interface StashItem {
  id: number;
  title: string;
  estimatedValue: string | null;
  fullImageUrl: string | null;
  category: string | null;
  publishedToWoocommerce: boolean;
  publishedToEbay: boolean;
  itemType: string | null;
}

function StashItemCard({ item, onPress }: { item: StashItem; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.itemCard,
        { backgroundColor: theme.surface },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
      ]}
      onPress={onPress}
      testID={`card-item-${item.id}`}
    >
      <View style={styles.itemImageContainer}>
        {item.fullImageUrl ? (
          <Image source={{ uri: item.fullImageUrl }} style={styles.itemImage} resizeMode="cover" />
        ) : (
          <View style={[styles.itemImagePlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="package" size={32} color={theme.textSecondary} />
          </View>
        )}
        {item.itemType === "handmade" ? (
          <View style={[styles.handmadeBadge, { backgroundColor: "#a78bfa20" }]}>
            <Feather name="feather" size={10} color="#a78bfa" />
          </View>
        ) : null}
        {item.publishedToWoocommerce || item.publishedToEbay ? (
          <View style={[styles.publishedBadge, { backgroundColor: theme.surface }]}>
            <Feather name="check-circle" size={12} color={theme.success} />
          </View>
        ) : null}
      </View>
      <View style={styles.itemContent}>
        <ThemedText style={[styles.itemTitle, { color: theme.text }]} numberOfLines={2}>
          {item.title}
        </ThemedText>
        {item.estimatedValue ? (
          <ThemedText style={[styles.itemValue, { color: theme.primary }]}>{item.estimatedValue}</ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

function EmptyState({ onScan }: { onScan: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={styles.emptyState}>
      <Image source={emptyStashImage} style={styles.emptyImage} resizeMode="contain" />
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>Your stash is empty</ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Scan your first item to start building your inventory
      </ThemedText>
      <Pressable
        style={({ pressed }) => [styles.emptyButton, { backgroundColor: theme.primary }, pressed && { opacity: 0.8 }]}
        onPress={onScan}
        testID="button-scan-first"
      >
        <Feather name="camera" size={20} color={theme.buttonText} />
        <ThemedText style={[styles.emptyButtonText, { color: theme.buttonText }]}>Scan Item</ThemedText>
      </Pressable>
    </View>
  );
}

function FloatingActionButton({ onPress }: { onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [styles.fab, { backgroundColor: theme.primary }, pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] }]}
      onPress={onPress}
      testID="button-fab-scan"
    >
      <Feather name="camera" size={24} color={theme.buttonText} />
    </Pressable>
  );
}

export default function StashScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StashItem[] | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const { data: items, isLoading, refetch, isRefetching } = useQuery<StashItem[]>({
    queryKey: ["/api/stash"],
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest("POST", "/api/stash/search", { query, userId: user?.id });
      return res.json();
    },
    onSuccess: (data) => {
      setSearchResults(data.results || []);
      setIsSearchActive(true);
    },
  });

  const handleSearch = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length === 0) {
      setSearchResults(null);
      setIsSearchActive(false);
      return;
    }
    searchMutation.mutate(trimmed);
  }, [searchQuery, searchMutation]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults(null);
    setIsSearchActive(false);
  }, []);

  const handleItemPress = useCallback((itemId: number) => {
    navigation.navigate("ItemDetails", { itemId });
  }, [navigation]);

  const handleScan = useCallback(() => {
    navigation.navigate("Main", { screen: "ScanTab" } as any);
  }, [navigation]);

  const displayItems = isSearchActive ? searchResults : items;

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.loadingContainer, { paddingTop: headerHeight + Spacing["4xl"] }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </ThemedView>
    );
  }

  if (!items || items.length === 0) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.emptyContainer, { paddingTop: headerHeight + Spacing["4xl"], paddingBottom: tabBarHeight + Spacing.xl }]}>
          <EmptyState onScan={handleScan} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={displayItems || []}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing["5xl"],
          paddingHorizontal: Spacing.lg,
        }}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <StashItemCard item={item} onPress={() => handleItemPress(item.id)} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              handleClearSearch();
              refetch();
            }}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View>
            <View style={styles.header}>
              <ThemedText style={[styles.headerTitle, { color: theme.text }]}>Stash</ThemedText>
              <ThemedText style={[styles.headerCount, { color: theme.textSecondary }]}>
                {isSearchActive ? `${displayItems?.length || 0} results` : `${items.length} items`}
              </ThemedText>
            </View>
            <View style={styles.searchContainer}>
              <View style={[styles.searchInputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Feather name="search" size={18} color={theme.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder='Try "Louis Vuitton bags under $300"'
                  placeholderTextColor={theme.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                  testID="input-stash-search"
                />
                {searchQuery.length > 0 ? (
                  <Pressable onPress={handleClearSearch} hitSlop={8} testID="button-clear-search">
                    <Feather name="x" size={18} color={theme.textSecondary} />
                  </Pressable>
                ) : null}
              </View>
              {searchQuery.trim().length > 0 ? (
                <Pressable
                  style={({ pressed }) => [styles.searchButton, { backgroundColor: theme.primary }, pressed && { opacity: 0.8 }]}
                  onPress={handleSearch}
                  disabled={searchMutation.isPending}
                  testID="button-search"
                >
                  {searchMutation.isPending ? (
                    <ActivityIndicator size="small" color={theme.buttonText} />
                  ) : (
                    <Feather name="arrow-right" size={18} color={theme.buttonText} />
                  )}
                </Pressable>
              ) : null}
            </View>
            {isSearchActive ? (
              <Pressable style={styles.clearResultsBanner} onPress={handleClearSearch} testID="button-clear-results">
                <Feather name="x-circle" size={14} color={theme.primary} />
                <ThemedText style={[styles.clearResultsText, { color: theme.primary }]}>Clear search results</ThemedText>
              </Pressable>
            ) : null}
            {searchMutation.isError ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color={theme.error} />
                <ThemedText style={[styles.errorText, { color: theme.error }]}>Search failed. Please try again.</ThemedText>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={() =>
          isSearchActive ? (
            <View style={styles.noResults}>
              <Feather name="search" size={40} color={theme.textSecondary} />
              <ThemedText style={[styles.noResultsTitle, { color: theme.text }]}>No items found</ThemedText>
              <ThemedText style={[styles.noResultsSubtitle, { color: theme.textSecondary }]}>Try a different search query</ThemedText>
            </View>
          ) : null
        }
      />
      <FloatingActionButton onPress={handleScan} />
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
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.h3,
  },
  headerCount: {
    ...Typography.small,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  clearResultsBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  clearResultsText: {
    ...Typography.small,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  errorText: {
    ...Typography.small,
  },
  noResults: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    gap: Spacing.sm,
  },
  noResultsTitle: {
    ...Typography.h4,
  },
  noResultsSubtitle: {
    ...Typography.small,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  itemCard: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  itemImageContainer: {
    width: "100%",
    aspectRatio: 1,
    position: "relative",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  itemImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  handmadeBadge: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    borderRadius: 10,
    padding: 4,
  },
  publishedBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    borderRadius: 10,
    padding: 4,
  },
  itemContent: {
    padding: Spacing.md,
  },
  itemTitle: {
    ...Typography.small,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  itemValue: {
    ...Typography.caption,
    fontWeight: "700",
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
    marginBottom: Spacing["2xl"],
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  emptyButtonText: {
    ...Typography.button,
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.floating,
  },
});
