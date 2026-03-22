import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { Colors, Spacing } from "@/constants/theme";
import DiscoverScreen from "@/screens/DiscoverScreen";
import ItemTypeSelectorScreen from "@/screens/ItemTypeSelectorScreen";
import StashScreen from "@/screens/StashScreen";
import CraftScreen from "@/screens/CraftScreen";
import { ThemedText } from "@/components/ThemedText";
import { useAuthContext } from "@/contexts/AuthContext";
import type { RootStackParamList } from "./RootStackNavigator";

export type MainTabParamList = {
  DiscoverTab: undefined;
  ScanTab: undefined;
  StashTab: undefined;
  CraftTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function HeaderLeft() {
  const { user } = useAuthContext();
  const displayName = user?.email?.split("@")[0] || "Hunter";
  
  return (
    <View style={styles.headerLeft}>
      <ThemedText style={styles.userName}>{displayName}</ThemedText>
      <ThemedText style={styles.huntingText}>Hunting</ThemedText>
    </View>
  );
}

function HeaderRight() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/stash/count"],
  });
  
  const scanCount = countData?.count ?? 0;
  
  return (
    <View style={styles.headerRight}>
      <View style={styles.scanBadge}>
        <Feather name="zap" size={14} color={Colors.dark.primary} />
        <ThemedText style={styles.scanCount}>{scanCount}</ThemedText>
      </View>
      <Pressable 
        onPress={() => navigation.navigate("Settings")}
        style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.7 }]}
        testID="button-settings"
      >
        <Feather name="settings" size={22} color={Colors.dark.text} />
      </Pressable>
    </View>
  );
}

export default function MainTabNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Tab.Navigator
      initialRouteName="DiscoverTab"
      screenOptions={{
        ...screenOptions,
        tabBarActiveTintColor: Colors.dark.primary,
        tabBarInactiveTintColor: Colors.dark.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: Colors.dark.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
          height: 85,
          paddingBottom: Platform.OS === "ios" ? 28 : 12,
          paddingTop: 8,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
        headerLeft: () => <HeaderLeft />,
        headerRight: () => <HeaderRight />,
        headerLeftContainerStyle: { paddingLeft: Spacing.lg },
        headerRightContainerStyle: { paddingRight: Spacing.lg },
      }}
    >
      <Tab.Screen
        name="DiscoverTab"
        component={DiscoverScreen}
        options={{
          title: "Discover",
          headerTitle: "",
          tabBarIcon: ({ color, size }) => (
            <Feather name="book-open" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ScanTab"
        component={ItemTypeSelectorScreen}
        options={{
          title: "Scan",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[
              styles.scanButton,
              { backgroundColor: focused ? Colors.dark.primary : Colors.dark.surface }
            ]}>
              <Feather name="camera" size={24} color={focused ? Colors.dark.buttonText : color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="StashTab"
        component={StashScreen}
        options={{
          title: "Stash",
          headerTitle: "",
          tabBarIcon: ({ color, size }) => (
            <Feather name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CraftTab"
        component={CraftScreen}
        options={{
          title: "Craft",
          headerTitle: "",
          tabBarIcon: ({ color, size }) => (
            <Feather name="gift" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "column",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
  },
  huntingText: {
    fontSize: 12,
    color: Colors.dark.primary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  scanBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    gap: 4,
  },
  scanCount: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.primary,
  },
  settingsButton: {
    padding: Spacing.xs,
  },
});
