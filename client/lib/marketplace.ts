import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, getApiUrl } from "@/lib/query-client";

export interface WooCommerceSettings {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface EbaySettings {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  environment: "sandbox" | "production";
}

export async function getWooCommerceSettings(): Promise<WooCommerceSettings | null> {
  try {
    const url = await AsyncStorage.getItem("woocommerce_url");
    const status = await AsyncStorage.getItem("woocommerce_status");
    
    if (status !== "connected" || !url) return null;
    
    let consumerKey: string | null;
    let consumerSecret: string | null;
    
    if (Platform.OS !== "web") {
      consumerKey = await SecureStore.getItemAsync("woocommerce_consumer_key");
      consumerSecret = await SecureStore.getItemAsync("woocommerce_consumer_secret");
    } else {
      consumerKey = await AsyncStorage.getItem("woocommerce_consumer_key");
      consumerSecret = await AsyncStorage.getItem("woocommerce_consumer_secret");
    }
    
    if (!consumerKey || !consumerSecret) return null;
    
    return { storeUrl: url, consumerKey, consumerSecret };
  } catch (error) {
    console.error("Failed to get WooCommerce settings:", error);
    return null;
  }
}

export async function getEbaySettings(): Promise<EbaySettings | null> {
  try {
    const env = await AsyncStorage.getItem("ebay_environment");
    const status = await AsyncStorage.getItem("ebay_status");
    
    if (status !== "connected") return null;
    
    let clientId: string | null;
    let clientSecret: string | null;
    let refreshToken: string | null;
    
    if (Platform.OS !== "web") {
      clientId = await SecureStore.getItemAsync("ebay_client_id");
      clientSecret = await SecureStore.getItemAsync("ebay_client_secret");
      refreshToken = await SecureStore.getItemAsync("ebay_refresh_token");
    } else {
      clientId = await AsyncStorage.getItem("ebay_client_id");
      clientSecret = await AsyncStorage.getItem("ebay_client_secret");
      refreshToken = await AsyncStorage.getItem("ebay_refresh_token");
    }
    
    if (!clientId || !clientSecret) return null;
    
    return {
      clientId,
      clientSecret,
      refreshToken: refreshToken || "",
      environment: (env === "production" ? "production" : "sandbox") as "sandbox" | "production",
    };
  } catch (error) {
    console.error("Failed to get eBay settings:", error);
    return null;
  }
}

export async function publishToWooCommerce(
  itemId: number,
  settings: WooCommerceSettings
): Promise<{ success: boolean; productUrl?: string; error?: string }> {
  try {
    const response = await apiRequest(`/api/stash/${itemId}/publish/woocommerce`, {
      method: "POST",
      body: JSON.stringify({
        storeUrl: settings.storeUrl,
        consumerKey: settings.consumerKey,
        consumerSecret: settings.consumerSecret,
      }),
    });
    
    if (response.error) {
      return { success: false, error: response.error };
    }
    
    return { success: true, productUrl: response.productUrl };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to publish to WooCommerce" };
  }
}

export async function publishToEbay(
  itemId: number,
  settings: EbaySettings
): Promise<{ success: boolean; listingUrl?: string; error?: string }> {
  try {
    const response = await apiRequest(`/api/stash/${itemId}/publish/ebay`, {
      method: "POST",
      body: JSON.stringify({
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
        refreshToken: settings.refreshToken,
        environment: settings.environment,
      }),
    });
    
    if (response.error) {
      return { success: false, error: response.error };
    }
    
    return { success: true, listingUrl: response.listingUrl };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to publish to eBay" };
  }
}
