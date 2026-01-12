import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert, Platform, Image } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { useAuthContext } from "@/contexts/AuthContext";
import * as Haptics from "expo-haptics";
import logoImage from "../../assets/images/logo.png";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithGoogle } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Missing Information", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Success", "Check your email for a verification link!");
      } else {
        await signIn(email, password);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error: any) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert("Error", error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert("Error", error.message || "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing["4xl"], paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
      >
        <View style={styles.logoContainer}>
          <Image source={logoImage} style={styles.logo} resizeMode="contain" />
          <ThemedText style={styles.appName}>HiddenGem</ThemedText>
        </View>

        <View style={styles.headerContainer}>
          <ThemedText style={styles.title}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {isSignUp
              ? "Start building your reseller inventory"
              : "Sign in to access your stash"}
          </ThemedText>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Feather name="mail" size={20} color={Colors.dark.textSecondary} style={styles.inputIcon} />
            <View style={styles.inputWrapper}>
              <ThemedText style={styles.inputLabel}>Email</ThemedText>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={Colors.dark.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.textInput}
                testID="input-email"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Feather name="lock" size={20} color={Colors.dark.textSecondary} style={styles.inputIcon} />
            <View style={styles.inputWrapper}>
              <ThemedText style={styles.inputLabel}>Password</ThemedText>
              <View style={styles.passwordRow}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.dark.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  style={[styles.textInput, styles.passwordInput]}
                  testID="input-password"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={20} color={Colors.dark.textSecondary} />
                </Pressable>
              </View>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.authButton,
              pressed && styles.authButtonPressed,
              loading && styles.authButtonDisabled,
            ]}
            onPress={handleAuth}
            disabled={loading}
            testID="button-auth"
          >
            {loading ? (
              <ActivityIndicator color={Colors.dark.buttonText} />
            ) : (
              <>
                <ThemedText style={styles.authButtonText}>
                  {isSignUp ? "Create Account" : "Sign In"}
                </ThemedText>
                <Feather name="arrow-right" size={20} color={Colors.dark.buttonText} />
              </>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <ThemedText style={styles.dividerText}>or</ThemedText>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.googleButtonPressed,
              googleLoading && styles.authButtonDisabled,
            ]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            testID="button-google-signin"
          >
            {googleLoading ? (
              <ActivityIndicator color={Colors.dark.text} />
            ) : (
              <>
                <View style={styles.googleIconContainer}>
                  <ThemedText style={styles.googleIcon}>G</ThemedText>
                </View>
                <ThemedText style={styles.googleButtonText}>
                  Continue with Google
                </ThemedText>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
            testID="button-switch-auth"
          >
            <ThemedText style={styles.switchText}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <ThemedText style={styles.switchTextHighlight}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </ThemedText>
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </ThemedText>
        </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing["2xl"],
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.dark.primary,
  },
  headerContainer: {
    marginBottom: Spacing["3xl"],
  },
  title: {
    ...Typography.h2,
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  formContainer: {
    gap: Spacing.lg,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.md,
    marginTop: Spacing.lg,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xs,
  },
  textInput: {
    ...Typography.body,
    color: Colors.dark.text,
    padding: 0,
    margin: 0,
    height: 24,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  authButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.primary,
    borderRadius: BorderRadius.md,
    height: Spacing.buttonHeight,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  authButtonPressed: {
    opacity: 0.8,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    ...Typography.button,
    color: Colors.dark.buttonText,
  },
  switchButton: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  switchText: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
  },
  switchTextHighlight: {
    color: Colors.dark.primary,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  dividerText: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    marginHorizontal: Spacing.lg,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    height: Spacing.buttonHeight,
    gap: Spacing.md,
  },
  googleButtonPressed: {
    opacity: 0.8,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4285F4",
  },
  googleButtonText: {
    ...Typography.button,
    color: Colors.dark.text,
  },
  footer: {
    marginTop: "auto",
    paddingTop: Spacing["3xl"],
  },
  footerText: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
});
