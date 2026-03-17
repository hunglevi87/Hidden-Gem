import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import AuthScreen from "@/screens/AuthScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import ItemDetailsScreen from "@/screens/ItemDetailsScreen";
import AnalysisScreen from "@/screens/AnalysisScreen";
import ArticleScreen from "@/screens/ArticleScreen";
import WooCommerceSettingsScreen from "@/screens/WooCommerceSettingsScreen";
import EbaySettingsScreen from "@/screens/EbaySettingsScreen";
import TermsOfServiceScreen from "@/screens/TermsOfServiceScreen";
import PrivacyPolicyScreen from "@/screens/PrivacyPolicyScreen";
import AIProvidersScreen from "@/screens/AIProvidersScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuthContext } from "@/contexts/AuthContext";
import { Colors } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  Settings: undefined;
  WooCommerceSettings: undefined;
  EbaySettings: undefined;
  AIProviders: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  ItemDetails: { itemId: number };
  Analysis: { fullImageUri: string; labelImageUri: string };
  Article: { articleId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, loading: authLoading, isConfigured } = useAuthContext();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("onboarding_complete").then((value) => {
      setOnboardingComplete(value === "true");
    });
  }, []);

  if (authLoading || onboardingComplete === null) {
    return null;
  }

  const showOnboarding = !onboardingComplete;
  const showAuthScreen = !isAuthenticated && isConfigured;

  return (
    <Stack.Navigator 
      screenOptions={{
        ...screenOptions,
        contentStyle: { backgroundColor: Colors.dark.backgroundRoot },
      }}
      initialRouteName={showOnboarding ? "Onboarding" : (showAuthScreen ? "Auth" : "Main")}
    >
      {showOnboarding && (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
      )}
      {showAuthScreen ? (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerTitle: "Settings",
            }}
          />
          <Stack.Screen
            name="ItemDetails"
            component={ItemDetailsScreen}
            options={{
              headerTitle: "Item Details",
            }}
          />
          <Stack.Screen
            name="Analysis"
            component={AnalysisScreen}
            options={{
              presentation: "modal",
              headerTitle: "Analyzing...",
            }}
          />
          <Stack.Screen
            name="Article"
            component={ArticleScreen}
            options={{
              headerTitle: "Article",
            }}
          />
          <Stack.Screen
            name="WooCommerceSettings"
            component={WooCommerceSettingsScreen}
            options={{
              headerTitle: "WooCommerce",
            }}
          />
          <Stack.Screen
            name="EbaySettings"
            component={EbaySettingsScreen}
            options={{
              headerTitle: "eBay",
            }}
          />
          <Stack.Screen
            name="TermsOfService"
            component={TermsOfServiceScreen}
            options={{
              headerTitle: "Terms of Service",
            }}
          />
          <Stack.Screen
            name="PrivacyPolicy"
            component={PrivacyPolicyScreen}
            options={{
              headerTitle: "Privacy Policy",
            }}
          />
          <Stack.Screen
            name="AIProviders"
            component={AIProvidersScreen}
            options={{
              headerTitle: "AI Providers",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
