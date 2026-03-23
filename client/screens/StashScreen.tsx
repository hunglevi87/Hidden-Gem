import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TextInput,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
} from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { apiRequest } from "@/lib/query-client";
import { useAuthContext } from "@/contexts/AuthContext";
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
}

function StashItemCard({
  item,
  onPress,
}: {
  item: StashItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.itemCard,
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
      onPress={onPress}
      testID={`card-item-${item.id}`}
    >
      <View style={styles.itemImageContainer}>
        {item.fullImageUrl ? (
          <Image
            source={{ uri: item.fullImageUrl }}
            style={styles.itemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <Feather
              name="package"
              size={32}
              color={Colors.dark.textSecondary}
            />
          </View>
        )}
        {item.publishedToWoocommerce || item.publishedToEbay ? (
          <View style={styles.publishedBadge}>
            <Feather
              name="check-circle"
              size={12}
              color={Colors.dark.success}
            />
          </View>
        ) : null}
      </View>
      <View style={styles.itemContent}>
        <ThemedText style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
        {item.estimatedValue ? (
          <ThemedText style={styles.itemValue}>
            {item.estimatedValue}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

function EmptyState({ onScan }: { onScan: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Image
        source={emptyStashImage}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <ThemedText style={styles.emptyTitle}>Your stash is empty</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Scan your first item to start building your inventory
      </ThemedText>
      <Pressable
        style={({ pressed }) => [
          styles.emptyButton,
          pressed && { opacity: 0.8 },
        ]}
        onPress={onScan}
        testID="button-scan-first"
      >
        <Feather name="camera" size={20} color={Colors.dark.buttonText} />
        <ThemedText style={styles.emptyButtonText}>Scan Item</ThemedText>
      </Pressable>
    </View>
  );
}

function FloatingActionButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.fab,
        pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] },
      ]}
      onPress={onPress}
      testID="button-fab-scan"
    >
      <Feather name="camera" size={24} color={Colors.dark.buttonText} />
    </Pressable>
  );
}

export default function StashScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StashItem[] | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const {
    data: items,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<StashItem[]>({
    queryKey: ["/api/stash"],
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest("POST", "/api/stash/search", {
        query,
        userId: user?.id,
      });
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

  const handleItemPress = useCallback(
    (itemId: number) => {
      navigation.navigate("ItemDetails", { itemId });
    },
    [navigation],
  );

  const handleScan = useCallback(() => {
    navigation.navigate("Main", { screen: "ScanTab" } as any);
  }, [navigation]);

  const displayItems = isSearchActive ? searchResults : items;

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View
          style={[
            styles.loadingContainer,
            { paddingTop: headerHeight + Spacing["4xl"] },
          ]}
        >
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      </ThemedView>
    );
  }

  if (!items || items.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View
          style={[
            styles.emptyContainer,
            {
              paddingTop: headerHeight + Spacing["4xl"],
              paddingBottom: tabBarHeight + Spacing.xl,
            },
          ]}
        >
          <EmptyState onScan={handleScan} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
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
            tintColor={Colors.dark.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View>
            <View style={styles.header}>
              <ThemedText style={styles.headerTitle}>Stash</ThemedText>
              <ThemedText style={styles.headerCount}>
                {isSearchActive
                  ? `${displayItems?.length || 0} results`
                  : `${items.length} items`}
              </ThemedText>
            </View>
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Feather
                  name="search"
                  size={18}
                  color={Colors.dark.textSecondary}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder='Try "Louis Vuitton bags under $300"'
                  placeholderTextColor={Colors.dark.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                  testID="input-stash-search"
                />
                {searchQuery.length > 0 ? (
                  <Pressable
                    onPress={handleClearSearch}
                    hitSlop={8}
                    testID="button-clear-search"
                  >
                    <Feather
                      name="x"
                      size={18}
                      color={Colors.dark.textSecondary}
                    />
                  </Pressable>
                ) : null}
              </View>
              {searchQuery.trim().length > 0 ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.searchButton,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={handleSearch}
                  disabled={searchMutation.isPending}
                  testID="button-search"
                >
                  {searchMutation.isPending ? (
                    <ActivityIndicator
                      size="small"
                      color={Colors.dark.buttonText}
                    />
                  ) : (
                    <Feather
                      name="arrow-right"
                      size={18}
                      color={Colors.dark.buttonText}
                    />
                  )}
                </Pressable>
              ) : null}
            </View>
            {isSearchActive ? (
              <Pressable
                style={styles.clearResultsBanner}
                onPress={handleClearSearch}
                testID="button-clear-results"
              >
                <Feather
                  name="x-circle"
                  size={14}
                  color={Colors.dark.primary}
                />
                <ThemedText style={styles.clearResultsText}>
                  Clear search results
                </ThemedText>
              </Pressable>
            ) : null}
            {searchMutation.isError ? (
              <View style={styles.errorBanner}>
                <Feather
                  name="alert-circle"
                  size={14}
                  color={Colors.dark.error}
                />
                <ThemedText style={styles.errorText}>
                  Search failed. Please try again.
                </ThemedText>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={() =>
          isSearchActive ? (
            <View style={styles.noResults}>
              <Feather
                name="search"
                size={40}
                color={Colors.dark.textSecondary}
              />
              <ThemedText style={styles.noResultsTitle}>
                No items found
              </ThemedText>
              <ThemedText style={styles.noResultsSubtitle}>
                Try a different search query
              </ThemedText>
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
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.dark.text,
  },
  headerCount: {
    ...Typography.small,
    color: Colors.dark.textSecondary,
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
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 14,
    height: "100%",
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.primary,
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
    color: Colors.dark.primary,
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
    color: Colors.dark.error,
  },
  noResults: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    gap: Spacing.sm,
  },
  noResultsTitle: {
    ...Typography.h4,
    color: Colors.dark.text,
  },
  noResultsSubtitle: {
    ...Typography.small,
    color: Colors.dark.textSecondary,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  itemCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.dark.surface,
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
    backgroundColor: Colors.dark.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  publishedBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    padding: 4,
  },
  itemContent: {
    padding: Spacing.md,
  },
  itemTitle: {
    ...Typography.small,
    fontWeight: "600",
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  itemValue: {
    ...Typography.caption,
    fontWeight: "700",
    color: Colors.dark.primary,
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
    marginBottom: Spacing["2xl"],
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  emptyButtonText: {
    ...Typography.button,
    color: Colors.dark.buttonText,
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.floating,
  },
});
