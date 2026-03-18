import React, { useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Platform, Switch } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { useAuthContext } from "@/contexts/AuthContext";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useTheme } from "@/hooks/useTheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</ThemedText>
      <View style={[styles.sectionContent, { backgroundColor: theme.surface }]}>{children}</View>
    </View>
  );
}

interface SettingsRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  isDestructive?: boolean;
  showChevron?: boolean;
  status?: "connected" | "not_connected";
  children?: React.ReactNode;
}

function SettingsRow({ icon, label, value, onPress, isDestructive, showChevron = true, status, children }: SettingsRowProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingsRow,
        { borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.backgroundSecondary }
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingsRowLeft}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: theme.backgroundSecondary },
          isDestructive && styles.iconContainerDestructive
        ]}>
          <Feather name={icon} size={18} color={isDestructive ? theme.error : theme.primary} />
        </View>
        <ThemedText style={[styles.settingsLabel, { color: theme.text }, isDestructive && { color: theme.error }]}>
          {label}
        </ThemedText>
      </View>
      <View style={styles.settingsRowRight}>
        {children}
        {status ? (
          <View style={[styles.statusBadge, status === "connected" ? styles.statusBadgeConnected : styles.statusBadgeDisconnected]}>
            <View style={[styles.statusDot, status === "connected" ? { backgroundColor: theme.success } : { backgroundColor: theme.textSecondary }]} />
            <ThemedText style={[styles.statusBadgeText, status === "connected" ? { color: theme.success } : { color: theme.textSecondary }]}>
              {status === "connected" ? "Connected" : "Not Connected"}
            </ThemedText>
          </View>
        ) : value ? (
          <ThemedText style={[styles.settingsValue, { color: theme.textSecondary }]}>{value}</ThemedText>
        ) : null}
        {showChevron && onPress ? (
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        ) : null}
      </View>
    </Pressable>
  );
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut } = useAuthContext();
  const { theme: themeMode, toggleTheme } = useThemeContext();
  const { theme } = useTheme();
  const [wooCommerceStatus, setWooCommerceStatus] = React.useState("Not configured");
  const [ebayStatus, setEbayStatus] = React.useState("Not configured");

  const loadIntegrationStatus = useCallback(async () => {
    try {
      const wooStatus = await AsyncStorage.getItem("woocommerce_status");
      if (wooStatus === "connected") {
        setWooCommerceStatus("Connected");
      } else {
        setWooCommerceStatus("Not configured");
      }

      const ebayStatus = await AsyncStorage.getItem("ebay_status");
      if (ebayStatus === "connected") {
        setEbayStatus("Connected");
      } else {
        setEbayStatus("Not configured");
      }
    } catch (error) {
      console.error("Failed to load integration status:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadIntegrationStatus();
    }, [loadIntegrationStatus])
  );

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          } catch (error) {
            Alert.alert("Error", "Failed to sign out.");
          }
        },
      },
    ]);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title="Appearance">
          <SettingsRow
            icon={themeMode === "dark" ? "moon" : "sun"}
            label="Dark Mode"
            showChevron={false}
          >
            <Switch
              value={themeMode === "dark"}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.backgroundTertiary, true: theme.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : theme.backgroundDefault}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Emma (AI Configuration)">
          <SettingsRow
            icon="cpu"
            label="Emma's Brain"
            onPress={() => navigation.navigate("AIProviders")}
          />
        </SettingsSection>

        <View style={[styles.accountHeader, { backgroundColor: theme.surface }]}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.primary }]}>
            <ThemedText style={[styles.avatarText, { color: theme.buttonText }]}>
              {user?.email?.charAt(0).toUpperCase() || "?"}
            </ThemedText>
          </View>
          <View style={styles.accountInfo}>
            <ThemedText style={[styles.accountEmail, { color: theme.text }]}>{user?.email || "Unknown"}</ThemedText>
            <ThemedText style={[styles.accountLabel, { color: theme.textSecondary }]}>Signed in</ThemedText>
          </View>
          <Pressable
            style={({ pressed }) => [styles.signOutButton, pressed && { opacity: 0.7 }]}
            onPress={handleSignOut}
            testID="button-sign-out"
          >
            <Feather name="log-out" size={18} color={theme.error} />
            <ThemedText style={[styles.signOutText, { color: theme.error }]}>Sign Out</ThemedText>
          </Pressable>
        </View>

        <SettingsSection title="Connected Marketplaces">
          <SettingsRow
            icon="shopping-bag"
            label="WooCommerce"
            status={wooCommerceStatus === "Connected" ? "connected" : "not_connected"}
            onPress={() => navigation.navigate("WooCommerceSettings")}
          />
          <SettingsRow
            icon="tag"
            label="eBay"
            status={ebayStatus === "Connected" ? "connected" : "not_connected"}
            onPress={() => navigation.navigate("EbaySettings")}
          />
        </SettingsSection>

        <SettingsSection title="App">
          <SettingsRow icon="info" label="Version" value="1.0.0" showChevron={false} />
          <SettingsRow icon="file-text" label="Terms of Service" onPress={() => navigation.navigate("TermsOfService")} />
          <SettingsRow icon="shield" label="Privacy Policy" onPress={() => navigation.navigate("PrivacyPolicy")} />
        </SettingsSection>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    ...Typography.small,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  sectionContent: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  settingsRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  settingsRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainerDestructive: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  settingsLabel: {
    ...Typography.body,
  },
  settingsValue: {
    ...Typography.small,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  statusBadgeConnected: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  statusBadgeDisconnected: {
    backgroundColor: "rgba(156, 163, 175, 0.15)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    ...Typography.caption,
    fontWeight: "500",
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...Typography.h4,
    fontWeight: "700",
  },
  accountInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  accountEmail: {
    ...Typography.body,
    fontWeight: "600",
  },
  accountLabel: {
    ...Typography.caption,
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  signOutText: {
    ...Typography.small,
    fontWeight: "600",
  },
});
