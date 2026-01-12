import { Platform } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { isLiquidGlassAvailable } from "expo-glass-effect";

import { Colors, Fonts } from "@/constants/theme";

interface UseScreenOptionsParams {
  transparent?: boolean;
}

export function useScreenOptions({
  transparent = true,
}: UseScreenOptionsParams = {}): NativeStackNavigationOptions {
  const theme = Colors.dark;
  const isDark = true;

  return {
    headerTitleAlign: "center",
    headerTransparent: transparent,
    headerBlurEffect: "dark",
    headerTintColor: theme.text,
    headerTitleStyle: {
      fontFamily: Fonts?.heading || "serif",
      fontWeight: "600",
      color: theme.text,
    },
    headerStyle: {
      backgroundColor: Platform.select({
        ios: undefined,
        android: theme.backgroundRoot,
        web: theme.backgroundRoot,
      }),
    },
    gestureEnabled: true,
    gestureDirection: "horizontal",
    fullScreenGestureEnabled: isLiquidGlassAvailable() ? false : true,
    contentStyle: {
      backgroundColor: theme.backgroundRoot,
    },
  };
}
