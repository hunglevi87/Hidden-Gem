import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "./db";
import { articles, stashItems, userSettings, products, sellers, listingsTable, syncQueue, giftSets } from "@shared/schema";
import { eq, desc, count, and, ilike, lte, gte, or, SQL } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import { 
  testProviderConnection, 
  AIProviderConfig, 
  analyzeItemWithRetry, 
  AnalysisResult,
  analyzeWithFallback,
  correctAnalysis,
  AIProviderType,
  buildHandmadePrompt,
  HandmadeDetails,
  generateGiftSets,
  analyzeShopStrategy,
  AIAnalysisSnapshot,
} from "./ai-providers";
import { generateSEOTitle, generateDescription, generateTags, createAIRecord } from "./ai-seo";
import { uploadProductImage, deleteProductImage } from "./supabase-storage";
import { requireAuth } from "./auth-middleware";
import {
  updateEbayListing,
  deleteEbayListing,
  refreshEbayAccessToken,
  type EbayCredentials,
} from "./ebay-service";
import {
  registerPushToken,
  unregisterPushToken,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  enablePriceTracking,
  disablePriceTracking,
  getPriceTrackingStatus,
} from "./services/notification";
const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});


const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Push notification token endpoints
  app.post("/api/push-token", async (req: Request, res: Response) => {
    try {
      const { userId, token, platform } = req.body;
      if (!userId || !token || !platform) {
        return res.status(400).json({ error: "userId, token, and platform are required" });
      }
      await registerPushToken(userId, token, platform);
      res.json({ success: true });
    } catch (error) {
      console.error("Error registering push token:", error);
      res.status(500).json({ error: "Failed to register push token" });
    }
  });

  app.delete("/api/push-token", async (req: Request, res: Response) => {
    try {
      const { userId, token } = req.body;
      if (!userId || !token) {
        return res.status(400).json({ error: "userId and token are required" });
      }
      await unregisterPushToken(userId, token);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unregistering push token:", error);
      res.status(500).json({ error: "Failed to unregister push token" });
    }
  });

  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const notifications = await getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const count = await getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  app.post("/api/notifications/:id/read", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      const id = parseInt(req.params.id);
      if (!userId || isNaN(id)) {
        return res.status(400).json({ error: "userId and notification id are required" });
      }
      await markNotificationAsRead(userId, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      await markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Price tracking endpoints
  app.post("/api/stash/:id/price-tracking", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string || "anonymous";
      const id = parseInt(req.params.id);
      const { alertThreshold } = req.body;
      
      if (!userId || isNaN(id)) {
        return res.status(400).json({ error: "userId and stash item id are required" });
      }
      
      await enablePriceTracking(userId, id, alertThreshold);
      res.json({ success: true });
    } catch (error) {
      console.error("Error enabling price tracking:", error);
      res.status(500).json({ error: "Failed to enable price tracking" });
    }
  });

  app.delete("/api/stash/:id/price-tracking", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string || "anonymous";
      const id = parseInt(req.params.id);
      
      if (!userId || isNaN(id)) {
        return res.status(400).json({ error: "userId and stash item id are required" });
      }
      
      await disablePriceTracking(userId, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error disabling price tracking:", error);
      res.status(500).json({ error: "Failed to disable price tracking" });
    }
  });

  app.get("/api/stash/:id/price-tracking", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string || "anonymous";
      const id = parseInt(req.params.id);
      
      if (!userId || isNaN(id)) {
        return res.status(400).json({ error: "userId and stash item id are required" });
      }
      
      const status = await getPriceTrackingStatus(userId, id);
      res.json(status);
    } catch (error) {
      console.error("Error getting price tracking status:", error);
      res.status(500).json({ error: "Failed to get price tracking status" });
    }
  });

  app.get("/api/articles", async (_req: Request, res: Response) => {
    try {
      const allArticles = await db
        .select()
        .from(articles)
        .orderBy(desc(articles.createdAt));
      res.json(allArticles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const [article] = await db
        .select()
        .from(articles)
        .where(eq(articles.id, id));
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      
      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  app.get("/api/stash", async (req: Request, res: Response) => {
    try {
      const allItems = await db
        .select()
        .from(stashItems)
        .orderBy(desc(stashItems.createdAt));
      res.json(allItems);
    } catch (error) {
      console.error("Error fetching stash items:", error);
      res.status(500).json({ error: "Failed to fetch stash items" });
    }
  });

  app.get("/api/stash/count", async (_req: Request, res: Response) => {
    try {
      const [result] = await db.select({ count: count() }).from(stashItems);
      res.json({ count: result?.count || 0 });
    } catch (error) {
      console.error("Error fetching stash count:", error);
      res.status(500).json({ error: "Failed to fetch stash count" });
    }
  });

  app.get("/api/stash/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const [item] = await db
        .select()
        .from(stashItems)
        .where(eq(stashItems.id, id));
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Error fetching stash item:", error);
      res.status(500).json({ error: "Failed to fetch stash item" });
    }
  });

  app.post("/api/stash", async (req: Request, res: Response) => {
    try {
      const itemData = req.body;
      
      const [newItem] = await db
        .insert(stashItems)
        .values({
          userId: itemData.userId || "demo-user",
          title: itemData.title,
          description: itemData.description,
          category: itemData.category,
          estimatedValue: itemData.estimatedValue,
          condition: itemData.condition,
          tags: itemData.tags,
          fullImageUrl: itemData.fullImageUrl,
          labelImageUrl: itemData.labelImageUrl,
          aiAnalysis: itemData.aiAnalysis,
          seoTitle: itemData.seoTitle,
          seoDescription: itemData.seoDescription,
          seoKeywords: itemData.seoKeywords,
          platformVersions: itemData.platformVersions || null,
          marketMatches: itemData.marketMatches || null,
        })
        .returning();
      
      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error creating stash item:", error);
      res.status(500).json({ error: "Failed to create stash item" });
    }
  });

  app.delete("/api/stash/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(stashItems).where(eq(stashItems.id, id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting stash item:", error);
      res.status(500).json({ error: "Failed to delete stash item" });
    }
  });

  app.post("/api/analyze", upload.fields([
    { name: "fullImage", maxCount: 1 },
    { name: "labelImage", maxCount: 1 }
  ]), async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const userId = req.body.userId || "anonymous";
      
      const fullImageFile = files?.fullImage?.[0];
      const labelImageFile = files?.labelImage?.[0];

      if (!fullImageFile) {
        return res.status(400).json({ error: "Full image is required" });
      }

      // 1. Get user configuration
      const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
      
      const provider = (req.body.provider as AIProviderType) || (settings?.openfangApiKey ? "openfang" : "gemini");
      const config: AIProviderConfig = {
        provider,
        apiKey: (req.body.apiKey as string | undefined) || (provider === "openfang" ? settings?.openfangApiKey || undefined : settings?.geminiApiKey || undefined),
        endpoint: (req.body.endpoint as string | undefined) || (provider === "openfang" ? settings?.openfangBaseUrl || undefined : undefined),
        model: (req.body.model as string | undefined) || (provider === "openfang" ? settings?.preferredOpenfangModel || undefined : settings?.preferredGeminiModel || undefined),
        secondaryProvider: settings?.huggingfaceApiKey ? "custom" : undefined,
        secondaryApiKey: settings?.huggingfaceApiKey || undefined,
        secondaryEndpoint: settings?.huggingfaceApiKey ? process.env.HUGGINGFACE_CUSTOM_ENDPOINT : undefined,
      };

      // 2. Prepare images
      const images: { mimeType: string; data: string }[] = [];
      images.push({
        mimeType: fullImageFile.mimetype,
        data: fullImageFile.buffer.toString("base64"),
      });

      if (labelImageFile) {
        images.push({
          mimeType: labelImageFile.mimetype,
          data: labelImageFile.buffer.toString("base64"),
        });
      }

      // 3. Build prompt (handmade vs designer)
      const itemType = req.body.itemType as string | undefined;
      let prompt: string | undefined;
      if (itemType === "handmade" && req.body.handmadeDetails) {
        try {
          const details: HandmadeDetails = typeof req.body.handmadeDetails === "string"
            ? JSON.parse(req.body.handmadeDetails)
            : req.body.handmadeDetails;
          prompt = buildHandmadePrompt(details);
          console.log("Using handmade prompt for analysis");
        } catch (e) {
          console.warn("Failed to parse handmadeDetails, using default prompt");
        }
      }

      // 4. Analyze with fallback
      console.log(`Starting analysis for user ${userId} with primary provider ${config.provider}`);
      let result = await analyzeWithFallback(images, config, prompt);

      // 5. Run correction pass if secondary provider is configured
      if (config.secondaryProvider || process.env.OPENFANG_API_KEY) {
        console.log("Running correction pass...");
        result = await correctAnalysis(result, config);
      }
      
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to analyze item";
      console.error("Error analyzing item:", error);
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/settings/threshold", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.json({ threshold: 500 });
      }
      const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
      res.json({ threshold: settings?.highValueThreshold ?? 500 });
    } catch (error) {
      console.error("Error fetching threshold:", error);
      res.json({ threshold: 500 });
    }
  });

  app.put("/api/settings/threshold", async (req: Request, res: Response) => {
    try {
      const { userId, threshold } = req.body;
      if (!userId || threshold === undefined) {
        return res.status(400).json({ error: "userId and threshold are required" });
      }
      const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
      if (existing) {
        await db.update(userSettings)
          .set({ highValueThreshold: threshold, updatedAt: new Date() })
          .where(eq(userSettings.userId, userId));
      } else {
        await db.insert(userSettings).values({ userId, highValueThreshold: threshold });
      }
      res.json({ success: true, threshold });
    } catch (error) {
      console.error("Error updating threshold:", error);
      res.status(500).json({ error: "Failed to update threshold" });
    }
  });

  app.post("/api/stash/:id/hold-for-review", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const [item] = await db.select().from(stashItems).where(eq(stashItems.id, id));
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      await db.update(stashItems)
        .set({ publishStatus: "held_for_review", updatedAt: new Date() })
        .where(eq(stashItems.id, id));
      res.json({ success: true, publishStatus: "held_for_review" });
    } catch (error) {
      console.error("Error holding item for review:", error);
      res.status(500).json({ error: "Failed to hold item for review" });
    }
  });

  app.post("/api/stash/:id/approve-publish", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const [item] = await db.select().from(stashItems).where(eq(stashItems.id, id));
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      await db.update(stashItems)
        .set({ publishStatus: "approved", updatedAt: new Date() })
        .where(eq(stashItems.id, id));
      res.json({ success: true, publishStatus: "approved" });
    } catch (error) {
      console.error("Error approving item:", error);
      res.status(500).json({ error: "Failed to approve item" });
    }
  });

  app.post("/api/stash/:id/publish/woocommerce", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { storeUrl, consumerKey, consumerSecret, skipThresholdCheck } = req.body;
      
      if (!storeUrl || !consumerKey || !consumerSecret) {
        return res.status(400).json({ error: "Missing WooCommerce credentials" });
      }
      
      const [item] = await db.select().from(stashItems).where(eq(stashItems.id, id));
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      if (item.publishedToWoocommerce) {
        return res.status(400).json({ error: "Item already published to WooCommerce" });
      }

      if (!skipThresholdCheck) {
        const aiAnalysis = (item.aiAnalysis ?? {}) as AIAnalysisSnapshot;
        const suggestedPrice = aiAnalysis?.suggestedListPrice;
        if (suggestedPrice) {
          const userId = (req.body.userId as string) || item.userId;
          const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
          const threshold = settings?.highValueThreshold ?? 500;
          if (suggestedPrice > threshold && item.publishStatus !== "approved") {
            await db.update(stashItems)
              .set({ publishStatus: "held_for_review", updatedAt: new Date() })
              .where(eq(stashItems.id, id));
            return res.status(202).json({
              held: true,
              reason: "high_value",
              suggestedPrice,
              threshold,
              message: `This item's suggested price ($${suggestedPrice}) exceeds your approval threshold ($${threshold}). Please review and confirm before publishing.`,
            });
          }
        }
      }
      
      const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
      const priceMatch = item.estimatedValue?.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
      const price = priceMatch ? priceMatch[1].replace(/,/g, "") : "0";
      
      const productData = {
        name: item.title,
        type: "simple",
        regular_price: price,
        description: item.seoDescription || item.description || "",
        short_description: item.description?.substring(0, 200) || "",
        categories: [],
        images: item.fullImageUrl ? [{ src: item.fullImageUrl }] : [],
        status: "publish",
      };
      
      const wooResponse = await fetch(`${storeUrl}/wp-json/wc/v3/products`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });
      
      if (!wooResponse.ok) {
        const errorData = await wooResponse.json().catch(() => ({}));
        return res.status(wooResponse.status).json({ 
          error: errorData.message || `WooCommerce error: ${wooResponse.status}` 
        });
      }
      
      const product = await wooResponse.json();
      
      await db.update(stashItems)
        .set({
          publishedToWoocommerce: true,
          woocommerceProductId: String(product.id),
          updatedAt: new Date(),
        })
        .where(eq(stashItems.id, id));
      
      res.json({ 
        success: true, 
        productId: product.id,
        productUrl: product.permalink || `${storeUrl}/?p=${product.id}` 
      });
    } catch (error) {
      console.error("WooCommerce publish error:", error);
      res.status(500).json({ error: "Failed to publish to WooCommerce" });
    }
  });
  
  app.post("/api/stash/:id/publish/ebay", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { clientId, clientSecret, refreshToken, environment, merchantLocationKey, skipThresholdCheck } = req.body;
      
      if (!clientId || !clientSecret) {
        return res.status(400).json({ error: "Missing eBay credentials" });
      }
      
      if (!refreshToken) {
        return res.status(400).json({ 
          error: "User OAuth refresh token required to create listings. Generate a refresh token from eBay Developer Portal and add it in eBay settings." 
        });
      }
      
      const [item] = await db.select().from(stashItems).where(eq(stashItems.id, id));
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      if (item.publishedToEbay) {
        return res.status(400).json({ error: "Item already published to eBay" });
      }

      if (!skipThresholdCheck) {
        const aiAnalysis = (item.aiAnalysis ?? {}) as AIAnalysisSnapshot;
        const suggestedPrice = aiAnalysis?.suggestedListPrice;
        if (suggestedPrice) {
          const userId = (req.body.userId as string) || item.userId;
          const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
          const threshold = settings?.highValueThreshold ?? 500;
          if (suggestedPrice > threshold && item.publishStatus !== "approved") {
            await db.update(stashItems)
              .set({ publishStatus: "held_for_review", updatedAt: new Date() })
              .where(eq(stashItems.id, id));
            return res.status(202).json({
              held: true,
              reason: "high_value",
              suggestedPrice,
              threshold,
              message: `This item's suggested price ($${suggestedPrice}) exceeds your approval threshold ($${threshold}). Please review and confirm before publishing.`,
            });
          }
        }
      }
      
      const baseUrl = environment === "production"
        ? "https://api.ebay.com"
        : "https://api.sandbox.ebay.com";
      
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const tokenResponse = await fetch(`${baseUrl}/identity/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
      });
      
      if (!tokenResponse.ok) {
        const error = await tokenResponse.json().catch(() => ({}));
        return res.status(tokenResponse.status).json({ 
          error: error.error_description || "Failed to authenticate with eBay. Check your credentials and refresh token." 
        });
      }
      
      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      
      const priceMatch = item.estimatedValue?.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
      const price = priceMatch ? priceMatch[1].replace(/,/g, "") : "9.99";
      
      const conditionMap: Record<string, string> = {
        "Mint": "NEW",
        "Excellent": "LIKE_NEW",
        "Very Good": "VERY_GOOD",
        "Good": "GOOD",
        "Fair": "ACCEPTABLE",
        "Poor": "FOR_PARTS_OR_NOT_WORKING",
      };
      
      const sku = `HG-${id}-${Date.now()}`;
      const locationKey = merchantLocationKey || "DEFAULT";
      
      const inventoryItem = {
        availability: {
          shipToLocationAvailability: {
            quantity: 1,
          },
        },
        condition: conditionMap[item.condition || "Good"] || "GOOD",
        product: {
          title: (item.seoTitle || item.title).substring(0, 80),
          description: `<p>${item.seoDescription || item.description || item.title}</p>`,
          imageUrls: item.fullImageUrl ? [item.fullImageUrl] : [],
        },
      };
      
      const inventoryResponse = await fetch(`${baseUrl}/sell/inventory/v1/inventory_item/${sku}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US",
        },
        body: JSON.stringify(inventoryItem),
      });
      
      if (!inventoryResponse.ok && inventoryResponse.status !== 204) {
        const error = await inventoryResponse.json().catch(() => ({}));
        const errorMessage = error.errors?.[0]?.message || `eBay inventory error: ${inventoryResponse.status}`;
        console.error("eBay inventory error:", error);
        return res.status(inventoryResponse.status).json({ error: errorMessage });
      }
      
      const offer = {
        sku: sku,
        marketplaceId: "EBAY_US",
        format: "FIXED_PRICE",
        availableQuantity: 1,
        categoryId: "1",
        listingDescription: `<p>${item.seoDescription || item.description || item.title}</p>`,
        listingPolicies: {
          fulfillmentPolicyId: null,
          paymentPolicyId: null,
          returnPolicyId: null,
        },
        merchantLocationKey: locationKey,
        pricingSummary: {
          price: {
            currency: "USD",
            value: price,
          },
        },
      };
      
      const offerResponse = await fetch(`${baseUrl}/sell/inventory/v1/offer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US",
        },
        body: JSON.stringify(offer),
      });
      
      let offerId: string | null = null;
      let listingId: string | null = null;
      
      if (offerResponse.ok || offerResponse.status === 201) {
        const offerData = await offerResponse.json();
        offerId = offerData.offerId;
        
        const publishResponse = await fetch(`${baseUrl}/sell/inventory/v1/offer/${offerId}/publish`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        
        if (publishResponse.ok) {
          const publishData = await publishResponse.json();
          listingId = publishData.listingId;
        } else {
          const publishError = await publishResponse.json().catch(() => ({}));
          console.error("eBay publish offer error:", publishError);
        }
      } else {
        const offerError = await offerResponse.json().catch(() => ({}));
        console.error("eBay offer error:", offerError);
        
        const requiresPolicies = offerError.errors?.some((e: { message?: string; errorId?: number }) => 
          e.message?.includes("policy") || e.errorId === 25002
        );
        
        if (requiresPolicies) {
          return res.status(400).json({ 
            error: "eBay requires business policies (shipping, payment, return) to be configured in your Seller Hub before listing items. Please set up these policies at ebay.com/sh/settings/policies." 
          });
        }
        
        return res.status(offerResponse.status).json({ 
          error: offerError.errors?.[0]?.message || `eBay offer error: ${offerResponse.status}` 
        });
      }
      
      await db.update(stashItems)
        .set({
          publishedToEbay: true,
          ebayListingId: listingId || offerId || sku,
          updatedAt: new Date(),
        })
        .where(eq(stashItems.id, id));
      
      const listingUrl = listingId 
        ? (environment === "production" 
          ? `https://www.ebay.com/itm/${listingId}`
          : `https://sandbox.ebay.com/itm/${listingId}`)
        : undefined;
      
      res.json({ 
        success: true, 
        listingId: listingId || offerId || sku,
        listingUrl,
        message: listingId ? "Item listed on eBay" : "Inventory created. Check your Seller Hub to complete the listing."
      });
    } catch (error) {
      console.error("eBay publish error:", error);
      res.status(500).json({ error: "Failed to publish to eBay. Please check your credentials and try again." });
    }
  });

  app.post("/api/ai-providers/test", async (req: Request, res: Response) => {
    try {
      const { provider, apiKey, endpoint, model } = req.body;
      
      if (!provider) {
        return res.status(400).json({ success: false, message: "Provider is required" });
      }

      const config: AIProviderConfig = {
        provider,
        apiKey,
        endpoint,
        model,
      };

      const result = await testProviderConnection(config);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Test failed";
      console.error("AI provider test error:", error);
      res.status(500).json({ success: false, message });
    }
  });

  app.post("/api/analyze/retry", upload.fields([
    { name: "fullImage", maxCount: 1 },
    { name: "labelImage", maxCount: 1 }
  ]), async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const fullImageFile = files?.fullImage?.[0];
      const labelImageFile = files?.labelImage?.[0];
      
      const { previousResult, feedback, provider, apiKey, endpoint, model } = req.body;
      
      if (!previousResult || !feedback) {
        return res.status(400).json({ error: "previousResult and feedback are required" });
      }

      const images: { mimeType: string; data: string }[] = [];
      if (fullImageFile) {
        images.push({ mimeType: fullImageFile.mimetype, data: fullImageFile.buffer.toString("base64") });
      }
      if (labelImageFile) {
        images.push({ mimeType: labelImageFile.mimetype, data: labelImageFile.buffer.toString("base64") });
      }

      const requestedProvider = typeof provider === "string" && provider.trim() ? provider.trim() : undefined;
      const primaryConfig: AIProviderConfig = {
        provider: (requestedProvider || "openfang") as AIProviderConfig["provider"],
        apiKey,
        endpoint,
        model,
      };

      const parsedPrevious: AnalysisResult = typeof previousResult === "string" 
        ? JSON.parse(previousResult) 
        : previousResult;

      try {
        const result = await analyzeItemWithRetry(primaryConfig, images, parsedPrevious, feedback);
        return res.json(result);
      } catch (primaryError) {
        const canFallbackToGemini = requestedProvider === "openfang";
        if (!canFallbackToGemini) {
          throw primaryError;
        }

        const fallbackConfig: AIProviderConfig = {
          provider: "gemini",
          model: "gemini-2.5-flash",
        };

        const fallbackResult = await analyzeItemWithRetry(fallbackConfig, images, parsedPrevious, feedback);
        return res.json(fallbackResult);
      }
    } catch (error) {
      console.error("Error in retry analysis:", error);
      res.status(500).json({ error: "Failed to re-analyze item" });
    }
  });

  // -------------------------------------------------------------------------
  // FlipAgent routes — products, image upload, eBay CRUD, SEO generation
  // -------------------------------------------------------------------------

  // --- Products CRUD (FlipAgent products table) ---

  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const sellerId = req.query.sellerId as string;
      const query = sellerId
        ? db.select().from(products).where(eq(products.sellerId, sellerId)).orderBy(desc(products.createdAt))
        : db.select().from(products).orderBy(desc(products.createdAt));
      res.json(await query);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, req.params.id));
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const [product] = await db
        .insert(products)
        .values({
          sellerId: data.sellerId,
          sku: data.sku,
          title: data.title,
          description: data.description,
          brand: data.brand,
          styleName: data.styleName,
          category: data.category,
          condition: data.condition,
          price: data.price,
          cost: data.cost,
          estimatedProfit: data.estimatedProfit,
          images: data.images || {},
          attributes: data.attributes || {},
          tags: data.tags || [],
        })
        .returning();
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const [updated] = await db
        .update(products)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(products.id, req.params.id))
        .returning();
      if (!updated) return res.status(404).json({ error: "Product not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req: Request, res: Response) => {
    try {
      await db.delete(products).where(eq(products.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // --- Supabase Storage image upload (replaces Multer for persisted images) ---

  app.post("/api/upload/image", upload.single("image"), async (req: Request, res: Response) => {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "No image file provided" });

      const sellerId = req.body.sellerId || "anonymous";
      const result = await uploadProductImage(
        file.buffer,
        file.originalname,
        file.mimetype,
        sellerId,
      );
      res.json(result);
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to upload image",
      });
    }
  });

  app.delete("/api/upload/image", async (req: Request, res: Response) => {
    try {
      const { path: imagePath } = req.body;
      if (!imagePath) return res.status(400).json({ error: "path is required" });
      await deleteProductImage(imagePath);
      res.json({ success: true });
    } catch (error) {
      console.error("Image delete error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete image",
      });
    }
  });

  // --- SEO generation from AI analysis ---

  app.post("/api/seo/generate", async (req: Request, res: Response) => {
    try {
      const { analysis, sellerId, productId, imageUrl } = req.body;
      if (!analysis) return res.status(400).json({ error: "analysis object is required" });

      const seoTitle = generateSEOTitle(analysis);
      const description = generateDescription(analysis);
      const tags = generateTags(analysis);

      let aiRecordId: string | undefined;
      if (sellerId && imageUrl) {
        aiRecordId = await createAIRecord({ sellerId, productId, imageUrl, analysis });
      }

      res.json({ seoTitle, description, tags, aiRecordId });
    } catch (error) {
      console.error("SEO generation error:", error);
      res.status(500).json({ error: "Failed to generate SEO data" });
    }
  });

  // --- eBay listing update / delete / token refresh ---

  app.put("/api/ebay/listing/:itemId", async (req: Request, res: Response) => {
    try {
      const { clientId, clientSecret, refreshToken, environment, ...input } = req.body;
      if (!clientId || !clientSecret || !refreshToken) {
        return res.status(400).json({ error: "eBay credentials required" });
      }
      const creds: EbayCredentials = { clientId, clientSecret, refreshToken, environment: environment || "sandbox" };
      const result = await updateEbayListing(creds, req.params.itemId, input);
      res.json(result);
    } catch (error) {
      console.error("eBay update error:", error);
      res.status(500).json({ error: "Failed to update eBay listing" });
    }
  });

  app.delete("/api/ebay/listing/:itemId", async (req: Request, res: Response) => {
    try {
      const { clientId, clientSecret, refreshToken, environment } = req.body;
      if (!clientId || !clientSecret || !refreshToken) {
        return res.status(400).json({ error: "eBay credentials required" });
      }
      const creds: EbayCredentials = { clientId, clientSecret, refreshToken, environment: environment || "sandbox" };
      const result = await deleteEbayListing(creds, req.params.itemId);
      res.json(result);
    } catch (error) {
      console.error("eBay delete error:", error);
      res.status(500).json({ error: "Failed to delete eBay listing" });
    }
  });

  app.post("/api/ebay/refresh-token", async (req: Request, res: Response) => {
    try {
      const { clientId, clientSecret, refreshToken, environment } = req.body;
      if (!clientId || !clientSecret || !refreshToken) {
        return res.status(400).json({ error: "eBay credentials required" });
      }
      const creds: EbayCredentials = { clientId, clientSecret, refreshToken, environment: environment || "sandbox" };
      const tokens = await refreshEbayAccessToken(creds);
      res.json(tokens);
    } catch (error) {
      console.error("eBay token refresh error:", error);
      res.status(500).json({ error: "Failed to refresh eBay token" });
    }
  });

  // --- Sync queue inspection (read-only for now) ---

  app.get("/api/sync-queue", async (req: Request, res: Response) => {
    try {
      const sellerId = req.query.sellerId as string;
      if (!sellerId) return res.status(400).json({ error: "sellerId is required" });
      const jobs = await db
        .select()
        .from(syncQueue)
        .where(eq(syncQueue.sellerId, sellerId))
        .orderBy(desc(syncQueue.createdAt));
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching sync queue:", error);
      res.status(500).json({ error: "Failed to fetch sync queue" });
    }
  });

  app.post("/api/seo/generate", async (req: Request, res: Response) => {
    try {
      const { itemId, userId } = req.body;
      if (!itemId) {
        return res.status(400).json({ error: "Item ID is required" });
      }

      // 1. Get the item and its current analysis
      const [item] = await db.select().from(stashItems).where(eq(stashItems.id, parseInt(itemId)));
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      if (!item.aiAnalysis) {
        return res.status(400).json({ error: "Item has no AI analysis to optimize" });
      }

      // 2. Get user configuration for AI
      const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId || item.userId));
      
      const provider = (settings?.openfangApiKey ? "openfang" : "gemini");
      const config: AIProviderConfig = {
        provider: provider as AIProviderType,
        apiKey: provider === "openfang" ? settings?.openfangApiKey || undefined : settings?.geminiApiKey || undefined,
        endpoint: provider === "openfang" ? settings?.openfangBaseUrl || undefined : undefined,
        model: provider === "openfang" ? settings?.preferredOpenfangModel || undefined : settings?.preferredGeminiModel || undefined,
        secondaryProvider: settings?.openfangApiKey && settings?.geminiApiKey ? "gemini" : undefined,
      };

      // 3. Generate SEO Listing
      const { generateSEOListing } = await import("./ai-providers");
      const optimizedResult = await generateSEOListing(item.aiAnalysis as AnalysisResult, config);

      // 4. Update the item in the database
      const [updatedItem] = await db.update(stashItems)
        .set({
          title: optimizedResult.title,
          seoTitle: optimizedResult.seoTitle || optimizedResult.title,
          seoDescription: optimizedResult.seoDescription || optimizedResult.description,
          seoKeywords: optimizedResult.seoKeywords || [],
          aiAnalysis: optimizedResult,
          updatedAt: new Date()
        })
        .where(eq(stashItems.id, parseInt(itemId)))
        .returning();

      res.json(updatedItem);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate SEO listing";
      console.error("Error generating SEO listing:", error);
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/stash/search", async (req: Request, res: Response) => {
    try {
      const { query, userId } = req.body;
      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "userId is required" });
      }
      if (!query || typeof query !== "string" || query.trim().length === 0) {
        return res.status(400).json({ error: "Search query is required" });
      }

      const parsePrompt = `You are a search query parser for a reseller inventory app. Parse the following natural-language search query into structured filter parameters.

Query: "${query.trim()}"

Extract the following filters (use null for any filter not mentioned):
- brand: string or null (brand name like "Louis Vuitton", "Gucci", "Nike", etc.)
- maxPrice: number or null (maximum price in dollars, extract from phrases like "under $300", "less than 500", "below $200")
- minPrice: number or null (minimum price in dollars, extract from phrases like "over $100", "more than 50", "above $75")
- category: string or null (item category like "Handbag", "Watch", "Clothing", "Shoes", "Electronics", "Collectible", etc.)
- condition: string or null (one of: "New", "Like New", "Very Good", "Good", "Acceptable", "For Parts", "Excellent", "Fair", "Poor")
- publishStatus: string or null (one of: "draft", "published", "held_for_review", "approved")
- keywords: string[] (array of additional search keywords that don't fit the above filters)

Respond ONLY with valid JSON. Example:
{"brand":"Louis Vuitton","maxPrice":300,"minPrice":null,"category":"Handbag","condition":null,"publishStatus":null,"keywords":["bags"]}`;

      interface StashSearchFilters {
        brand?: string;
        category?: string;
        condition?: string;
        publishStatus?: string;
        maxPrice?: number;
        minPrice?: number;
        keywords?: string[];
      }
      let filters: StashSearchFilters = {};
      try {
        const parseResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: parsePrompt }] }],
          config: { responseMimeType: "application/json" },
        });
        const parseText = parseResponse.text || "{}";
        filters = JSON.parse(parseText);
      } catch (parseErr) {
        filters = { keywords: query.trim().split(/\s+/) };
      }

      const conditions: SQL[] = [];

      if (filters.brand && typeof filters.brand === "string") {
        conditions.push(
          or(
            ilike(stashItems.title, `%${filters.brand}%`),
            ilike(stashItems.description, `%${filters.brand}%`),
            ilike(stashItems.seoTitle, `%${filters.brand}%`)
          )!
        );
      }

      if (filters.category && typeof filters.category === "string") {
        conditions.push(ilike(stashItems.category, `%${filters.category}%`));
      }

      if (filters.condition && typeof filters.condition === "string") {
        conditions.push(ilike(stashItems.condition, `%${filters.condition}%`));
      }

      if (filters.publishStatus && typeof filters.publishStatus === "string") {
        conditions.push(eq(stashItems.publishStatus, filters.publishStatus));
      }

      if (filters.keywords && Array.isArray(filters.keywords) && filters.keywords.length > 0) {
        const keywordConditions = filters.keywords.map((kw: string) =>
          or(
            ilike(stashItems.title, `%${kw}%`),
            ilike(stashItems.description, `%${kw}%`),
            ilike(stashItems.seoTitle, `%${kw}%`),
            ilike(stashItems.category, `%${kw}%`)
          )!
        );
        conditions.push(...keywordConditions);
      }

      conditions.unshift(eq(stashItems.userId, userId));

      let results;
      results = await db
        .select()
        .from(stashItems)
        .where(and(...conditions))
        .orderBy(desc(stashItems.createdAt));

      if (filters.maxPrice && typeof filters.maxPrice === "number") {
        results = results.filter((item) => {
          const priceMatch = item.estimatedValue?.match(/\$(\d+(?:,\d{3})*)/);
          if (!priceMatch) return true;
          const price = parseInt(priceMatch[1].replace(/,/g, ""), 10);
          return price <= filters.maxPrice;
        });
      }

      if (filters.minPrice && typeof filters.minPrice === "number") {
        results = results.filter((item) => {
          const priceMatch = item.estimatedValue?.match(/\$(\d+(?:,\d{3})*)/);
          if (!priceMatch) return false;
          const price = parseInt(priceMatch[1].replace(/,/g, ""), 10);
          return price >= filters.minPrice;
        });
      }

      res.json({ results, filters, total: results.length });
    } catch (error) {
      console.error("Stash search error:", error);
      res.status(500).json({ error: "Failed to search stash" });
    }
  });

  // ---------------------------------------------------------------------------
  // Craft & Strategy Studio Routes
  // ---------------------------------------------------------------------------

  // Helper: build stash summaries from DB items without unsafe any casts
  function buildStashSummaries(items: (typeof stashItems.$inferSelect)[]) {
    return items.map((item) => {
      const analysis = (item.aiAnalysis ?? {}) as AIAnalysisSnapshot;
      return {
        id: item.id,
        title: item.title,
        category: item.category,
        estimatedValue: item.estimatedValue,
        estimatedValueHigh: typeof analysis.estimatedValueHigh === "number" ? analysis.estimatedValueHigh : undefined,
        suggestedListPrice: typeof analysis.suggestedListPrice === "number" ? analysis.suggestedListPrice : undefined,
        fullImageUrl: item.fullImageUrl,
        itemType: item.itemType,
        brand: typeof analysis.brand === "string" ? analysis.brand : undefined,
        condition: item.condition ?? undefined,
      };
    });
  }

  // GET /api/craft/gift-sets — list saved gift sets for a user
  app.get("/api/craft/gift-sets", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId as string;
      const sets = await db
        .select()
        .from(giftSets)
        .where(eq(giftSets.userId, userId))
        .orderBy(desc(giftSets.createdAt));
      res.json(sets);
    } catch (error) {
      console.error("Error fetching gift sets:", error);
      res.status(500).json({ error: "Failed to fetch gift sets" });
    }
  });

  // POST /api/craft/gift-sets — canonical generate endpoint per task spec
  // (also registered as /generate below for backward compat)
  app.post("/api/craft/gift-sets", requireAuth, async (req: Request, res: Response) => {
    if (req.body?.action === "save") {
      // Route to save handler if explicitly requested via this path
      return res.status(400).json({ error: "Use POST /api/craft/gift-sets/save to persist a set" });
    }
    try {
      const userId = res.locals.userId as string;

      const items = await db
        .select()
        .from(stashItems)
        .where(eq(stashItems.userId, userId))
        .orderBy(desc(stashItems.createdAt));

      if (items.length === 0) {
        return res.status(400).json({ error: "No items in your stash to bundle" });
      }

      const summaries = buildStashSummaries(items);
      const generatedSets = await generateGiftSets(summaries);
      const itemMap = new Map(items.map((i) => [i.id, i]));
      const setsWithSnapshots = generatedSets.map((set) => ({
        ...set,
        itemsSnapshot: set.itemIds
          .map((id) => itemMap.get(id))
          .filter((i): i is NonNullable<typeof i> => i !== undefined)
          .map((i) => ({
            id: i.id,
            title: i.title,
            fullImageUrl: i.fullImageUrl,
            estimatedValue: i.estimatedValue,
            category: i.category,
          })),
      }));

      res.json(setsWithSnapshots);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate gift sets";
      console.error("Error generating gift sets:", error);
      res.status(500).json({ error: message });
    }
  });

  // POST /api/craft/gift-sets/generate — generate new bundles from stash
  app.post("/api/craft/gift-sets/generate", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId as string;

      const items = await db
        .select()
        .from(stashItems)
        .where(eq(stashItems.userId, userId))
        .orderBy(desc(stashItems.createdAt));

      if (items.length === 0) {
        return res.status(400).json({ error: "No items in your stash to bundle" });
      }

      const summaries = buildStashSummaries(items);
      const generatedSets = await generateGiftSets(summaries);

      // Attach item snapshots for client display (no extra round-trips needed)
      const itemMap = new Map(items.map((i) => [i.id, i]));
      const setsWithSnapshots = generatedSets.map((set) => ({
        ...set,
        itemsSnapshot: set.itemIds
          .map((id) => itemMap.get(id))
          .filter((i): i is NonNullable<typeof i> => i !== undefined)
          .map((i) => ({
            id: i.id,
            title: i.title,
            fullImageUrl: i.fullImageUrl,
            estimatedValue: i.estimatedValue,
            category: i.category,
          })),
      }));

      res.json(setsWithSnapshots);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate gift sets";
      console.error("Error generating gift sets:", error);
      res.status(500).json({ error: message });
    }
  });

  // POST /api/craft/gift-sets/save — persist a generated gift set (owned by userId)
  app.post("/api/craft/gift-sets/save", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId as string;
      const { tier, title, description, marketingHook, itemIds, itemsSnapshot, totalValue, sellingPrice } = req.body as {
        tier: string;
        title: string;
        description?: string;
        marketingHook?: string;
        itemIds?: number[];
        itemsSnapshot?: unknown;
        totalValue?: number;
        sellingPrice?: number;
      };
      if (!tier || !title) {
        return res.status(400).json({ error: "tier and title are required" });
      }

      const [saved] = await db
        .insert(giftSets)
        .values({
          userId,
          tier,
          title,
          description: description ?? null,
          marketingHook: marketingHook ?? null,
          itemIds: Array.isArray(itemIds) ? itemIds : [],
          itemsSnapshot: itemsSnapshot ?? null,
          totalValue: totalValue != null ? String(totalValue) : null,
          sellingPrice: sellingPrice != null ? String(sellingPrice) : null,
        })
        .returning();

      res.status(201).json(saved);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save gift set";
      console.error("Error saving gift set:", error);
      res.status(500).json({ error: message });
    }
  });

  // DELETE /api/craft/gift-sets/:id — remove a saved gift set (ownership enforced)
  app.delete("/api/craft/gift-sets/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = res.locals.userId as string;
      if (isNaN(id)) {
        return res.status(400).json({ error: "Valid id is required" });
      }
      // Scope deletion to owner — prevents cross-user deletion (IDOR)
      const result = await db
        .delete(giftSets)
        .where(and(eq(giftSets.id, id), eq(giftSets.userId, userId)))
        .returning({ id: giftSets.id });
      if (result.length === 0) {
        return res.status(404).json({ error: "Gift set not found or not owned by you" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting gift set:", error);
      res.status(500).json({ error: "Failed to delete gift set" });
    }
  });

  // POST /api/craft/strategy — ask Emma a strategy question (SSE streaming response)
  app.post("/api/craft/strategy", requireAuth, async (req: Request, res: Response) => {
    const userId = res.locals.userId as string;
    const { question } = req.body as { question: string };
    if (!question?.trim()) {
      return res.status(400).json({ error: "question is required" });
    }

    // Set SSE headers before streaming begins
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      const items = await db
        .select()
        .from(stashItems)
        .where(eq(stashItems.userId, userId))
        .orderBy(desc(stashItems.createdAt));

      const summaries = buildStashSummaries(items);
      await analyzeShopStrategy(summaries, question.trim(), (chunk) => {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      });

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to analyze shop strategy";
      console.error("Error in shop strategy:", error);
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
