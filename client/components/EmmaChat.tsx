import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuthContext } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const SUGGESTED_PROMPTS = [
  "Price check this item",
  "Help me write a Poshmark caption",
  "What's trending right now?",
  "Analyze my stash",
];

const PANEL_RATIO = 0.72;

interface StashContextStats {
  itemCount: number;
  totalEstimatedValue: number;
}

export default function EmmaChat() {
  const { isAuthenticated, session } = useAuthContext();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const panelHeight = screenHeight * PANEL_RATIO;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitializingGreeting, setIsInitializingGreeting] = useState(false);

  const slideAnim = useRef(new Animated.Value(panelHeight)).current;
  const scrollRef = useRef<ScrollView>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasOpened = useRef(false);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  const sellerName = session?.user?.user_metadata?.full_name
    ?? session?.user?.email?.split("@")[0]
    ?? "there";

  const buildGreeting = (stats: StashContextStats | null): string => {
    if (stats && stats.itemCount > 0) {
      return `Hi ${sellerName}! I can see your stash has ${stats.itemCount} item${stats.itemCount !== 1 ? "s" : ""} with an estimated total value of $${stats.totalEstimatedValue.toFixed(0)}. What can I help you with today?`;
    }
    return `Hi ${sellerName}! I'm Emma, your shop advisor. Ask me anything about pricing, listings, bundles, or strategy for your stash.`;
  };

  const fetchStashContext = useCallback(async () => {
    if (!session?.access_token) return null;
    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/chat/context`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) return null;
      const data = (await response.json()) as StashContextStats;
      return data;
    } catch {
      return null;
    }
  }, [session?.access_token]);

  const openPanel = () => {
    setIsOpen(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 22,
      stiffness: 160,
    }).start(() => scrollToBottom());

    if (!hasOpened.current) {
      hasOpened.current = true;
      setIsInitializingGreeting(true);
      setMessages([{ id: "greeting", role: "assistant", content: "", streaming: true }]);
      fetchStashContext().then((stats) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === "greeting"
              ? { ...m, content: buildGreeting(stats), streaming: false }
              : m
          )
        );
        setIsInitializingGreeting(false);
      });
    }
  };

  const closePanel = () => {
    abortRef.current?.abort();
    Animated.timing(slideAnim, {
      toValue: panelHeight,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setIsOpen(false));
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming || isInitializingGreeting) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
    };
    const assistantId = `a-${Date.now() + 1}`;
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);
    scrollToBottom();

    const history = [...messages, userMsg].map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    try {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const baseUrl = getApiUrl();
      const token = session?.access_token;

      const response = await fetch(`${baseUrl}api/chat`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.body) throw new Error("No response body");

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
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as {
              chunk?: string;
              error?: string;
            };
            if (parsed.chunk) {
              fullText += parsed.chunk;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: fullText, streaming: true }
                    : m
                )
              );
            }
            if (parsed.error) {
              fullText = parsed.error;
            }
          } catch {
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: fullText || "Sorry, I couldn't respond right now.",
                streaming: false,
              }
            : m
        )
      );
    } catch (err: unknown) {
      const isAbort = (err as Error)?.name === "AbortError";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  isAbort
                    ? m.content || "Response cancelled."
                    : "Something went wrong. Please try again.",
                streaming: false,
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      scrollToBottom();
    }
  };

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  if (!isAuthenticated) return null;

  const c = Colors.dark;
  const fabBottom = insets.bottom + 70;
  const showSuggestions = messages.length <= 1 && !isStreaming && !isInitializingGreeting;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {!isOpen && (
        <Pressable
          style={[styles.fab, { bottom: fabBottom, backgroundColor: c.primary }]}
          onPress={openPanel}
          accessibilityLabel="Open Emma chat"
        >
          <ThemedText style={styles.fabIcon}>✦</ThemedText>
        </Pressable>
      )}

      {isOpen && (
        <Pressable
          style={styles.backdrop}
          onPress={closePanel}
          accessibilityLabel="Close chat"
        />
      )}

      {isOpen && (
        <Animated.View
          style={[
            styles.panel,
            {
              height: panelHeight,
              backgroundColor: c.backgroundDefault,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: c.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.avatar, { backgroundColor: c.primary }]}>
                <ThemedText style={styles.avatarLabel}>E</ThemedText>
              </View>
              <View>
                <ThemedText style={[styles.headerName, { color: c.text }]}>
                  Emma
                </ThemedText>
                <ThemedText style={[styles.headerRole, { color: c.textSecondary }]}>
                  Shop Advisor
                </ThemedText>
              </View>
            </View>
            <Pressable
              onPress={closePanel}
              style={styles.closeBtn}
              accessibilityLabel="Close"
            >
              <Feather name="x" size={22} color={c.textSecondary} />
            </Pressable>
          </View>

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              ref={scrollRef}
              style={styles.flex}
              contentContainerStyle={styles.messageList}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.bubble,
                    msg.role === "user"
                      ? [styles.userBubble, { backgroundColor: c.primary }]
                      : [styles.assistantBubble, { backgroundColor: c.backgroundRoot }],
                  ]}
                >
                  {msg.streaming && msg.content.length === 0 ? (
                    <ActivityIndicator size="small" color={c.primary} />
                  ) : (
                    <ThemedText
                      style={[
                        styles.bubbleText,
                        msg.role === "user"
                          ? { color: "#fff" }
                          : { color: c.text },
                      ]}
                    >
                      {msg.content}
                      {msg.streaming && msg.content.length > 0 ? "▍" : ""}
                    </ThemedText>
                  )}
                </View>
              ))}

              {showSuggestions && (
                <View style={styles.suggestions}>
                  {SUGGESTED_PROMPTS.map((p) => (
                    <Pressable
                      key={p}
                      style={[
                        styles.chip,
                        { borderColor: c.border, backgroundColor: c.backgroundRoot },
                      ]}
                      onPress={() => sendMessage(p)}
                    >
                      <ThemedText style={[styles.chipText, { color: c.primary }]}>
                        {p}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>

            <View
              style={[
                styles.inputBar,
                { borderTopColor: c.border, backgroundColor: c.backgroundDefault },
              ]}
            >
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: c.text,
                    backgroundColor: c.backgroundRoot,
                    borderColor: c.border,
                  },
                ]}
                value={input}
                onChangeText={setInput}
                placeholder="Ask Emma anything..."
                placeholderTextColor={c.textSecondary}
                multiline
                maxLength={500}
                onSubmitEditing={() => sendMessage(input)}
                returnKeyType="send"
                blurOnSubmit={false}
                editable={!isStreaming && !isInitializingGreeting}
              />
              <Pressable
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: c.primary,
                    opacity: !input.trim() || isStreaming || isInitializingGreeting ? 0.4 : 1,
                  },
                ]}
                onPress={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming || isInitializingGreeting}
                accessibilityLabel="Send"
              >
                <Feather name="arrow-up" size={18} color="#fff" />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  fab: {
    position: "absolute",
    right: 18,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabIcon: {
    fontSize: 22,
    color: "#fff",
    lineHeight: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    elevation: 16,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerRole: {
    fontSize: 12,
  },
  closeBtn: {
    padding: 6,
  },
  messageList: {
    padding: 14,
    gap: 10,
    paddingBottom: 8,
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  suggestions: {
    gap: 8,
    marginTop: 10,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
});
