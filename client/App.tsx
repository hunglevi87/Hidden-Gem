import React from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import { ThemeProvider, useThemeContext } from "@/contexts/ThemeContext";
import { useNotifications } from "@/hooks/useNotifications";
import { Colors } from "@/constants/theme";
import EmmaChat from "@/components/EmmaChat";

function AppInner() {
  const { isAuthenticated } = useAuthContext();
  const { theme } = useThemeContext();
  useNotifications(isAuthenticated);

  const isDark = theme === "dark";
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const themeColors = Colors[theme];

  const HiddenGemTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: themeColors.primary,
      background: themeColors.backgroundRoot,
      card: themeColors.backgroundDefault,
      text: themeColors.text,
      border: themeColors.border,
      notification: themeColors.primary,
    },
  };

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={[styles.root, { backgroundColor: themeColors.backgroundRoot }]}>
        <KeyboardProvider>
          <NavigationContainer theme={HiddenGemTheme}>
            <RootStackNavigator />
          </NavigationContainer>
          <EmmaChat />
          <StatusBar style={isDark ? "light" : "dark"} />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AppInner />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
