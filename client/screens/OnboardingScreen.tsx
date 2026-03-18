import React, { useState, useRef } from "react";
import { View, StyleSheet, Image, Pressable, Dimensions } from "react-native";
import PagerView, { PagerViewOnPageSelectedEvent } from "react-native-pager-view";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

// @ts-ignore
import onboardingScan from "../../assets/images/onboarding-scan.png";
import { GlassView } from "expo-glass-effect";

const { width } = Dimensions.get("window");

const ONBOARDING_DATA = [
  {
    title: "Scan & Discover",
    description: "Capture two photos: one of the item and one of its label for a deep-dive analysis.",
    image: onboardingScan,
  },
  {
    title: "Meet Emma",
    description: "Emma is your personal AI specialist. She identifies, values, and categorizes your finds in seconds using multiple AI models.",
    icon: "cpu" as const,
  },
  {
    title: "Publish Everywhere",
    description: "Sync your stash directly to eBay and WooCommerce with optimized SEO listings.",
    icon: "share-2" as const,
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeIndex, setActiveIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  const handleNext = async () => {
    if (activeIndex < ONBOARDING_DATA.length - 1) {
      pagerRef.current?.setPage(activeIndex + 1);
    } else {
      await AsyncStorage.setItem("onboarding_complete", "true");
      navigation.replace("Auth");
    }
  };

  const onPageSelected = (e: PagerViewOnPageSelectedEvent) => {
    setActiveIndex(e.nativeEvent.position);
  };

  return (
    <ThemedView style={styles.container}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={onPageSelected}
      >
        {ONBOARDING_DATA.map((item, index) => (
          <View key={index} style={styles.page}>
            <View style={styles.imageContainer}>
              {item.image ? (
                <Image source={item.image} style={styles.image} resizeMode="contain" />
              ) : (
                <View style={styles.iconContainer}>
                  <GlassView glassEffectStyle="regular" style={styles.glassIcon}>
                    <Feather name={item.icon} size={80} color={Colors.dark.primary} />
                  </GlassView>
                </View>
              )}
            </View>

            <View style={[styles.content, { paddingBottom: insets.bottom + Spacing["5xl"] }]}>
              <ThemedText style={styles.title}>{item.title}</ThemedText>
              <ThemedText style={styles.description}>{item.description}</ThemedText>
            </View>
          </View>
        ))}
      </PagerView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.pagination}>
          {ONBOARDING_DATA.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                activeIndex === index && styles.activeDot,
              ]}
            />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleNext}
          testID="button-next"
        >
          <ThemedText style={styles.buttonText}>
            {activeIndex === ONBOARDING_DATA.length - 1 ? "Get Started" : "Next"}
          </ThemedText>
          <Feather
            name={activeIndex === ONBOARDING_DATA.length - 1 ? "check" : "arrow-right"}
            size={20}
            color={Colors.dark.buttonText}
          />
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  image: {
    width: width * 0.8,
    height: width * 0.8,
  },
  iconContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  glassIcon: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(212, 175, 55, 0.1)",
  },
  content: {
    alignItems: "center",
    gap: Spacing.lg,
  },
  title: {
    ...Typography.h1,
    color: Colors.dark.primary,
    textAlign: "center",
  },
  description: {
    ...Typography.bodyLarge,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 28,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing["2xl"],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pagination: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  activeDot: {
    width: 24,
    backgroundColor: Colors.dark.primary,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    ...Typography.button,
    color: Colors.dark.buttonText,
  },
});
