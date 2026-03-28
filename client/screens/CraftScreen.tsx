import React, { useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useHeaderHeight } from "@react-navigation/elements";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ItemSnapshot {
  id: number;
  title: string;
  fullImageUrl: string | null;
  estimatedValue: string | null;
  category: string | null;
}

interface GiftSet {
  id?: number;
  tier: "Budget" | "Starter" | "Core" | "Premium" | "Ultimate";
  title: string;
  description: string;
  marketingHook: string;
  itemIds: number[];
  itemsSnapshot: ItemSnapshot[];
  totalValue: number | string;
  sellingPrice: number | string;
  createdAt?: string;
  saved?: boolean;
}

// ---------------------------------------------------------------------------
// Tier colours
// ---------------------------------------------------------------------------
const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Budget:   { bg: "#16a34a20", text: "#4ade80", border: "#16a34a40" },
  Starter:  { bg: "#2563eb20", text: "#60a5fa", border: "#2563eb40" },
  Core:     { bg: "#d4af3720", text: "#D4AF37", border: "#d4af3740" },
  Premium:  { bg: "#9333ea20", text: "#c084fc", border: "#9333ea40" },
  Ultimate: { bg: "#dc262620", text: "#f87171", border: "#dc262640" },
};

// ---------------------------------------------------------------------------
// Strategy prompt shortcuts
// ---------------------------------------------------------------------------
const STRATEGY_SHORTCUTS = [
  "Analyze my inventory SWOT",
  "Which categories should I expand?",
  "Suggest pricing for my slow-moving stock",
  "How should I price my new candle line?",
  "What should I restock first?",
  "Which items should I discount to move?",
];

// ---------------------------------------------------------------------------
// Simple markdown renderer (bold, headers, bullets)
// ---------------------------------------------------------------------------
function MarkdownText({ text, color, secondaryColor }: { text: string; color: string; secondaryColor: string }) {
  const lines = text.split("\n");

  return (
    <View>
      {lines.map((line, idx) => {
        if (line.startsWith("## ")) {
          return (
            <ThemedText key={idx} style={[styles.mdH2, { color }]}>
              {line.slice(3)}
            </ThemedText>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <ThemedText key={idx} style={[styles.mdH1, { color }]}>
              {line.slice(2)}
            </ThemedText>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          const content = line.slice(2);
          return (
            <View key={idx} style={styles.mdBulletRow}>
              <ThemedText style={[styles.mdBullet, { color: secondaryColor }]}>•</ThemedText>
              <ThemedText style={[styles.mdBulletText, { color: secondaryColor }]}>
                {renderInlineBold(content, color, secondaryColor)}
              </ThemedText>
            </View>
          );
        }
        if (line.trim() === "") {
          return <View key={idx} style={{ height: 8 }} />;
        }
        return (
          <ThemedText key={idx} style={[styles.mdBody, { color: secondaryColor }]}>
            {renderInlineBold(line, color, secondaryColor)}
          </ThemedText>
        );
      })}
    </View>
  );
}

function renderInlineBold(text: string, boldColor: string, normalColor: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <ThemedText key={i} style={{ fontWeight: "700", color: boldColor }}>
          {part.slice(2, -2)}
        </ThemedText>
      );
    }
    return (
      <ThemedText key={i} style={{ color: normalColor }}>
        {part}
      </ThemedText>
    );
  });
}

// ---------------------------------------------------------------------------
// Gift Set Card  (supports inline tweaking before save)
// ---------------------------------------------------------------------------
function GiftSetCard({
  set,
  onSave,
  isSaving,
  onUpdate,
}: {
  set: GiftSet;
  onSave?: () => void;
  isSaving?: boolean;
  onUpdate?: (updates: Partial<Pick<GiftSet, "sellingPrice" | "marketingHook" | "itemIds" | "itemsSnapshot">>) => void;
}) {
  const { theme } = useTheme();
  const tierStyle = TIER_COLORS[set.tier] || TIER_COLORS.Core;

  // Normalize numeric fields — DB returns them as strings from NUMERIC columns
  const totalVal = Number(set.totalValue) || 0;
  const sellVal = Number(set.sellingPrice) || 0;

  // Local edit state for text inputs (only used when onUpdate is provided)
  const [priceInput, setPriceInput] = useState(sellVal > 0 ? String(Math.round(sellVal)) : "");
  const [hookInput, setHookInput] = useState(set.marketingHook || "");

  const commitEdit = () => {
    if (!onUpdate) return;
    const newPrice = parseFloat(priceInput);
    onUpdate({
      sellingPrice: isNaN(newPrice) ? set.sellingPrice : newPrice,
      marketingHook: hookInput,
    });
  };

  const removeItem = (itemId: number) => {
    if (!onUpdate) return;
    onUpdate({
      itemIds: set.itemIds.filter((id) => id !== itemId),
      itemsSnapshot: set.itemsSnapshot.filter((i) => i.id !== itemId),
    });
  };

  const canEdit = !!onUpdate && !set.saved;

  return (
    <View style={[styles.giftCard, { backgroundColor: theme.surface, borderColor: tierStyle.border }]}>
      <View style={styles.giftCardHeader}>
        <View style={[styles.tierBadge, { backgroundColor: tierStyle.bg }]}>
          <ThemedText style={[styles.tierBadgeText, { color: tierStyle.text }]}>{set.tier}</ThemedText>
        </View>
        <View style={styles.priceRow}>
          {totalVal > 0 && (
            <ThemedText style={[styles.totalValue, { color: theme.textSecondary }]}>
              ${Math.round(totalVal)} value
            </ThemedText>
          )}
          {canEdit ? (
            <View style={[styles.priceInputWrapper, { borderColor: theme.border }]}>
              <ThemedText style={[styles.priceCurrency, { color: theme.primary }]}>$</ThemedText>
              <TextInput
                style={[styles.priceInput, { color: theme.primary }]}
                value={priceInput}
                onChangeText={setPriceInput}
                onBlur={commitEdit}
                keyboardType="numeric"
                placeholder="Price"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          ) : sellVal > 0 ? (
            <ThemedText style={[styles.sellingPrice, { color: theme.primary }]}>
              ${Math.round(sellVal)}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <ThemedText style={[styles.giftTitle, { color: theme.text }]}>{set.title}</ThemedText>

      {canEdit ? (
        <TextInput
          style={[styles.hookInput, { color: theme.primary, borderColor: theme.border }]}
          value={hookInput}
          onChangeText={setHookInput}
          onBlur={commitEdit}
          placeholder="Edit marketing hook..."
          placeholderTextColor={theme.textSecondary}
          multiline
        />
      ) : set.marketingHook ? (
        <ThemedText style={[styles.marketingHook, { color: theme.primary }]}>
          "{set.marketingHook}"
        </ThemedText>
      ) : null}

      {set.description ? (
        <ThemedText style={[styles.giftDescription, { color: theme.textSecondary }]} numberOfLines={3}>
          {set.description}
        </ThemedText>
      ) : null}

      {set.itemsSnapshot?.length > 0 && (
        <View>
          {canEdit && (
            <ThemedText style={[styles.tweakHint, { color: theme.textSecondary }]}>
              Tap × to remove an item
            </ThemedText>
          )}
          <View style={styles.itemThumbnails}>
            {set.itemsSnapshot.slice(0, 6).map((item) => (
              <View key={item.id} style={styles.thumbnailWrapper}>
                {item.fullImageUrl ? (
                  <Image source={{ uri: item.fullImageUrl }} style={styles.thumbnail} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumbnailPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
                    <Feather name="package" size={14} color={theme.textSecondary} />
                  </View>
                )}
                {canEdit && (
                  <Pressable
                    style={[styles.removeItemBtn, { backgroundColor: theme.error || "#ef4444" }]}
                    onPress={() => removeItem(item.id)}
                    hitSlop={6}
                  >
                    <Feather name="x" size={8} color="#fff" />
                  </Pressable>
                )}
              </View>
            ))}
            {set.itemsSnapshot.length > 6 && (
              <View style={[styles.thumbnailMore, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText style={[styles.thumbnailMoreText, { color: theme.textSecondary }]}>
                  +{set.itemsSnapshot.length - 6}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      )}

      {!set.saved && onSave && (
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: theme.primary, opacity: pressed || isSaving ? 0.8 : 1 },
          ]}
          onPress={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.buttonText} />
          ) : (
            <>
              <Feather name="bookmark" size={14} color={theme.buttonText} />
              <ThemedText style={[styles.saveButtonText, { color: theme.buttonText }]}>Save Set</ThemedText>
            </>
          )}
        </Pressable>
      )}

      {set.saved && (
        <View style={[styles.savedBadge, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="check-circle" size={14} color={theme.success} />
          <ThemedText style={[styles.savedText, { color: theme.success }]}>Saved to Storefront</ThemedText>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Gift Sets Tab
// ---------------------------------------------------------------------------
function GiftSetsTab() {
  const { theme } = useTheme();
  const { user, session } = useAuthContext();
  const queryClient = useQueryClient();
  const userId = user?.id || "demo-user";

  const authHeaders = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

  const [generatedSets, setGeneratedSets] = useState<GiftSet[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: savedSets = [], isLoading: loadingSaved } = useQuery<GiftSet[]>({
    queryKey: ["/api/craft/gift-sets", userId],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/craft/gift-sets`, {
        headers: { "Content-Type": "application/json", ...authHeaders },
      });
      if (!res.ok) throw new Error("Failed to fetch saved sets");
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/craft/gift-sets", {}, authHeaders);
      return res.json() as Promise<GiftSet[]>;
    },
    onSuccess: (data: GiftSet[]) => {
      setGeneratedSets(data);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Please try again.";
      Alert.alert("Emma couldn't generate sets", message);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (set: GiftSet) => {
      const res = await apiRequest("POST", "/api/craft/gift-sets/save", set, authHeaders);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/craft/gift-sets", userId] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Please try again.";
      Alert.alert("Couldn't save set", message);
    },
  });

  const handleUpdateSet = useCallback((index: number, updates: Partial<GiftSet>) => {
    setGeneratedSets((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  }, []);

  const handleSave = useCallback(async (set: GiftSet, index: number) => {
    setSavingId(`gen-${index}`);
    try {
      await saveMutation.mutateAsync(set);
      setGeneratedSets((prev) =>
        prev.map((s, i) => (i === index ? { ...s, saved: true } : s))
      );
    } finally {
      setSavingId(null);
    }
  }, [saveMutation]);

  const headerHeight = useHeaderHeight();
  const tabBarHeight = React.useContext(BottomTabBarHeightContext) ?? 0;
  const hasGenerated = generatedSets.length > 0;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        styles.tabContent,
        { paddingTop: headerHeight + Spacing.lg, paddingBottom: tabBarHeight + Spacing.lg },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Gift Set Builder</ThemedText>
        <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Emma bundles your stash into ready-to-sell gift sets
        </ThemedText>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.generateButton,
          { backgroundColor: theme.primary, opacity: pressed || generateMutation.isPending ? 0.8 : 1 },
        ]}
        onPress={() => generateMutation.mutate()}
        disabled={generateMutation.isPending}
        testID="button-generate-sets"
      >
        {generateMutation.isPending ? (
          <>
            <ActivityIndicator size="small" color={theme.buttonText} />
            <ThemedText style={[styles.generateButtonText, { color: theme.buttonText }]}>
              Emma is crafting bundles...
            </ThemedText>
          </>
        ) : (
          <>
            <Feather name={hasGenerated ? "refresh-cw" : "gift"} size={18} color={theme.buttonText} />
            <ThemedText style={[styles.generateButtonText, { color: theme.buttonText }]}>
              {hasGenerated ? "Regenerate Gift Sets" : "Generate Gift Sets"}
            </ThemedText>
          </>
        )}
      </Pressable>

      {generatedSets.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.subSectionTitle, { color: theme.textSecondary }]}>
            EMMA'S SUGGESTIONS
          </ThemedText>
          {generatedSets.map((set, i) => (
            <GiftSetCard
              key={`gen-${i}`}
              set={set}
              onSave={() => handleSave(set, i)}
              isSaving={savingId === `gen-${i}`}
              onUpdate={(updates) => handleUpdateSet(i, updates)}
            />
          ))}
        </View>
      )}

      {loadingSaved ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.xl }} />
      ) : savedSets.length > 0 ? (
        <View style={styles.section}>
          <ThemedText style={[styles.subSectionTitle, { color: theme.textSecondary }]}>
            SAVED TO STOREFRONT
          </ThemedText>
          {savedSets.map((set) => (
            <GiftSetCard key={set.id} set={{ ...set, itemsSnapshot: Array.isArray(set.itemsSnapshot) ? (set.itemsSnapshot as ItemSnapshot[]) : [], saved: true }} />
          ))}
        </View>
      ) : generatedSets.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="gift" size={40} color={theme.textSecondary} />
          <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>No Gift Sets Yet</ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Tap Generate to let Emma bundle your stash into tiered gift sets ready for your storefront
          </ThemedText>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Strategy Tab
// ---------------------------------------------------------------------------
function StrategyTab() {
  const { theme } = useTheme();
  const { session } = useAuthContext();
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const headerHeight = useHeaderHeight();
  const tabBarHeight = React.useContext(BottomTabBarHeightContext) ?? 0;

  const authHeaders = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

  const askEmma = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setIsLoading(true);
    setAnalysis(null);
    setIsStreaming(false);
    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/craft/strategy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ question: q.trim() }),
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error((errJson as { error?: string }).error || "Failed to get strategy");
      }
      if (response.body) {
        setIsStreaming(true);
        setIsLoading(false);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") break;
            try {
              const parsed = JSON.parse(payload) as { chunk?: string; error?: string };
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.chunk) {
                fullText += parsed.chunk;
                setAnalysis(fullText);
                scrollRef.current?.scrollToEnd({ animated: false });
              }
            } catch {
              // skip malformed SSE frames
            }
          }
        }
        setIsStreaming(false);
      } else {
        // Fallback: server always sends SSE frames; read the full body and parse them
        const text = await response.text();
        let fullText = "";
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload) as { chunk?: string; error?: string };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.chunk) fullText += parsed.chunk;
          } catch {
            // skip malformed frames
          }
        }
        setAnalysis(fullText || "No analysis returned.");
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Please try again.";
      Alert.alert("Emma couldn't respond", message);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [session?.access_token]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.tabContent,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: tabBarHeight + Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Shop Strategy</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Ask Emma anything about your inventory
          </ThemedText>
        </View>

        <View style={[styles.inputCard, { backgroundColor: theme.surface }]}>
          <TextInput
            style={[styles.strategyInput, { color: theme.text, borderColor: theme.border }]}
            value={question}
            onChangeText={setQuestion}
            placeholder="Ask Emma about your shop..."
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Pressable
            style={({ pressed }) => [
              styles.askButton,
              { backgroundColor: theme.primary, opacity: pressed || isLoading ? 0.8 : 1 },
            ]}
            onPress={() => askEmma(question)}
            disabled={isLoading || !question.trim()}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.buttonText} />
            ) : (
              <>
                <Feather name="send" size={15} color={theme.buttonText} />
                <ThemedText style={[styles.askButtonText, { color: theme.buttonText }]}>Ask Emma</ThemedText>
              </>
            )}
          </Pressable>
        </View>

        <ThemedText style={[styles.shortcutLabel, { color: theme.textSecondary }]}>QUICK PROMPTS</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shortcutsRow}>
          {STRATEGY_SHORTCUTS.map((shortcut) => (
            <Pressable
              key={shortcut}
              style={({ pressed }) => [
                styles.shortcutChip,
                {
                  backgroundColor: pressed ? theme.backgroundSecondary : theme.surface,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => {
                setQuestion(shortcut);
                askEmma(shortcut);
              }}
            >
              <ThemedText style={[styles.shortcutText, { color: theme.text }]}>{shortcut}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {isLoading && (
          <View style={styles.loadingResponse}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
              Emma is analyzing your shop...
            </ThemedText>
          </View>
        )}

        {analysis != null && !isLoading && (
          <View style={[styles.analysisCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.emmaHeader}>
              <View style={[styles.emmaAvatar, { backgroundColor: theme.primary + "20" }]}>
                {isStreaming
                  ? <ActivityIndicator size="small" color={theme.primary} />
                  : <Feather name="star" size={14} color={theme.primary} />
                }
              </View>
              <ThemedText style={[styles.emmaLabel, { color: theme.primary }]}>
                {isStreaming ? "Emma is typing..." : "Emma's Analysis"}
              </ThemedText>
            </View>
            <MarkdownText text={analysis} color={theme.text} secondaryColor={theme.textSecondary} />
            {!isStreaming && (
              <Pressable
                style={({ pressed }) => [
                  styles.newQuestionButton,
                  { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => {
                  setAnalysis(null);
                  setQuestion("");
                }}
              >
                <Feather name="refresh-cw" size={14} color={theme.textSecondary} />
                <ThemedText style={[styles.newQuestionText, { color: theme.textSecondary }]}>New Question</ThemedText>
              </Pressable>
            )}
          </View>
        )}

        {!analysis && !isLoading && (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={40} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>Ask Emma Anything</ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Emma reads your live inventory and gives you specific, actionable strategy advice
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Main CraftScreen
// ---------------------------------------------------------------------------
export default function CraftScreen() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"giftsets" | "strategy">("giftsets");

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable
          style={[
            styles.tabBarItem,
            activeTab === "giftsets" && [styles.tabBarItemActive, { borderBottomColor: theme.primary }],
          ]}
          onPress={() => setActiveTab("giftsets")}
          testID="tab-giftsets"
        >
          <Feather
            name="gift"
            size={16}
            color={activeTab === "giftsets" ? theme.primary : theme.textSecondary}
          />
          <ThemedText
            style={[
              styles.tabBarLabel,
              { color: activeTab === "giftsets" ? theme.primary : theme.textSecondary },
            ]}
          >
            Gift Sets
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.tabBarItem,
            activeTab === "strategy" && [styles.tabBarItemActive, { borderBottomColor: theme.primary }],
          ]}
          onPress={() => setActiveTab("strategy")}
          testID="tab-strategy"
        >
          <Feather
            name="trending-up"
            size={16}
            color={activeTab === "strategy" ? theme.primary : theme.textSecondary}
          />
          <ThemedText
            style={[
              styles.tabBarLabel,
              { color: activeTab === "strategy" ? theme.primary : theme.textSecondary },
            ]}
          >
            Strategy
          </ThemedText>
        </Pressable>
      </View>

      {activeTab === "giftsets" ? <GiftSetsTab /> : <StrategyTab />}
    </ThemedView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabBarItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBarItemActive: {
    borderBottomWidth: 2,
  },
  tabBarLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabContent: {
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginTop: Spacing.xl,
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  giftCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  giftCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  tierBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  totalValue: {
    fontSize: 13,
    textDecorationLine: "line-through",
  },
  sellingPrice: {
    fontSize: 18,
    fontWeight: "700",
  },
  giftTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  marketingHook: {
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: Spacing.sm,
  },
  giftDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  itemThumbnails: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  thumbnailWrapper: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.sm,
  },
  thumbnailPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  removeItemBtn: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  tweakHint: {
    fontSize: 11,
    marginBottom: Spacing.xs,
  },
  priceInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 72,
  },
  priceCurrency: {
    fontSize: 14,
    fontWeight: "700",
  },
  priceInput: {
    fontSize: 14,
    fontWeight: "700",
    minWidth: 48,
    padding: 0,
  },
  hookInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: Spacing.sm,
    minHeight: 44,
  },
  thumbnailMore: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailMoreText: {
    fontSize: 12,
    fontWeight: "600",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
  },
  savedText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  inputCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  strategyInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
    minHeight: 80,
  },
  askButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  askButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  shortcutsRow: {
    marginBottom: Spacing.xl,
  },
  shortcutChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
  },
  shortcutText: {
    fontSize: 13,
    fontWeight: "500",
  },
  loadingResponse: {
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing["3xl"],
  },
  loadingText: {
    fontSize: 14,
  },
  analysisCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  emmaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  emmaAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emmaLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  mdH1: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  mdH2: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  mdBody: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: Spacing.xs,
  },
  mdBulletRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  mdBullet: {
    fontSize: 14,
    lineHeight: 21,
    width: 12,
  },
  mdBulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  newQuestionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  newQuestionText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
