import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

export default function ItemTypeSelectorScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleDesigner = () => {
    navigation.navigate("Scan", { itemType: "designer" });
  };

  const handleHandmade = () => {
    navigation.navigate("HandmadeDetails");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing["2xl"], paddingBottom: insets.bottom + Spacing["2xl"] }]}>
      <View style={styles.header}>
        <View style={styles.emmaIcon}>
          <Feather name="star" size={32} color={Colors.dark.primary} />
        </View>
        <ThemedText style={styles.title}>What are you adding?</ThemedText>
        <ThemedText style={styles.subtitle}>Emma will appraise and price your item</ThemedText>
      </View>

      <View style={styles.options}>
        <Pressable
          style={({ pressed }) => [styles.optionCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={handleDesigner}
          testID="button-type-designer"
        >
          <View style={[styles.optionIcon, { backgroundColor: Colors.dark.primary + "20" }]}>
            <Feather name="tag" size={28} color={Colors.dark.primary} />
          </View>
          <View style={styles.optionText}>
            <ThemedText style={styles.optionTitle}>Designer / Luxury Item</ThemedText>
            <ThemedText style={styles.optionDesc}>
              Handbags, shoes, clothing, jewelry, watches, accessories — Emma authenticates and appraises your piece
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={Colors.dark.textSecondary} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.optionCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={handleHandmade}
          testID="button-type-handmade"
        >
          <View style={[styles.optionIcon, { backgroundColor: "#a78bfa20" }]}>
            <Feather name="feather" size={28} color="#a78bfa" />
          </View>
          <View style={styles.optionText}>
            <ThemedText style={styles.optionTitle}>Handmade Goods</ThemedText>
            <ThemedText style={styles.optionDesc}>
              Candles, body butter, soaps, bath products — Emma prices using artisan market formulas
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={Colors.dark.textSecondary} />
        </Pressable>
      </View>

      <ThemedText style={styles.footerText}>
        Emma uses AI to generate professional listings and pricing for your storefront
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
    paddingHorizontal: Spacing.lg,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    paddingTop: Spacing["2xl"],
  },
  emmaIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  options: {
    gap: Spacing.lg,
    flex: 1,
    justifyContent: "center",
    marginVertical: Spacing["2xl"],
  },
  optionCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  optionDesc: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  footerText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    paddingBottom: Spacing.lg,
  },
});
