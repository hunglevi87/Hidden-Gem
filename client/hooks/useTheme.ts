import { Colors } from "@/constants/theme";
import { useThemeContext } from "@/contexts/ThemeContext";

export function useTheme() {
  const { theme: themeMode } = useThemeContext();
  const isDark = themeMode === "dark";
  const theme = Colors[themeMode];

  return {
    theme,
    isDark,
  };
}
