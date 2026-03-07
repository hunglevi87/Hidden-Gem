import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "./db";
import { articles, stashItems, products, sellers, listingsTable, syncQueue } from "@shared/schema";
import { eq, desc, count, and } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import { testProviderConnection, AIProviderConfig, analyzeItemWithRetry, AnalysisResult } from "./ai-providers";
import { generateSEOTitle, generateDescription, generateTags, createAIRecord } from "./ai-seo";
import { uploadProductImage, deleteProductImage } from "./supabase-storage";
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
      
      const fullImageFile = files?.fullImage?.[0];
      const labelImageFile = files?.labelImage?.[0];

      const prompt = `You are an expert appraiser and reseller assistant. Analyze this collectible/vintage item and provide a detailed assessment.

Based on the images provided (one showing the full item and one showing the label/tag), please provide:
1. A clear, descriptive title for the item
2. A detailed description suitable for a listing
3. The category (e.g., Handbag, Watch, Clothing, Electronics, Collectible, etc.)
4. An estimated resale value range (e.g., "$150-$200")
5. The condition (Excellent, Very Good, Good, Fair, Poor)
6. An SEO-optimized title for online listings
7. An SEO-optimized description
8. 5-10 relevant SEO keywords
9. 3-5 relevant tags for categorization

Respond ONLY with valid JSON in this exact format:
{
  "title": "Item title",
  "description": "Detailed description...",
  "category": "Category name",
  "estimatedValue": "$XX-$XX",
  "condition": "Condition rating",
  "seoTitle": "SEO optimized title",
  "seoDescription": "SEO optimized description...",
  "seoKeywords": ["keyword1", "keyword2", "keyword3"],
  "tags": ["tag1", "tag2", "tag3"]
}`;

      const parts: any[] = [{ text: prompt }];

      if (fullImageFile) {
        parts.push({
          inlineData: {
            mimeType: fullImageFile.mimetype,
            data: fullImageFile.buffer.toString("base64"),
          },
        });
      }

      if (labelImageFile) {
        parts.push({
          inlineData: {
            mimeType: labelImageFile.mimetype,
            data: labelImageFile.buffer.toString("base64"),
          },
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts }],
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "";
      
      try {
        const result = JSON.parse(text);
        res.json(result);
      } catch (parseError) {
        res.json({
          title: "Vintage Item",
          description: "A vintage collectible item in good condition.",
          category: "Collectible",
          estimatedValue: "$50-$100",
          condition: "Good",
          seoTitle: "Vintage Collectible Item for Sale",
          seoDescription: "Authentic vintage collectible in excellent condition. Perfect for collectors.",
          seoKeywords: ["vintage", "collectible", "antique"],
          tags: ["vintage", "collectible"],
        });
      }
    } catch (error) {
      console.error("Error analyzing item:", error);
      res.status(500).json({ error: "Failed to analyze item" });
    }
  });

  app.post("/api/stash/:id/publish/woocommerce", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { storeUrl, consumerKey, consumerSecret } = req.body;
      
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
      const { clientId, clientSecret, refreshToken, environment, merchantLocationKey } = req.body;
      
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
        
        const requiresPolicies = offerError.errors?.some((e: any) => 
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
    } catch (error: any) {
      console.error("AI provider test error:", error);
      res.status(500).json({ success: false, message: error.message || "Test failed" });
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
      
      const { previousResult, feedback, provider, apiKey, model } = req.body;
      
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

      const config: AIProviderConfig = {
        provider: provider || "gemini",
        apiKey,
        model,
      };

      const parsedPrevious: AnalysisResult = typeof previousResult === "string" 
        ? JSON.parse(previousResult) 
        : previousResult;

      const result = await analyzeItemWithRetry(config, images, parsedPrevious, feedback);
      res.json(result);
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

  const httpServer = createServer(app);
  return httpServer;
}
