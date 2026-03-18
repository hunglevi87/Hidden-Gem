import React, { useState, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform, Alert, Image } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type ScanStep = "full" | "label";

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<ScanStep>("full");
  const [fullImageUri, setFullImageUri] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;
    
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      
      if (!photo?.uri) {
        Alert.alert("Error", "Failed to capture photo");
        return;
      }

      if (step === "full") {
        setFullImageUri(photo.uri);
        setStep("label");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        navigation.navigate("Analysis", {
          fullImageUri: fullImageUri!,
          labelImageUri: photo.uri,
        });
        setStep("full");
        setFullImageUri(null);
      }
    } catch (error) {
      console.error("Failed to take picture:", error);
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    }
  }, [step, fullImageUri, navigation]);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (step === "full") {
          setFullImageUri(result.assets[0].uri);
          setStep("label");
        } else {
          navigation.navigate("Analysis", {
            fullImageUri: fullImageUri!,
            labelImageUri: result.assets[0].uri,
          });
          setStep("full");
          setFullImageUri(null);
        }
      }
    } catch (error) {
      console.error("Failed to pick image:", error);
    }
  }, [step, fullImageUri, navigation]);

  const handleClose = useCallback(() => {
    setStep("full");
    setFullImageUri(null);
    navigation.goBack();
  }, [navigation]);

  const toggleFlash = useCallback(() => {
    setFlash(!flash);
  }, [flash]);

  if (!permission) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.permissionContainer}>
          <ThemedText>Loading camera...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.permissionContainer, { paddingTop: insets.top + Spacing["4xl"] }]}>
          <View style={styles.permissionCard}>
            <View style={styles.permissionIconContainer}>
              <Feather name="camera" size={48} color={Colors.dark.primary} />
            </View>
            <ThemedText style={styles.permissionTitle}>Camera Access Required</ThemedText>
            <ThemedText style={styles.permissionText}>
              Emma needs your camera to scan and appraise items for your stash.
            </ThemedText>
            <Pressable
              style={({ pressed }) => [styles.permissionButton, pressed && { opacity: 0.8 }]}
              onPress={requestPermission}
              testID="button-enable-camera"
            >
              <ThemedText style={styles.permissionButtonText}>Enable Camera</ThemedText>
            </Pressable>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        enableTorch={flash}
      />
      
      <View style={[styles.overlay, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.topRow}>
          <Pressable
            style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}
            onPress={handleClose}
            testID="button-close-camera"
          >
            <Feather name="x" size={24} color={Colors.dark.text} />
          </Pressable>
          
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, step === "full" && styles.stepDotActive]} />
            <View style={[styles.stepDot, step === "label" && styles.stepDotActive]} />
          </View>
          
          <Pressable
            style={({ pressed }) => [styles.helpButton, pressed && { opacity: 0.7 }]}
            testID="button-help"
          >
            <Feather name="help-circle" size={24} color={Colors.dark.text} />
          </Pressable>
        </View>

        <View style={styles.centerArea}>
          {fullImageUri && step === "label" ? (
            <View style={styles.previewThumbnail}>
              <Image source={{ uri: fullImageUri }} style={styles.thumbnailImage} />
              <View style={styles.thumbnailCheck}>
                <Feather name="check" size={12} color={Colors.dark.success} />
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.bottomArea}>
          <View style={styles.instructionCard}>
            <ThemedText style={styles.instructionTitle}>
              {step === "full" ? "Snap Full Item" : "Snap Label Close-Up"}
            </ThemedText>
            <ThemedText style={styles.instructionText}>
              {step === "full"
                ? "Capture the entire item in the frame"
                : "Get a clear shot of the label or tag"}
            </ThemedText>
          </View>

          <View style={styles.controlsRow}>
            <Pressable
              style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.7 }]}
              onPress={toggleFlash}
              testID="button-flash"
            >
              <Feather name={flash ? "zap" : "zap-off"} size={24} color={Colors.dark.text} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.captureButton, pressed && { transform: [{ scale: 0.95 }] }]}
              onPress={takePicture}
              testID="button-capture"
            >
              <View style={styles.captureButtonInner} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.7 }]}
              onPress={pickImage}
              testID="button-gallery"
            >
              <Feather name="image" size={24} color={Colors.dark.text} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  permissionCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing["2xl"],
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  permissionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  permissionButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.dark.buttonText,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepIndicator: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  stepDotActive: {
    backgroundColor: Colors.dark.primary,
  },
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  centerArea: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    paddingLeft: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  previewThumbnail: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.dark.success,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailCheck: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomArea: {
    paddingHorizontal: Spacing.lg,
  },
  instructionCard: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: Spacing.lg,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  captureButtonInner: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
    backgroundColor: Colors.dark.text,
  },
});
