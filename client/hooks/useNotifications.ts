import { useState, useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "@/lib/query-client";

let Notifications: any = null;
let Device: any = null;

async function loadNotificationsModule() {
  if (Platform.OS === "web") return;
  try {
    Notifications = await import("expo-notifications");
    Device = await import("expo-device");

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn("expo-notifications not available:", e);
  }
}

async function getExpoPushToken(): Promise<string | null> {
  if (!Notifications || !Device) return null;
  if (!Device.isDevice) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: 5,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D4AF37",
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return tokenData.data;
}

export function useNotifications(isAuthenticated: boolean) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  const registerToken = useCallback(async (token: string) => {
    try {
      await apiRequest("POST", "/api/push-token", {
        userId: "anonymous",
        token,
        platform: Platform.OS,
      });
    } catch (e) {
      // Silently fail - notifications are optional
    }
  }, []);

  const unregisterToken = useCallback(async (token: string) => {
    try {
      await apiRequest("DELETE", "/api/push-token", {
        userId: "anonymous",
        token,
      });
    } catch (e) {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let mounted = true;

    async function setup() {
      const pref = await AsyncStorage.getItem("notifications_enabled");
      if (pref === "false") return;

      await loadNotificationsModule();
      if (!Notifications) return;

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (mounted) {
        setPermissionStatus(finalStatus);
      }

      if (finalStatus !== "granted") {
        return;
      }

      const token = await getExpoPushToken();
      if (token && mounted) {
        setExpoPushToken(token);
        await registerToken(token);
      }

      notificationListener.current =
        Notifications.addNotificationReceivedListener(() => {});
      responseListener.current =
        Notifications.addNotificationResponseReceivedListener(() => {});
    }

    setup();

    return () => {
      mounted = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated, registerToken]);

  return {
    expoPushToken,
    permissionStatus,
    registerToken,
    unregisterToken,
  };
}
