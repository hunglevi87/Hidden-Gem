import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { HandmadeDetails } from "@shared/types";

export default function HandmadeDetailsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [productName, setProductName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [scentOrTexture, setScentOrTexture] = useState("");
  const [sizeVolume, setSizeVolume] = useState("");
  const [costOfGoods, setCostOfGoods] = useState("");

  const handleContinue = () => {
    if (!productName.trim()) {
      Alert.alert("Required", "Please enter a product name.");
      return;
    }
    if (!ingredients.trim()) {
      Alert.alert("Required", "Please list the main ingredients or materials.");
      return;
    }
    const cog = parseFloat(costOfGoods);
    if (isNaN(cog) || cog <= 0) {
      Alert.alert("Required", "Please enter a valid cost of goods (e.g., 4.50).");
      return;
    }

    const details: HandmadeDetails = {
      productName: productName.trim(),
      ingredients: ingredients.trim(),
      scentOrTexture: scentOrTexture.trim(),
      sizeVolume: sizeVolume.trim(),
      costOfGoods: cog,
    };

    navigation.navigate("Scan", { itemType: "handmade", handmadeDetails: details });
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + Spacing["4xl"] },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <Feather name="feather" size={28} color="#a78bfa" />
            </View>
            <View style={styles.heroText}>
              <ThemedText style={styles.heroTitle}>Tell Emma About Your Product</ThemedText>
              <ThemedText style={styles.heroSubtitle}>
                Emma will price it using artisan market formulas
              </ThemedText>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Product Name *</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="e.g., Lavender Honey Body Butter"
                placeholderTextColor={Colors.dark.textSecondary}
                value={productName}
                onChangeText={setProductName}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Ingredients / Materials *</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g., Shea butter, coconut oil, beeswax, lavender essential oil, honey extract"
                placeholderTextColor={Colors.dark.textSecondary}
                value={ingredients}
                onChangeText={setIngredients}
                multiline
                numberOfLines={3}
              />
              <ThemedText style={styles.hint}>List all key ingredients or materials</ThemedText>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Scent / Texture Notes</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="e.g., Floral lavender, whipped creamy texture"
                placeholderTextColor={Colors.dark.textSecondary}
                value={scentOrTexture}
                onChangeText={setScentOrTexture}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Size / Volume</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="e.g., 8 oz / 226g"
                placeholderTextColor={Colors.dark.textSecondary}
                value={sizeVolume}
                onChangeText={setSizeVolume}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Cost of Goods (COG) *</ThemedText>
              <View style={styles.currencyRow}>
                <ThemedText style={styles.currencySymbol}>$</ThemedText>
                <TextInput
                  style={[styles.input, styles.currencyInput]}
                  placeholder="0.00"
                  placeholderTextColor={Colors.dark.textSecondary}
                  value={costOfGoods}
                  onChangeText={setCostOfGoods}
                  keyboardType="decimal-pad"
                />
              </View>
              <ThemedText style={styles.hint}>
                Emma uses this to calculate your retail price (3–5× COG formula)
              </ThemedText>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleContinue}
            testID="button-continue-to-scan"
          >
            <Feather name="camera" size={20} color={Colors.dark.buttonText} />
            <ThemedText style={styles.continueButtonText}>Take Product Photo</ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#a78bfa20",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: Spacing.md,
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  currencySymbol: {
    fontSize: 18,
    color: Colors.dark.primary,
    fontWeight: "700",
  },
  currencyInput: {
    flex: 1,
  },
  hint: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  continueButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.dark.buttonText,
  },
});
