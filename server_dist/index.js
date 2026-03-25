var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import "dotenv/config";
import express from "express";

// server/routes.ts
import { createServer } from "node:http";
import multer from "multer";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  aiGenerations: () => aiGenerations,
  articles: () => articles,
  conversations: () => conversations,
  insertAiGenerationSchema: () => insertAiGenerationSchema,
  insertArticleSchema: () => insertArticleSchema,
  insertConversationSchema: () => insertConversationSchema,
  insertIntegrationSchema: () => insertIntegrationSchema,
  insertListingSchema: () => insertListingSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertPriceTrackingSchema: () => insertPriceTrackingSchema,
  insertProductSchema: () => insertProductSchema,
  insertPushTokenSchema: () => insertPushTokenSchema,
  insertSellerSchema: () => insertSellerSchema,
  insertStashItemSchema: () => insertStashItemSchema,
  insertSyncQueueSchema: () => insertSyncQueueSchema,
  insertUserSchema: () => insertUserSchema,
  insertUserSettingsSchema: () => insertUserSettingsSchema,
  integrations: () => integrations,
  listingsTable: () => listingsTable,
  messages: () => messages,
  notifications: () => notifications,
  priceTracking: () => priceTracking,
  products: () => products,
  pushTokens: () => pushTokens,
  sellers: () => sellers,
  stashItems: () => stashItems,
  syncQueue: () => syncQueue,
  userSettings: () => userSettings,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean, jsonb, uuid, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  geminiApiKey: text("gemini_api_key"),
  huggingfaceApiKey: text("huggingface_api_key"),
  preferredGeminiModel: text("preferred_gemini_model").default("gemini-2.5-flash"),
  preferredHuggingfaceModel: text("preferred_huggingface_model"),
  woocommerceUrl: text("woocommerce_url"),
  woocommerceKey: text("woocommerce_key"),
  woocommerceSecret: text("woocommerce_secret"),
  ebayToken: text("ebay_token"),
  openfangApiKey: text("openfang_api_key"),
  openfangBaseUrl: text("openfang_base_url"),
  preferredOpenfangModel: text("preferred_openfang_model"),
  highValueThreshold: integer("high_value_threshold").default(500),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var stashItems = pgTable("stash_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  estimatedValue: text("estimated_value"),
  condition: text("condition"),
  tags: text("tags").array(),
  fullImageUrl: text("full_image_url"),
  labelImageUrl: text("label_image_url"),
  aiAnalysis: jsonb("ai_analysis"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoKeywords: text("seo_keywords").array(),
  publishStatus: text("publish_status").default("draft"),
  publishedToWoocommerce: boolean("published_to_woocommerce").default(false),
  publishedToEbay: boolean("published_to_ebay").default(false),
  woocommerceProductId: text("woocommerce_product_id"),
  ebayListingId: text("ebay_listing_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  readingTime: integer("reading_time").default(5),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertStashItemSchema = createInsertSchema(stashItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  createdAt: true
});
var insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true
});
var insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true
});
var sellers = pgTable("sellers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  shopName: text("shop_name").notNull(),
  shopDescription: text("shop_description"),
  avatarUrl: text("avatar_url"),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionTier: text("subscription_tier").default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  createdAt: timestamp("created_at").default(sql`NOW()`),
  updatedAt: timestamp("updated_at").default(sql`NOW()`)
});
var products = pgTable("products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: uuid("seller_id").notNull().references(() => sellers.id, { onDelete: "cascade" }),
  sku: text("sku").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  brand: text("brand"),
  styleName: text("style_name"),
  category: text("category"),
  condition: text("condition"),
  price: numeric("price", { precision: 10, scale: 2 }),
  cost: numeric("cost", { precision: 10, scale: 2 }),
  estimatedProfit: numeric("estimated_profit", { precision: 10, scale: 2 }),
  images: jsonb("images").default({}),
  attributes: jsonb("attributes").default({}),
  tags: text("tags").array().default(sql`ARRAY[]::TEXT[]`),
  listings: jsonb("listings").default({}),
  syncStatus: jsonb("sync_status").default({}),
  syncLastAt: timestamp("sync_last_at"),
  createdAt: timestamp("created_at").default(sql`NOW()`),
  updatedAt: timestamp("updated_at").default(sql`NOW()`)
}, (table) => [
  uniqueIndex("products_seller_sku_unique").on(table.sellerId, table.sku)
]);
var listingsTable = pgTable("listings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: uuid("seller_id").notNull().references(() => sellers.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(),
  marketplaceId: text("marketplace_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  seoTags: text("seo_tags").array().default(sql`ARRAY[]::TEXT[]`),
  categoryId: text("category_id"),
  sku: text("sku"),
  price: numeric("price", { precision: 10, scale: 2 }),
  quantity: integer("quantity").default(1),
  status: text("status").default("draft"),
  publishedAt: timestamp("published_at"),
  syncError: text("sync_error"),
  rawApiResponse: jsonb("raw_api_response"),
  createdAt: timestamp("created_at").default(sql`NOW()`),
  updatedAt: timestamp("updated_at").default(sql`NOW()`)
});
var aiGenerations = pgTable("ai_generations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: uuid("seller_id").notNull().references(() => sellers.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  inputImageUrl: text("input_image_url"),
  inputText: text("input_text"),
  modelUsed: text("model_used"),
  outputListing: jsonb("output_listing"),
  tokensUsed: integer("tokens_used"),
  cost: numeric("cost", { precision: 8, scale: 4 }),
  qualityScore: numeric("quality_score", { precision: 3, scale: 2 }),
  userFeedback: text("user_feedback"),
  createdAt: timestamp("created_at").default(sql`NOW()`)
});
var syncQueue = pgTable("sync_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: uuid("seller_id").notNull().references(() => sellers.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(),
  action: text("action").notNull(),
  payload: jsonb("payload"),
  status: text("status").default("pending"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  createdAt: timestamp("created_at").default(sql`NOW()`),
  scheduledAt: timestamp("scheduled_at").default(sql`NOW() + INTERVAL '5 seconds'`),
  completedAt: timestamp("completed_at")
});
var integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: uuid("seller_id").notNull().references(() => sellers.id, { onDelete: "cascade" }),
  service: text("service").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  credentials: jsonb("credentials").default({}),
  isActive: boolean("is_active").default(true),
  lastSyncedAt: timestamp("last_synced_at"),
  syncCount: integer("sync_count").default(0),
  createdAt: timestamp("created_at").default(sql`NOW()`),
  updatedAt: timestamp("updated_at").default(sql`NOW()`)
}, (table) => [
  uniqueIndex("integrations_seller_service_unique").on(table.sellerId, table.service)
]);
var insertSellerSchema = createInsertSchema(sellers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertListingSchema = createInsertSchema(listingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertAiGenerationSchema = createInsertSchema(aiGenerations).omit({
  id: true,
  createdAt: true
});
var insertSyncQueueSchema = createInsertSchema(syncQueue).omit({
  id: true,
  createdAt: true,
  completedAt: true
});
var insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var pushTokens = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: text("platform").notNull(),
  // 'ios', 'android', 'web'
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var priceTracking = pgTable("price_tracking", {
  id: serial("id").primaryKey(),
  stashItemId: integer("stash_item_id").notNull().references(() => stashItems.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true),
  lastPrice: integer("last_price"),
  lastCheckedAt: timestamp("last_checked_at"),
  nextCheckAt: timestamp("next_check_at"),
  alertThreshold: integer("alert_threshold"),
  // Percentage change to trigger alert
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stashItemId: integer("stash_item_id").references(() => stashItems.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  // 'price_drop', 'price_increase', 'market_update'
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data"),
  // Additional payload data
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var insertPushTokenSchema = createInsertSchema(pushTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertPriceTrackingSchema = createInsertSchema(priceTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  sentAt: true
});

// server/db.ts
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
var db = drizzle(pool, { schema: schema_exports });

// server/routes.ts
import { eq as eq2, desc, count, and as and2, ilike, or } from "drizzle-orm";
import { GoogleGenAI as GoogleGenAI2 } from "@google/genai";

// server/ai-providers.ts
import { GoogleGenAI } from "@google/genai";
var ANALYSIS_PROMPT = `You are an expert appraiser, authenticator, and reseller assistant with deep knowledge of vintage items, luxury goods, and collectibles. Analyze the provided images (full item + label/tag) and deliver a comprehensive professional appraisal report.

## AUTHENTICATION ASSESSMENT
Carefully examine for authenticity indicators:
- Brand markings, logos, serial numbers, date codes
- Hardware quality, stitching, materials, craftsmanship
- Common counterfeit red flags for this item type
- Overall consistency with authentic pieces

Provide:
- authenticity: One of ["Authentic", "Likely Authentic", "Uncertain", "Likely Counterfeit", "Counterfeit"]
- authenticityConfidence: Number 0-100 representing your confidence
- authenticityDetails: Detailed explanation of what indicators you observed
- authenticationTips: Array of 3-5 specific tips for authenticating this item type

## MARKET VALUATION ANALYSIS
Research comparable sales and market trends:
- estimatedValueLow: Numeric low end of value range (just the number, no $)
- estimatedValueHigh: Numeric high end of value range (just the number, no $)
- suggestedListPrice: Numeric recommended listing price (just the number, no $)
- confidence: One of ["high", "medium", "low"] for overall appraisal confidence
- marketAnalysis: Detailed paragraph on comparable sales, demand trends, seasonality, and pricing rationale

## ITEM IDENTIFICATION & LISTING DATA
- brand: Identified brand name (or "Unknown" if unbranded)
- title: Clear, descriptive item title (max 80 chars for eBay)
- subtitle: Short catchy subtitle (max 55 chars for eBay)
- category: General category (e.g., Handbag, Watch, Clothing, Electronics, Collectible)
- condition: One of ["New", "Like New", "Very Good", "Good", "Acceptable", "For Parts"]
- shortDescription: Concise 1-2 sentence description for WooCommerce
- fullDescription: Rich, detailed HTML description for eBay/WooCommerce listings
- description: Legacy medium-length description
- estimatedValue: Legacy string format (e.g., "$150-$200")

## SEO & CATEGORIZATION
- seoTitle: SEO-optimized title for online listings
- seoDescription: SEO-optimized meta description
- seoKeywords: Array of 5-10 relevant SEO keywords
- tags: Array of 3-5 relevant tags for categorization

## ITEM SPECIFICS / ASPECTS
Provide key-value pairs as an object. Examples:
- Brand: ["Louis Vuitton"]
- Material: ["Leather", "Canvas"]
- Color: ["Brown", "Monogram"]
- Size: ["Medium"]
- Style: ["Shoulder Bag"]
- Era: ["1980s"]
- ebayCategoryId: Suggested eBay category ID (use "1" for generic if unsure)
- wooCategory: Suggested WooCommerce category name

Respond ONLY with valid JSON. All fields must be present. Use empty strings/arrays/zeros for unknown values, never omit fields.`;
var FALLBACK_RESULT = {
  // Legacy fields
  title: "Vintage Item",
  description: "A vintage collectible item in good condition.",
  category: "Collectible",
  estimatedValue: "$50-$100",
  condition: "Good",
  seoTitle: "Vintage Collectible Item for Sale",
  seoDescription: "Authentic vintage collectible in excellent condition. Perfect for collectors.",
  seoKeywords: ["vintage", "collectible", "antique"],
  tags: ["vintage", "collectible"],
  // New enhanced fields
  brand: "Unknown",
  subtitle: "Vintage collectible item",
  shortDescription: "A vintage collectible item in good condition.",
  fullDescription: "<p>This is a vintage collectible item in good overall condition. Please review photos carefully as they form part of the description.</p>",
  estimatedValueLow: 50,
  estimatedValueHigh: 100,
  suggestedListPrice: 75,
  confidence: "low",
  authenticity: "Uncertain",
  authenticityConfidence: 50,
  authenticityDetails: "Unable to perform detailed authentication analysis. Please consult a professional authenticator for high-value items.",
  authenticationTips: ["Check for brand markings and serial numbers", "Examine hardware quality and materials", "Compare with official product images", "Consult professional authenticator for valuable items"],
  marketAnalysis: "Market analysis unavailable. Research comparable sold listings on eBay and other marketplaces to determine fair market value.",
  aspects: { Category: ["Collectible"], Condition: ["Good"] },
  ebayCategoryId: "1",
  wooCategory: "Collectibles"
};
function parseAnalysisResult(text2) {
  let parsed;
  try {
    parsed = JSON.parse(text2);
  } catch {
    try {
      const jsonMatch = text2.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return FALLBACK_RESULT;
      }
    } catch {
      return FALLBACK_RESULT;
    }
  }
  return {
    // Legacy fields with defaults
    title: parsed.title || FALLBACK_RESULT.title,
    description: parsed.description || FALLBACK_RESULT.description,
    category: parsed.category || FALLBACK_RESULT.category,
    estimatedValue: parsed.estimatedValue || FALLBACK_RESULT.estimatedValue,
    condition: parsed.condition || FALLBACK_RESULT.condition,
    seoTitle: parsed.seoTitle || FALLBACK_RESULT.seoTitle,
    seoDescription: parsed.seoDescription || FALLBACK_RESULT.seoDescription,
    seoKeywords: parsed.seoKeywords || FALLBACK_RESULT.seoKeywords,
    tags: parsed.tags || FALLBACK_RESULT.tags,
    // New enhanced fields with defaults
    brand: parsed.brand || FALLBACK_RESULT.brand,
    subtitle: parsed.subtitle || FALLBACK_RESULT.subtitle,
    shortDescription: parsed.shortDescription || FALLBACK_RESULT.shortDescription,
    fullDescription: parsed.fullDescription || FALLBACK_RESULT.fullDescription,
    estimatedValueLow: typeof parsed.estimatedValueLow === "number" ? parsed.estimatedValueLow : FALLBACK_RESULT.estimatedValueLow,
    estimatedValueHigh: typeof parsed.estimatedValueHigh === "number" ? parsed.estimatedValueHigh : FALLBACK_RESULT.estimatedValueHigh,
    suggestedListPrice: typeof parsed.suggestedListPrice === "number" ? parsed.suggestedListPrice : FALLBACK_RESULT.suggestedListPrice,
    confidence: parsed.confidence || FALLBACK_RESULT.confidence,
    authenticity: parsed.authenticity || FALLBACK_RESULT.authenticity,
    authenticityConfidence: typeof parsed.authenticityConfidence === "number" ? parsed.authenticityConfidence : FALLBACK_RESULT.authenticityConfidence,
    authenticityDetails: parsed.authenticityDetails || FALLBACK_RESULT.authenticityDetails,
    authenticationTips: parsed.authenticationTips || FALLBACK_RESULT.authenticationTips,
    marketAnalysis: parsed.marketAnalysis || FALLBACK_RESULT.marketAnalysis,
    aspects: parsed.aspects || FALLBACK_RESULT.aspects,
    ebayCategoryId: parsed.ebayCategoryId || FALLBACK_RESULT.ebayCategoryId,
    wooCategory: parsed.wooCategory || FALLBACK_RESULT.wooCategory
  };
}
function validateCustomEndpoint(endpoint) {
  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error("Invalid endpoint URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Endpoint must use http or https");
  }
  const hostname = parsed.hostname.toLowerCase();
  const blockedPatterns = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "169.254.",
    "10.",
    "172.16.",
    "172.17.",
    "172.18.",
    "172.19.",
    "172.20.",
    "172.21.",
    "172.22.",
    "172.23.",
    "172.24.",
    "172.25.",
    "172.26.",
    "172.27.",
    "172.28.",
    "172.29.",
    "172.30.",
    "172.31.",
    "192.168.",
    "metadata.google",
    ".internal"
  ];
  for (const pattern of blockedPatterns) {
    if (hostname === pattern || hostname.startsWith(pattern) || hostname.endsWith(pattern)) {
      throw new Error("Custom endpoint cannot target private or internal network addresses");
    }
  }
}
async function analyzeWithGemini(images, config) {
  const ai2 = new GoogleGenAI({
    apiKey: config.apiKey || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
    httpOptions: {
      apiVersion: config.apiKey ? "v1beta" : "",
      baseUrl: config.apiKey ? void 0 : process.env.AI_INTEGRATIONS_GEMINI_BASE_URL
    }
  });
  const parts = [{ text: ANALYSIS_PROMPT }];
  for (const img of images) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  }
  const response = await ai2.models.generateContent({
    model: config.model || "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
    config: { responseMimeType: "application/json" }
  });
  return parseAnalysisResult(response.text || "");
}
async function analyzeWithOpenAI(images, config) {
  if (!config.apiKey) {
    throw new Error("OpenAI API key is required");
  }
  const content = [{ type: "text", text: ANALYSIS_PROMPT }];
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.data}` }
    });
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model || "gpt-4o",
      messages: [{ role: "user", content }],
      response_format: { type: "json_object" }
    })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }
  const data = await response.json();
  const text2 = data.choices?.[0]?.message?.content || "";
  return parseAnalysisResult(text2);
}
async function analyzeWithAnthropic(images, config) {
  if (!config.apiKey) {
    throw new Error("Anthropic API key is required");
  }
  const content = [];
  for (const img of images) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mimeType,
        data: img.data
      }
    });
  }
  content.push({ type: "text", text: ANALYSIS_PROMPT });
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model || "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content }]
    })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }
  const data = await response.json();
  const text2 = data.content?.[0]?.text || "";
  return parseAnalysisResult(text2);
}
async function analyzeWithOpenFang(images, config) {
  const baseUrl = (config.endpoint || process.env.OPENFANG_BASE_URL || "").replace(/\/+$/, "");
  const apiKey = config.apiKey || process.env.OPENFANG_API_KEY || "";
  if (!baseUrl) {
    throw new Error("OpenFang base URL is required. Set OPENFANG_BASE_URL or configure in settings.");
  }
  if (!apiKey) {
    throw new Error("OpenFang API key is required. Set OPENFANG_API_KEY or configure in settings.");
  }
  const content = [{ type: "text", text: ANALYSIS_PROMPT }];
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.data}` }
    });
  }
  const url = baseUrl.includes("/v1/chat/completions") ? baseUrl : `${baseUrl}/v1/chat/completions`;
  const body = {
    model: config.model || "auto",
    messages: [{ role: "user", content }],
    response_format: { type: "json_object" },
    extra_body: {
      routing: {
        prefer: ["vision"],
        fallback: ["gpt-4o", "gemini-2.5-flash", "claude-sonnet-4-20250514"]
      }
    }
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenFang API error: ${response.status}`);
  }
  const data = await response.json();
  const text2 = data.choices?.[0]?.message?.content || "";
  return parseAnalysisResult(text2);
}
async function analyzeWithCustom(images, config) {
  if (!config.endpoint) {
    throw new Error("Custom AI endpoint URL is required");
  }
  validateCustomEndpoint(config.endpoint);
  const content = [{ type: "text", text: ANALYSIS_PROMPT }];
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.data}` }
    });
  }
  const headers = { "Content-Type": "application/json" };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }
  const baseUrl = config.endpoint.replace(/\/+$/, "");
  const url = baseUrl.includes("/v1/chat/completions") ? baseUrl : `${baseUrl}/v1/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model || "default",
      messages: [{ role: "user", content }]
    })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Custom AI error: ${response.status}`);
  }
  const data = await response.json();
  const text2 = data.choices?.[0]?.message?.content || "";
  return parseAnalysisResult(text2);
}
async function analyzeItem(config, images) {
  switch (config.provider) {
    case "gemini":
      return analyzeWithGemini(images, config);
    case "openai":
      return analyzeWithOpenAI(images, config);
    case "anthropic":
      return analyzeWithAnthropic(images, config);
    case "custom":
      return analyzeWithCustom(images, config);
    case "openfang":
      return analyzeWithOpenFang(images, config);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}
var RETRY_PROMPT_TEMPLATE = `You are an expert appraiser re-evaluating an item based on seller feedback. Review the previous appraisal and the seller's concerns, then provide an updated assessment.

## PREVIOUS APPRAISAL
{previousReport}

## SELLER FEEDBACK
"{feedback}"

## YOUR TASK
Re-analyze the item considering the seller's feedback. The seller may be pointing out:
- Additional details visible in the images you missed
- Brand/model information they recognize
- Condition issues or positive attributes
- Authenticity concerns or reassurances
- Market context you should consider

Provide a complete updated appraisal following the same format as before. Be objective and incorporate valid feedback while maintaining professional judgment.

Respond ONLY with valid JSON containing all required fields.`;
async function analyzeItemWithRetry(config, images, previousResult, feedback) {
  const retryPrompt = RETRY_PROMPT_TEMPLATE.replace("{previousReport}", JSON.stringify(previousResult, null, 2)).replace("{feedback}", feedback);
  const retryConfig = { ...config, retryPrompt };
  switch (config.provider) {
    case "gemini":
      return analyzeWithGeminiRetry(images, retryConfig, retryPrompt);
    case "openai":
      return analyzeWithOpenAIRetry(images, retryConfig, retryPrompt);
    case "anthropic":
      return analyzeWithAnthropicRetry(images, retryConfig, retryPrompt);
    case "custom":
      return analyzeWithCustomRetry(images, retryConfig, retryPrompt);
    case "openfang":
      return analyzeWithOpenFangRetry(images, retryConfig, retryPrompt);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}
async function analyzeWithGeminiRetry(images, config, retryPrompt) {
  const ai2 = new GoogleGenAI({
    apiKey: config.apiKey || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
    httpOptions: {
      apiVersion: config.apiKey ? "v1beta" : "",
      baseUrl: config.apiKey ? void 0 : process.env.AI_INTEGRATIONS_GEMINI_BASE_URL
    }
  });
  const parts = [{ text: retryPrompt }];
  for (const img of images) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  }
  const response = await ai2.models.generateContent({
    model: config.model || "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
    config: { responseMimeType: "application/json" }
  });
  return parseAnalysisResult(response.text || "");
}
async function analyzeWithOpenAIRetry(images, config, retryPrompt) {
  if (!config.apiKey) {
    throw new Error("OpenAI API key is required");
  }
  const content = [{ type: "text", text: retryPrompt }];
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.data}` }
    });
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model || "gpt-4o",
      messages: [{ role: "user", content }],
      response_format: { type: "json_object" }
    })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }
  const data = await response.json();
  const text2 = data.choices?.[0]?.message?.content || "";
  return parseAnalysisResult(text2);
}
async function analyzeWithAnthropicRetry(images, config, retryPrompt) {
  if (!config.apiKey) {
    throw new Error("Anthropic API key is required");
  }
  const content = [];
  for (const img of images) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mimeType,
        data: img.data
      }
    });
  }
  content.push({ type: "text", text: retryPrompt });
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model || "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content }]
    })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }
  const data = await response.json();
  const text2 = data.content?.[0]?.text || "";
  return parseAnalysisResult(text2);
}
async function analyzeWithOpenFangRetry(images, config, retryPrompt) {
  const baseUrl = (config.endpoint || process.env.OPENFANG_BASE_URL || "").replace(/\/+$/, "");
  const apiKey = config.apiKey || process.env.OPENFANG_API_KEY || "";
  if (!baseUrl) {
    throw new Error("OpenFang base URL is required. Set OPENFANG_BASE_URL or configure in settings.");
  }
  if (!apiKey) {
    throw new Error("OpenFang API key is required. Set OPENFANG_API_KEY or configure in settings.");
  }
  const content = [{ type: "text", text: retryPrompt }];
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.data}` }
    });
  }
  const url = baseUrl.includes("/v1/chat/completions") ? baseUrl : `${baseUrl}/v1/chat/completions`;
  const body = {
    model: config.model || "auto",
    messages: [{ role: "user", content }],
    response_format: { type: "json_object" },
    extra_body: {
      routing: {
        prefer: ["vision"],
        fallback: ["gpt-4o", "gemini-2.5-flash", "claude-sonnet-4-20250514"]
      }
    }
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenFang API error: ${response.status}`);
  }
  const data = await response.json();
  const text2 = data.choices?.[0]?.message?.content || "";
  return parseAnalysisResult(text2);
}
async function analyzeWithCustomRetry(images, config, retryPrompt) {
  if (!config.endpoint) {
    throw new Error("Custom AI endpoint URL is required");
  }
  validateCustomEndpoint(config.endpoint);
  const content = [{ type: "text", text: retryPrompt }];
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.data}` }
    });
  }
  const headers = { "Content-Type": "application/json" };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }
  const baseUrl = config.endpoint.replace(/\/+$/, "");
  const url = baseUrl.includes("/v1/chat/completions") ? baseUrl : `${baseUrl}/v1/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model || "default",
      messages: [{ role: "user", content }]
    })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Custom AI error: ${response.status}`);
  }
  const data = await response.json();
  const text2 = data.choices?.[0]?.message?.content || "";
  return parseAnalysisResult(text2);
}
async function testProviderConnection(config) {
  try {
    switch (config.provider) {
      case "gemini": {
        const ai2 = new GoogleGenAI({
          apiKey: config.apiKey || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
          httpOptions: {
            apiVersion: config.apiKey ? "v1beta" : "",
            baseUrl: config.apiKey ? void 0 : process.env.AI_INTEGRATIONS_GEMINI_BASE_URL
          }
        });
        const response = await ai2.models.generateContent({
          model: config.model || "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: "Reply with: OK" }] }]
        });
        if (response.text) {
          return { success: true, message: "Gemini connection successful" };
        }
        return { success: false, message: "No response from Gemini" };
      }
      case "openai": {
        if (!config.apiKey) return { success: false, message: "OpenAI API key is required" };
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: config.model || "gpt-4o",
            messages: [{ role: "user", content: "Reply with: OK" }],
            max_tokens: 5
          })
        });
        if (response.ok) return { success: true, message: "OpenAI connection successful" };
        const error = await response.json().catch(() => ({}));
        return { success: false, message: error.error?.message || `OpenAI error: ${response.status}` };
      }
      case "anthropic": {
        if (!config.apiKey) return { success: false, message: "Anthropic API key is required" };
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": config.apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: config.model || "claude-sonnet-4-20250514",
            max_tokens: 10,
            messages: [{ role: "user", content: "Reply with: OK" }]
          })
        });
        if (response.ok) return { success: true, message: "Anthropic connection successful" };
        const error = await response.json().catch(() => ({}));
        return { success: false, message: error.error?.message || `Anthropic error: ${response.status}` };
      }
      case "custom": {
        if (!config.endpoint) return { success: false, message: "Custom endpoint URL is required" };
        validateCustomEndpoint(config.endpoint);
        const headers = { "Content-Type": "application/json" };
        if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;
        const baseUrl = config.endpoint.replace(/\/+$/, "");
        const url = baseUrl.includes("/v1/chat/completions") ? baseUrl : `${baseUrl}/v1/chat/completions`;
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: config.model || "default",
            messages: [{ role: "user", content: "Reply with: OK" }],
            max_tokens: 5
          })
        });
        if (response.ok) return { success: true, message: "Custom endpoint connection successful" };
        const error = await response.json().catch(() => ({}));
        return { success: false, message: error.error?.message || `Connection failed: ${response.status}` };
      }
      case "openfang": {
        const ofBaseUrl = (config.endpoint || process.env.OPENFANG_BASE_URL || "").replace(/\/+$/, "");
        const ofApiKey = config.apiKey || process.env.OPENFANG_API_KEY || "";
        if (!ofBaseUrl) return { success: false, message: "OpenFang base URL is required" };
        if (!ofApiKey) return { success: false, message: "OpenFang API key is required" };
        const ofUrl = ofBaseUrl.includes("/v1/chat/completions") ? ofBaseUrl : `${ofBaseUrl}/v1/chat/completions`;
        const response = await fetch(ofUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ofApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: config.model || "auto",
            messages: [{ role: "user", content: "Reply with: OK" }],
            max_tokens: 5
          })
        });
        if (response.ok) return { success: true, message: "OpenFang connection successful" };
        const error = await response.json().catch(() => ({}));
        return { success: false, message: error.error?.message || `OpenFang error: ${response.status}` };
      }
      default:
        return { success: false, message: `Unsupported provider: ${config.provider}` };
    }
  } catch (error) {
    return { success: false, message: error.message || "Connection test failed" };
  }
}

// server/ai-seo.ts
function generateSEOTitle(analysis) {
  const parts = [
    analysis.brand,
    analysis.style_name || analysis.category,
    analysis.color ? `${analysis.color}` : "",
    analysis.size ? `Size ${analysis.size}` : ""
  ].filter(Boolean).join(" ");
  return parts.substring(0, 80);
}
function generateDescription(analysis) {
  return `
**Condition:** ${analysis.condition}
**Brand:** ${analysis.brand || "Curated Collection"}
**Category:** ${analysis.category}
**Material:** ${analysis.material || "Premium"}
**Color:** ${analysis.color || "See Images"}
**Dimensions:** ${analysis.size || "See Details"}

**Distinguishing Features:**
${(analysis.features || []).map((f) => `\u2022 ${f}`).join("\n")}

**Market Value:** $${analysis.estimated_resale_value || "Inquire for Offer"}

${analysis.authenticity_notes ? `
**Authentication Notes:** ${analysis.authenticity_notes}` : ""}

*Each piece in our collection is carefully curated and authenticated. We stand behind every item.*
  `.trim();
}
function generateTags(analysis) {
  return [
    analysis.brand || "",
    analysis.category || "",
    analysis.color || "",
    analysis.style_name || "",
    analysis.condition ? `${analysis.condition.toLowerCase()}-condition` : "",
    analysis.material || "",
    "luxury",
    "curated",
    ...analysis.features || []
  ].filter(Boolean);
}
async function createAIRecord({
  sellerId,
  productId,
  imageUrl,
  analysis
}) {
  const [record] = await db.insert(aiGenerations).values({
    sellerId,
    productId: productId ?? null,
    inputImageUrl: imageUrl,
    modelUsed: "gemini-1.5-pro",
    outputListing: {
      title: generateSEOTitle(analysis),
      description: generateDescription(analysis),
      tags: generateTags(analysis),
      analysis
    },
    tokensUsed: Math.ceil(JSON.stringify(analysis).length / 4),
    cost: "0.003",
    // rough estimate as string for numeric column
    qualityScore: analysis.brand ? "0.90" : "0.70"
  }).returning();
  return record.id;
}

// server/supabase-storage.ts
import { createClient } from "@supabase/supabase-js";
var BUCKET_NAME = "product-images";
var MAX_FILE_SIZE = 20 * 1024 * 1024;
var supabaseClient = null;
function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
    if (!url || !key) {
      throw new Error("Missing Supabase credentials for storage");
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}
async function uploadProductImage(buffer, originalName, mimeType, sellerId) {
  if (!mimeType.startsWith("image/")) {
    throw new Error("File must be an image");
  }
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("Image must be less than 20 MB");
  }
  const supabase = getSupabase();
  const timestamp2 = Date.now();
  const random = Math.random().toString(36).substring(7);
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${sellerId}/${timestamp2}-${random}-${safeName}`;
  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, buffer, { contentType: mimeType });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const {
    data: { publicUrl }
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);
  const base64 = buffer.toString("base64");
  return { path: data.path, publicUrl, base64 };
}
async function deleteProductImage(path2) {
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path2]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

// server/ebay-service.ts
function getBaseUrl(environment) {
  return environment === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";
}
function getWebUrl(environment) {
  return environment === "production" ? "https://www.ebay.com" : "https://sandbox.ebay.com";
}
async function getAccessToken(creds) {
  const baseUrl = getBaseUrl(creds.environment);
  const credentials = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
  const response = await fetch(`${baseUrl}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(creds.refreshToken)}`
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || "Failed to authenticate with eBay");
  }
  const data = await response.json();
  return data.access_token;
}
var EBAY_CATEGORY_MAP = {
  "Handbag": "169291",
  "Watch": "31387",
  "Clothing": "11450",
  "Shoes": "93427",
  "Jewelry": "281",
  "Electronics": "293",
  "Collectible": "1",
  "Art": "550",
  "Antique": "20081",
  "Vintage": "156955",
  "Toy": "220",
  "Book": "267",
  "Sports": "888",
  "Music": "11233",
  "Coin": "11116",
  "Stamp": "260",
  "Pottery": "870",
  "Glass": "870",
  "Furniture": "3197",
  "Rug": "20571"
};
function mapCategoryToEbay(appCategory) {
  if (!appCategory) return "1";
  const normalized = appCategory.trim();
  if (EBAY_CATEGORY_MAP[normalized]) {
    return EBAY_CATEGORY_MAP[normalized];
  }
  const lowerCategory = normalized.toLowerCase();
  for (const [key, value] of Object.entries(EBAY_CATEGORY_MAP)) {
    if (lowerCategory.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCategory)) {
      return value;
    }
  }
  return "1";
}
async function refreshEbayAccessToken(creds) {
  const baseUrl = getBaseUrl(creds.environment);
  const credentials = Buffer.from(
    `${creds.clientId}:${creds.clientSecret}`
  ).toString("base64");
  const response = await fetch(`${baseUrl}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(creds.refreshToken)}`
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error_description || `eBay token refresh failed: ${response.statusText}`
    );
  }
  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1e3
  };
}
async function updateEbayListing(creds, itemId, input) {
  try {
    const accessToken = await getAccessToken(creds);
    const baseUrl = getBaseUrl(creds.environment);
    const webUrl = getWebUrl(creds.environment);
    const response = await fetch(
      `${baseUrl}/sell/inventory/v1/inventory_item/${encodeURIComponent(itemId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US"
        },
        body: JSON.stringify(input)
      }
    );
    if (!response.ok && response.status !== 204) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.errors?.[0]?.message || `eBay API error: ${response.statusText}`
      );
    }
    return {
      itemId,
      status: "success",
      message: "Listing updated successfully",
      url: `${webUrl}/itm/${itemId}`
    };
  } catch (error) {
    return {
      itemId,
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function deleteEbayListing(creds, itemId) {
  try {
    const accessToken = await getAccessToken(creds);
    const baseUrl = getBaseUrl(creds.environment);
    const response = await fetch(
      `${baseUrl}/sell/inventory/v1/inventory_item/${encodeURIComponent(itemId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    if (!response.ok && response.status !== 204) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.errors?.[0]?.message || `eBay API error: ${response.statusText}`
      );
    }
    return {
      itemId,
      status: "success",
      message: "Listing deleted successfully"
    };
  } catch (error) {
    return {
      itemId,
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// server/services/notification.ts
import { eq, and, lte, isNotNull } from "drizzle-orm";
var EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
async function registerPushToken(userId, token, platform) {
  const existing = await db.select().from(pushTokens).where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token))).limit(1);
  if (existing.length > 0) {
    await db.update(pushTokens).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq(pushTokens.id, existing[0].id));
    return;
  }
  await db.insert(pushTokens).values({
    userId,
    token,
    platform
  });
}
async function unregisterPushToken(userId, token) {
  await db.delete(pushTokens).where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
}
async function sendPushNotification(userId, title, body, data) {
  const tokens = await db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
  if (tokens.length === 0) {
    console.log(`No push tokens found for user ${userId}`);
    return false;
  }
  const messages2 = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data,
    sound: "default",
    priority: "high"
  }));
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messages2)
    });
    if (!response.ok) {
      const error = await response.text();
      console.error("Push notification failed:", error);
      return false;
    }
    const result = await response.json();
    await db.insert(notifications).values({
      userId,
      type: data?.type || "general",
      title,
      body,
      data: data || {}
    });
    return true;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return false;
  }
}
async function sendPriceAlert(userId, stashItemId, itemTitle, oldPrice, newPrice, percentChange) {
  const isIncrease = newPrice > oldPrice;
  const title = isIncrease ? `\u{1F4C8} Price Increase: ${itemTitle}` : `\u{1F4C9} Price Drop: ${itemTitle}`;
  const body = isIncrease ? `The market value increased by ${percentChange.toFixed(1)}% to $${newPrice}` : `The market value dropped by ${Math.abs(percentChange).toFixed(1)}% to $${newPrice}`;
  return sendPushNotification(userId, title, body, {
    type: isIncrease ? "price_increase" : "price_drop",
    stashItemId,
    oldPrice,
    newPrice,
    percentChange
  });
}
async function enablePriceTracking(userId, stashItemId, alertThreshold = 10) {
  const existing = await db.select().from(priceTracking).where(
    and(
      eq(priceTracking.userId, userId),
      eq(priceTracking.stashItemId, stashItemId)
    )
  ).limit(1);
  if (existing.length > 0) {
    await db.update(priceTracking).set({
      isActive: true,
      alertThreshold,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(priceTracking.id, existing[0].id));
    return;
  }
  const item = await db.select().from(stashItems).where(eq(stashItems.id, stashItemId)).limit(1);
  let lastPrice = null;
  if (item.length > 0 && item[0].aiAnalysis) {
    const analysis = item[0].aiAnalysis;
    lastPrice = analysis.suggestedListPrice || analysis.estimatedValueHigh || analysis.estimatedValueLow || null;
  }
  await db.insert(priceTracking).values({
    userId,
    stashItemId,
    isActive: true,
    alertThreshold,
    lastPrice,
    lastCheckedAt: /* @__PURE__ */ new Date(),
    nextCheckAt: new Date(Date.now() + 24 * 60 * 60 * 1e3)
    // Check in 24 hours
  });
}
async function disablePriceTracking(userId, stashItemId) {
  await db.update(priceTracking).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(
    and(
      eq(priceTracking.userId, userId),
      eq(priceTracking.stashItemId, stashItemId)
    )
  );
}
async function getPriceTrackingStatus(userId, stashItemId) {
  const tracking = await db.select().from(priceTracking).where(
    and(
      eq(priceTracking.userId, userId),
      eq(priceTracking.stashItemId, stashItemId)
    )
  ).limit(1);
  if (tracking.length === 0) {
    return null;
  }
  return {
    isActive: tracking[0].isActive ?? true,
    alertThreshold: tracking[0].alertThreshold || 10
  };
}
async function getUserNotifications(userId, limit = 50) {
  return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(notifications.sentAt).limit(limit);
}
async function markNotificationAsRead(userId, notificationId) {
  await db.update(notifications).set({ isRead: true }).where(
    and(
      eq(notifications.id, notificationId),
      eq(notifications.userId, userId)
    )
  );
}
async function markAllNotificationsAsRead(userId) {
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}
async function getUnreadNotificationCount(userId) {
  const result = await db.select().from(notifications).where(
    and(eq(notifications.userId, userId), eq(notifications.isRead, false))
  );
  return result.length;
}
async function processPriceChecks() {
  const now = /* @__PURE__ */ new Date();
  const trackingList = await db.select({
    tracking: priceTracking,
    item: stashItems
  }).from(priceTracking).innerJoin(stashItems, eq(priceTracking.stashItemId, stashItems.id)).where(
    and(
      eq(priceTracking.isActive, true),
      isNotNull(priceTracking.nextCheckAt),
      lte(priceTracking.nextCheckAt, now)
    )
  );
  for (const { tracking, item } of trackingList) {
    try {
      const analysis = item.aiAnalysis;
      const currentPrice = analysis?.suggestedListPrice || analysis?.estimatedValueHigh || analysis?.estimatedValueLow;
      if (!currentPrice || !tracking.lastPrice) {
        await db.update(priceTracking).set({
          lastCheckedAt: now,
          nextCheckAt: new Date(now.getTime() + 24 * 60 * 60 * 1e3),
          updatedAt: now
        }).where(eq(priceTracking.id, tracking.id));
        continue;
      }
      const priceDiff = currentPrice - tracking.lastPrice;
      const percentChange = priceDiff / tracking.lastPrice * 100;
      const threshold = tracking.alertThreshold || 10;
      if (Math.abs(percentChange) >= threshold) {
        await sendPriceAlert(
          tracking.userId,
          tracking.stashItemId,
          item.title,
          tracking.lastPrice,
          currentPrice,
          percentChange
        );
      }
      await db.update(priceTracking).set({
        lastPrice: currentPrice,
        lastCheckedAt: now,
        nextCheckAt: new Date(now.getTime() + 24 * 60 * 60 * 1e3),
        updatedAt: now
      }).where(eq(priceTracking.id, tracking.id));
    } catch (error) {
      console.error(
        `Error processing price check for item ${tracking.stashItemId}:
        error`
      );
    }
  }
}

// server/routes.ts
var ai = new GoogleGenAI2({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL
  }
});
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});
async function registerRoutes(app2) {
  app2.post("/api/push-token", async (req, res) => {
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
  app2.delete("/api/push-token", async (req, res) => {
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
  app2.get("/api/notifications", async (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const notifications2 = await getUserNotifications(userId);
      res.json(notifications2);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });
  app2.get("/api/notifications/unread-count", async (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const count2 = await getUnreadNotificationCount(userId);
      res.json({ count: count2 });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });
  app2.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const userId = req.query.userId;
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
  app2.post("/api/notifications/read-all", async (req, res) => {
    try {
      const userId = req.query.userId;
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
  app2.post("/api/stash/:id/price-tracking", async (req, res) => {
    try {
      const userId = req.query.userId || "anonymous";
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
  app2.delete("/api/stash/:id/price-tracking", async (req, res) => {
    try {
      const userId = req.query.userId || "anonymous";
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
  app2.get("/api/stash/:id/price-tracking", async (req, res) => {
    try {
      const userId = req.query.userId || "anonymous";
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
  app2.get("/api/articles", async (_req, res) => {
    try {
      const allArticles = await db.select().from(articles).orderBy(desc(articles.createdAt));
      res.json(allArticles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });
  app2.get("/api/articles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [article] = await db.select().from(articles).where(eq2(articles.id, id));
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });
  app2.get("/api/stash", async (req, res) => {
    try {
      const allItems = await db.select().from(stashItems).orderBy(desc(stashItems.createdAt));
      res.json(allItems);
    } catch (error) {
      console.error("Error fetching stash items:", error);
      res.status(500).json({ error: "Failed to fetch stash items" });
    }
  });
  app2.get("/api/stash/count", async (_req, res) => {
    try {
      const [result] = await db.select({ count: count() }).from(stashItems);
      res.json({ count: result?.count || 0 });
    } catch (error) {
      console.error("Error fetching stash count:", error);
      res.status(500).json({ error: "Failed to fetch stash count" });
    }
  });
  app2.get("/api/stash/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [item] = await db.select().from(stashItems).where(eq2(stashItems.id, id));
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching stash item:", error);
      res.status(500).json({ error: "Failed to fetch stash item" });
    }
  });
  app2.post("/api/stash", async (req, res) => {
    try {
      const itemData = req.body;
      const [newItem] = await db.insert(stashItems).values({
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
        seoKeywords: itemData.seoKeywords
      }).returning();
      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error creating stash item:", error);
      res.status(500).json({ error: "Failed to create stash item" });
    }
  });
  app2.delete("/api/stash/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(stashItems).where(eq2(stashItems.id, id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting stash item:", error);
      res.status(500).json({ error: "Failed to delete stash item" });
    }
  });
  app2.post("/api/analyze", upload.fields([
    { name: "fullImage", maxCount: 1 },
    { name: "labelImage", maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files;
      const fullImageFile = files?.fullImage?.[0];
      const labelImageFile = files?.labelImage?.[0];
      const { provider, apiKey, endpoint, model } = req.body;
      const images = [];
      if (fullImageFile) {
        images.push({ mimeType: fullImageFile.mimetype, data: fullImageFile.buffer.toString("base64") });
      }
      if (labelImageFile) {
        images.push({ mimeType: labelImageFile.mimetype, data: labelImageFile.buffer.toString("base64") });
      }
      if (images.length === 0) {
        return res.status(400).json({ error: "At least one image is required" });
      }
      const requestedProvider = typeof provider === "string" && provider.trim() ? provider.trim() : void 0;
      const primaryConfig = {
        provider: requestedProvider || "openfang",
        apiKey,
        endpoint,
        model
      };
      try {
        const result = await analyzeItem(primaryConfig, images);
        return res.json(result);
      } catch (primaryError) {
        const canFallbackToGemini = !requestedProvider || requestedProvider === "openfang";
        if (!canFallbackToGemini) {
          throw primaryError;
        }
        const fallbackConfig = {
          provider: "gemini",
          model: "gemini-2.5-flash"
        };
        const fallbackResult = await analyzeItem(fallbackConfig, images);
        return res.json(fallbackResult);
      }
    } catch (error) {
      console.error("Error analyzing item:", error);
      res.status(500).json({ error: "Failed to analyze item" });
    }
  });
  app2.get("/api/settings/threshold", async (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) {
        return res.json({ threshold: 500 });
      }
      const [settings] = await db.select().from(userSettings).where(eq2(userSettings.userId, userId));
      res.json({ threshold: settings?.highValueThreshold ?? 500 });
    } catch (error) {
      console.error("Error fetching threshold:", error);
      res.json({ threshold: 500 });
    }
  });
  app2.put("/api/settings/threshold", async (req, res) => {
    try {
      const { userId, threshold } = req.body;
      if (!userId || threshold === void 0) {
        return res.status(400).json({ error: "userId and threshold are required" });
      }
      const [existing] = await db.select().from(userSettings).where(eq2(userSettings.userId, userId));
      if (existing) {
        await db.update(userSettings).set({ highValueThreshold: threshold, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(userSettings.userId, userId));
      } else {
        await db.insert(userSettings).values({ userId, highValueThreshold: threshold });
      }
      res.json({ success: true, threshold });
    } catch (error) {
      console.error("Error updating threshold:", error);
      res.status(500).json({ error: "Failed to update threshold" });
    }
  });
  app2.post("/api/stash/:id/hold-for-review", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [item] = await db.select().from(stashItems).where(eq2(stashItems.id, id));
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      await db.update(stashItems).set({ publishStatus: "held_for_review", updatedAt: /* @__PURE__ */ new Date() }).where(eq2(stashItems.id, id));
      res.json({ success: true, publishStatus: "held_for_review" });
    } catch (error) {
      console.error("Error holding item for review:", error);
      res.status(500).json({ error: "Failed to hold item for review" });
    }
  });
  app2.post("/api/stash/:id/approve-publish", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [item] = await db.select().from(stashItems).where(eq2(stashItems.id, id));
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      await db.update(stashItems).set({ publishStatus: "approved", updatedAt: /* @__PURE__ */ new Date() }).where(eq2(stashItems.id, id));
      res.json({ success: true, publishStatus: "approved" });
    } catch (error) {
      console.error("Error approving item:", error);
      res.status(500).json({ error: "Failed to approve item" });
    }
  });
  app2.post("/api/stash/:id/publish/woocommerce", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { storeUrl, consumerKey, consumerSecret, skipThresholdCheck } = req.body;
      if (!storeUrl || !consumerKey || !consumerSecret) {
        return res.status(400).json({ error: "Missing WooCommerce credentials" });
      }
      const [item] = await db.select().from(stashItems).where(eq2(stashItems.id, id));
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      if (item.publishedToWoocommerce) {
        return res.status(400).json({ error: "Item already published to WooCommerce" });
      }
      if (!skipThresholdCheck) {
        const aiAnalysis = item.aiAnalysis;
        const suggestedPrice = aiAnalysis?.suggestedListPrice;
        if (suggestedPrice) {
          const userId = req.body.userId || item.userId;
          const [settings] = await db.select().from(userSettings).where(eq2(userSettings.userId, userId));
          const threshold = settings?.highValueThreshold ?? 500;
          if (suggestedPrice > threshold && item.publishStatus !== "approved") {
            await db.update(stashItems).set({ publishStatus: "held_for_review", updatedAt: /* @__PURE__ */ new Date() }).where(eq2(stashItems.id, id));
            return res.status(202).json({
              held: true,
              reason: "high_value",
              suggestedPrice,
              threshold,
              message: `This item's suggested price ($${suggestedPrice}) exceeds your approval threshold ($${threshold}). Please review and confirm before publishing.`
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
        status: "publish"
      };
      const wooResponse = await fetch(`${storeUrl}/wp-json/wc/v3/products`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(productData)
      });
      if (!wooResponse.ok) {
        const errorData = await wooResponse.json().catch(() => ({}));
        return res.status(wooResponse.status).json({
          error: errorData.message || `WooCommerce error: ${wooResponse.status}`
        });
      }
      const product = await wooResponse.json();
      await db.update(stashItems).set({
        publishedToWoocommerce: true,
        woocommerceProductId: String(product.id),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(stashItems.id, id));
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
  app2.post("/api/stash/:id/publish/ebay", async (req, res) => {
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
      const [item] = await db.select().from(stashItems).where(eq2(stashItems.id, id));
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      if (item.publishedToEbay) {
        return res.status(400).json({ error: "Item already published to eBay" });
      }
      if (!skipThresholdCheck) {
        const aiAnalysis = item.aiAnalysis;
        const suggestedPrice = aiAnalysis?.suggestedListPrice;
        if (suggestedPrice) {
          const userId = req.body.userId || item.userId;
          const [settings] = await db.select().from(userSettings).where(eq2(userSettings.userId, userId));
          const threshold = settings?.highValueThreshold ?? 500;
          if (suggestedPrice > threshold && item.publishStatus !== "approved") {
            await db.update(stashItems).set({ publishStatus: "held_for_review", updatedAt: /* @__PURE__ */ new Date() }).where(eq2(stashItems.id, id));
            return res.status(202).json({
              held: true,
              reason: "high_value",
              suggestedPrice,
              threshold,
              message: `This item's suggested price ($${suggestedPrice}) exceeds your approval threshold ($${threshold}). Please review and confirm before publishing.`
            });
          }
        }
      }
      const baseUrl = environment === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const tokenResponse = await fetch(`${baseUrl}/identity/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`
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
      const conditionMap = {
        "Mint": "NEW",
        "Excellent": "LIKE_NEW",
        "Very Good": "VERY_GOOD",
        "Good": "GOOD",
        "Fair": "ACCEPTABLE",
        "Poor": "FOR_PARTS_OR_NOT_WORKING"
      };
      const sku = `HG-${id}-${Date.now()}`;
      const locationKey = merchantLocationKey || "DEFAULT";
      const inventoryItem = {
        availability: {
          shipToLocationAvailability: {
            quantity: 1
          }
        },
        condition: conditionMap[item.condition || "Good"] || "GOOD",
        product: {
          title: (item.seoTitle || item.title).substring(0, 80),
          description: `<p>${item.seoDescription || item.description || item.title}</p>`,
          imageUrls: item.fullImageUrl ? [item.fullImageUrl] : []
        }
      };
      const inventoryResponse = await fetch(`${baseUrl}/sell/inventory/v1/inventory_item/${sku}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US"
        },
        body: JSON.stringify(inventoryItem)
      });
      if (!inventoryResponse.ok && inventoryResponse.status !== 204) {
        const error = await inventoryResponse.json().catch(() => ({}));
        const errorMessage = error.errors?.[0]?.message || `eBay inventory error: ${inventoryResponse.status}`;
        console.error("eBay inventory error:", error);
        return res.status(inventoryResponse.status).json({ error: errorMessage });
      }
      const offer = {
        sku,
        marketplaceId: "EBAY_US",
        format: "FIXED_PRICE",
        availableQuantity: 1,
        categoryId: "1",
        listingDescription: `<p>${item.seoDescription || item.description || item.title}</p>`,
        listingPolicies: {
          fulfillmentPolicyId: null,
          paymentPolicyId: null,
          returnPolicyId: null
        },
        merchantLocationKey: locationKey,
        pricingSummary: {
          price: {
            currency: "USD",
            value: price
          }
        }
      };
      const offerResponse = await fetch(`${baseUrl}/sell/inventory/v1/offer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US"
        },
        body: JSON.stringify(offer)
      });
      let offerId = null;
      let listingId = null;
      if (offerResponse.ok || offerResponse.status === 201) {
        const offerData = await offerResponse.json();
        offerId = offerData.offerId;
        const publishResponse = await fetch(`${baseUrl}/sell/inventory/v1/offer/${offerId}/publish`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
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
        const requiresPolicies = offerError.errors?.some(
          (e) => e.message?.includes("policy") || e.errorId === 25002
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
      await db.update(stashItems).set({
        publishedToEbay: true,
        ebayListingId: listingId || offerId || sku,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(stashItems.id, id));
      const listingUrl = listingId ? environment === "production" ? `https://www.ebay.com/itm/${listingId}` : `https://sandbox.ebay.com/itm/${listingId}` : void 0;
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
  app2.post("/api/ai-providers/test", async (req, res) => {
    try {
      const { provider, apiKey, endpoint, model } = req.body;
      if (!provider) {
        return res.status(400).json({ success: false, message: "Provider is required" });
      }
      const config = {
        provider,
        apiKey,
        endpoint,
        model
      };
      const result = await testProviderConnection(config);
      res.json(result);
    } catch (error) {
      console.error("AI provider test error:", error);
      res.status(500).json({ success: false, message: error.message || "Test failed" });
    }
  });
  app2.post("/api/analyze/retry", upload.fields([
    { name: "fullImage", maxCount: 1 },
    { name: "labelImage", maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files;
      const fullImageFile = files?.fullImage?.[0];
      const labelImageFile = files?.labelImage?.[0];
      const { previousResult, feedback, provider, apiKey, endpoint, model } = req.body;
      if (!previousResult || !feedback) {
        return res.status(400).json({ error: "previousResult and feedback are required" });
      }
      const images = [];
      if (fullImageFile) {
        images.push({ mimeType: fullImageFile.mimetype, data: fullImageFile.buffer.toString("base64") });
      }
      if (labelImageFile) {
        images.push({ mimeType: labelImageFile.mimetype, data: labelImageFile.buffer.toString("base64") });
      }
      const requestedProvider = typeof provider === "string" && provider.trim() ? provider.trim() : void 0;
      const primaryConfig = {
        provider: requestedProvider || "openfang",
        apiKey,
        endpoint,
        model
      };
      const parsedPrevious = typeof previousResult === "string" ? JSON.parse(previousResult) : previousResult;
      try {
        const result = await analyzeItemWithRetry(primaryConfig, images, parsedPrevious, feedback);
        return res.json(result);
      } catch (primaryError) {
        const canFallbackToGemini = !requestedProvider || requestedProvider === "openfang";
        if (!canFallbackToGemini) {
          throw primaryError;
        }
        const fallbackConfig = {
          provider: "gemini",
          model: "gemini-2.5-flash"
        };
        const fallbackResult = await analyzeItemWithRetry(fallbackConfig, images, parsedPrevious, feedback);
        return res.json(fallbackResult);
      }
    } catch (error) {
      console.error("Error in retry analysis:", error);
      res.status(500).json({ error: "Failed to re-analyze item" });
    }
  });
  app2.get("/api/products", async (req, res) => {
    try {
      const sellerId = req.query.sellerId;
      const query = sellerId ? db.select().from(products).where(eq2(products.sellerId, sellerId)).orderBy(desc(products.createdAt)) : db.select().from(products).orderBy(desc(products.createdAt));
      res.json(await query);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });
  app2.get("/api/products/:id", async (req, res) => {
    try {
      const [product] = await db.select().from(products).where(eq2(products.id, req.params.id));
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });
  app2.post("/api/products", async (req, res) => {
    try {
      const data = req.body;
      const [product] = await db.insert(products).values({
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
        tags: data.tags || []
      }).returning();
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });
  app2.put("/api/products/:id", async (req, res) => {
    try {
      const data = req.body;
      const [updated] = await db.update(products).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(products.id, req.params.id)).returning();
      if (!updated) return res.status(404).json({ error: "Product not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });
  app2.delete("/api/products/:id", async (req, res) => {
    try {
      await db.delete(products).where(eq2(products.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });
  app2.post("/api/upload/image", upload.single("image"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No image file provided" });
      const sellerId = req.body.sellerId || "anonymous";
      const result = await uploadProductImage(
        file.buffer,
        file.originalname,
        file.mimetype,
        sellerId
      );
      res.json(result);
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to upload image"
      });
    }
  });
  app2.delete("/api/upload/image", async (req, res) => {
    try {
      const { path: imagePath } = req.body;
      if (!imagePath) return res.status(400).json({ error: "path is required" });
      await deleteProductImage(imagePath);
      res.json({ success: true });
    } catch (error) {
      console.error("Image delete error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete image"
      });
    }
  });
  app2.post("/api/seo/generate", async (req, res) => {
    try {
      const { analysis, sellerId, productId, imageUrl } = req.body;
      if (!analysis) return res.status(400).json({ error: "analysis object is required" });
      const seoTitle = generateSEOTitle(analysis);
      const description = generateDescription(analysis);
      const tags = generateTags(analysis);
      let aiRecordId;
      if (sellerId && imageUrl) {
        aiRecordId = await createAIRecord({ sellerId, productId, imageUrl, analysis });
      }
      res.json({ seoTitle, description, tags, aiRecordId });
    } catch (error) {
      console.error("SEO generation error:", error);
      res.status(500).json({ error: "Failed to generate SEO data" });
    }
  });
  app2.put("/api/ebay/listing/:itemId", async (req, res) => {
    try {
      const { clientId, clientSecret, refreshToken, environment, ...input } = req.body;
      if (!clientId || !clientSecret || !refreshToken) {
        return res.status(400).json({ error: "eBay credentials required" });
      }
      const creds = { clientId, clientSecret, refreshToken, environment: environment || "sandbox" };
      const result = await updateEbayListing(creds, req.params.itemId, input);
      res.json(result);
    } catch (error) {
      console.error("eBay update error:", error);
      res.status(500).json({ error: "Failed to update eBay listing" });
    }
  });
  app2.delete("/api/ebay/listing/:itemId", async (req, res) => {
    try {
      const { clientId, clientSecret, refreshToken, environment } = req.body;
      if (!clientId || !clientSecret || !refreshToken) {
        return res.status(400).json({ error: "eBay credentials required" });
      }
      const creds = { clientId, clientSecret, refreshToken, environment: environment || "sandbox" };
      const result = await deleteEbayListing(creds, req.params.itemId);
      res.json(result);
    } catch (error) {
      console.error("eBay delete error:", error);
      res.status(500).json({ error: "Failed to delete eBay listing" });
    }
  });
  app2.post("/api/ebay/refresh-token", async (req, res) => {
    try {
      const { clientId, clientSecret, refreshToken, environment } = req.body;
      if (!clientId || !clientSecret || !refreshToken) {
        return res.status(400).json({ error: "eBay credentials required" });
      }
      const creds = { clientId, clientSecret, refreshToken, environment: environment || "sandbox" };
      const tokens = await refreshEbayAccessToken(creds);
      res.json(tokens);
    } catch (error) {
      console.error("eBay token refresh error:", error);
      res.status(500).json({ error: "Failed to refresh eBay token" });
    }
  });
  app2.get("/api/sync-queue", async (req, res) => {
    try {
      const sellerId = req.query.sellerId;
      if (!sellerId) return res.status(400).json({ error: "sellerId is required" });
      const jobs = await db.select().from(syncQueue).where(eq2(syncQueue.sellerId, sellerId)).orderBy(desc(syncQueue.createdAt));
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching sync queue:", error);
      res.status(500).json({ error: "Failed to fetch sync queue" });
    }
  });
  app2.get("/api/sync-queue/:id", async (req, res) => {
    try {
      const [job] = await db.select().from(syncQueue).where(eq2(syncQueue.id, req.params.id));
      if (!job) return res.status(404).json({ error: "Sync job not found" });
      res.json(job);
    } catch (error) {
      console.error("Error fetching sync job:", error);
      res.status(500).json({ error: "Failed to fetch sync job" });
    }
  });
  app2.post("/api/sync-queue", async (req, res) => {
    try {
      const { sellerId, productId, marketplace, action, payload, scheduledAt, maxRetries } = req.body;
      if (!sellerId || !productId || !marketplace || !action) {
        return res.status(400).json({
          error: "sellerId, productId, marketplace, and action are required"
        });
      }
      const validActions = [
        "ebay_create_listing",
        "ebay_update_listing",
        "ebay_delete_listing",
        "ebay_value_check",
        "woo_create_listing",
        "woo_update_listing",
        "woo_delete_listing"
      ];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          error: `Invalid action. Must be one of: ${validActions.join(", ")}`
        });
      }
      const [job] = await db.insert(syncQueue).values({
        sellerId,
        productId,
        marketplace,
        action,
        payload: payload || {},
        status: "pending",
        retryCount: 0,
        maxRetries: maxRetries ?? 3,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : void 0
      }).returning();
      res.status(201).json(job);
    } catch (error) {
      console.error("Error enqueuing sync job:", error);
      res.status(500).json({ error: "Failed to enqueue sync job" });
    }
  });
  app2.post("/api/sync-queue/:id/retry", async (req, res) => {
    try {
      const [job] = await db.select().from(syncQueue).where(eq2(syncQueue.id, req.params.id));
      if (!job) return res.status(404).json({ error: "Sync job not found" });
      if (job.status !== "failed" && job.status !== "retry") {
        return res.status(400).json({
          error: `Cannot retry job with status "${job.status}". Only failed or retry jobs can be retried.`
        });
      }
      const [updated] = await db.update(syncQueue).set({
        status: "pending",
        retryCount: 0,
        errorMessage: null,
        completedAt: null,
        scheduledAt: /* @__PURE__ */ new Date()
      }).where(eq2(syncQueue.id, req.params.id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Error retrying sync job:", error);
      res.status(500).json({ error: "Failed to retry sync job" });
    }
  });
  app2.post("/api/sync-queue/:id/cancel", async (req, res) => {
    try {
      const [job] = await db.select().from(syncQueue).where(eq2(syncQueue.id, req.params.id));
      if (!job) return res.status(404).json({ error: "Sync job not found" });
      if (job.status !== "pending" && job.status !== "retry") {
        return res.status(400).json({
          error: `Cannot cancel job with status "${job.status}". Only pending or retry jobs can be cancelled.`
        });
      }
      const [updated] = await db.update(syncQueue).set({
        status: "cancelled",
        completedAt: /* @__PURE__ */ new Date(),
        errorMessage: "Cancelled by user"
      }).where(eq2(syncQueue.id, req.params.id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Error cancelling sync job:", error);
      res.status(500).json({ error: "Failed to cancel sync job" });
    }
  });
  app2.post("/api/stash/search", async (req, res) => {
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
      let filters = {};
      try {
        const parseResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: parsePrompt }] }],
          config: { responseMimeType: "application/json" }
        });
        const parseText = parseResponse.text || "{}";
        filters = JSON.parse(parseText);
      } catch (parseErr) {
        filters = { keywords: query.trim().split(/\s+/) };
      }
      const conditions = [];
      if (filters.brand && typeof filters.brand === "string") {
        conditions.push(
          or(
            ilike(stashItems.title, `%${filters.brand}%`),
            ilike(stashItems.description, `%${filters.brand}%`),
            ilike(stashItems.seoTitle, `%${filters.brand}%`)
          )
        );
      }
      if (filters.category && typeof filters.category === "string") {
        conditions.push(ilike(stashItems.category, `%${filters.category}%`));
      }
      if (filters.condition && typeof filters.condition === "string") {
        conditions.push(ilike(stashItems.condition, `%${filters.condition}%`));
      }
      if (filters.publishStatus && typeof filters.publishStatus === "string") {
        conditions.push(eq2(stashItems.publishStatus, filters.publishStatus));
      }
      if (filters.keywords && Array.isArray(filters.keywords) && filters.keywords.length > 0) {
        const keywordConditions = filters.keywords.map(
          (kw) => or(
            ilike(stashItems.title, `%${kw}%`),
            ilike(stashItems.description, `%${kw}%`),
            ilike(stashItems.seoTitle, `%${kw}%`),
            ilike(stashItems.category, `%${kw}%`)
          )
        );
        conditions.push(...keywordConditions);
      }
      conditions.unshift(eq2(stashItems.userId, userId));
      let results;
      results = await db.select().from(stashItems).where(and2(...conditions)).orderBy(desc(stashItems.createdAt));
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
  const httpServer = createServer(app2);
  return httpServer;
}

// server/services/sync-worker.ts
import { eq as eq4, and as and3, or as or2, lte as lte3, sql as sql2, asc } from "drizzle-orm";

// server/services/sync-actions.ts
import { eq as eq3 } from "drizzle-orm";
var TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1e3;
async function ensureFreshEbayToken(integration) {
  const creds = integration.credentials;
  const ebayEnv = creds.environment ?? "sandbox";
  const ebayCredentials = {
    clientId: creds.clientId || creds.client_id || "",
    clientSecret: creds.clientSecret || creds.client_secret || "",
    refreshToken: integration.refreshToken || creds.refreshToken || creds.refresh_token || "",
    environment: ebayEnv
  };
  const expiresAt = integration.tokenExpiresAt ? new Date(integration.tokenExpiresAt).getTime() : 0;
  const now = Date.now();
  if (expiresAt > 0 && expiresAt - now > TOKEN_REFRESH_BUFFER_MS) {
    return ebayCredentials;
  }
  console.log(
    `[sync-worker] Refreshing eBay token for integration ${integration.id}`
  );
  try {
    const tokens = await refreshEbayAccessToken(ebayCredentials);
    await db.update(integrations).set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: new Date(tokens.expiresAt),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(integrations.id, integration.id));
    return {
      ...ebayCredentials,
      refreshToken: tokens.refreshToken
    };
  } catch (err) {
    console.error("[sync-worker] eBay token refresh failed:", err);
    return ebayCredentials;
  }
}
async function executeEbayCreate(ctx) {
  const { job, product, integration } = ctx;
  const payload = job.payload ?? {};
  try {
    const creds = await ensureFreshEbayToken(integration);
    const accessToken = await getAccessToken(creds);
    const baseUrl = creds.environment === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";
    const sku = payload.sku || product.sku || `HG-${product.id}-${Date.now()}`;
    const price = payload.price || product.price?.toString() || "9.99";
    const title = payload.title || product.title.substring(0, 80);
    const description = payload.description || product.description || product.title;
    const images = product.images;
    const primaryImage = images?.primary;
    const galleryImages = images?.gallery ?? [];
    const imageUrls = primaryImage ? [primaryImage, ...galleryImages] : galleryImages;
    const conditionMap = {
      new: "NEW",
      "like-new": "LIKE_NEW",
      excellent: "VERY_GOOD",
      good: "GOOD",
      fair: "ACCEPTABLE"
    };
    const ebayCondition = conditionMap[product.condition ?? "good"] || "GOOD";
    const categoryId = payload.categoryId || mapCategoryToEbay(product.category);
    const inventoryItem = {
      availability: { shipToLocationAvailability: { quantity: 1 } },
      condition: ebayCondition,
      product: {
        title,
        description: `<p>${description}</p>`,
        imageUrls
      }
    };
    const invRes = await fetch(
      `${baseUrl}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US"
        },
        body: JSON.stringify(inventoryItem)
      }
    );
    if (!invRes.ok && invRes.status !== 204) {
      const errBody = await invRes.json().catch(() => ({}));
      return {
        success: false,
        error: errBody.errors?.[0]?.toString() || `eBay inventory error: ${invRes.status}`,
        rawResponse: errBody
      };
    }
    const offer = {
      sku,
      marketplaceId: "EBAY_US",
      format: "FIXED_PRICE",
      availableQuantity: payload.quantity || 1,
      categoryId,
      listingDescription: `<p>${description}</p>`,
      pricingSummary: {
        price: { currency: "USD", value: price }
      },
      merchantLocationKey: payload.merchantLocationKey || "DEFAULT"
    };
    const offerRes = await fetch(
      `${baseUrl}/sell/inventory/v1/offer`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US"
        },
        body: JSON.stringify(offer)
      }
    );
    if (!offerRes.ok && offerRes.status !== 201) {
      const errBody = await offerRes.json().catch(() => ({}));
      return {
        success: false,
        error: errBody.errors?.[0]?.toString() || `eBay offer error: ${offerRes.status}`,
        rawResponse: errBody
      };
    }
    const offerData = await offerRes.json();
    const offerId = offerData.offerId;
    const publishRes = await fetch(
      `${baseUrl}/sell/inventory/v1/offer/${offerId}/publish`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );
    let listingId;
    if (publishRes.ok) {
      const pubData = await publishRes.json();
      listingId = pubData.listingId;
    }
    return {
      success: true,
      marketplaceId: listingId || offerId,
      rawResponse: { offerId, listingId, sku }
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown eBay create error"
    };
  }
}
async function executeEbayUpdate(ctx) {
  const { job, integration } = ctx;
  const payload = job.payload ?? {};
  try {
    const creds = await ensureFreshEbayToken(integration);
    const itemId = payload.itemId || payload.marketplaceId;
    if (!itemId) {
      return { success: false, error: "No eBay itemId in payload" };
    }
    const result = await updateEbayListing(creds, itemId, payload);
    return {
      success: result.status === "success",
      marketplaceId: result.itemId,
      error: result.status === "error" ? result.message : void 0,
      rawResponse: result
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown eBay update error"
    };
  }
}
async function executeEbayDelete(ctx) {
  const { job, integration } = ctx;
  const payload = job.payload ?? {};
  try {
    const creds = await ensureFreshEbayToken(integration);
    const itemId = payload.itemId || payload.marketplaceId;
    if (!itemId) {
      return { success: false, error: "No eBay itemId in payload" };
    }
    const result = await deleteEbayListing(creds, itemId);
    return {
      success: result.status === "success",
      marketplaceId: result.itemId,
      error: result.status === "error" ? result.message : void 0,
      rawResponse: result
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown eBay delete error"
    };
  }
}
async function executeEbayValueCheck(ctx) {
  const { job, product } = ctx;
  console.log(
    `[sync-worker] ebay_value_check stub for product ${product.id} (job ${job.id})`
  );
  return {
    success: true,
    rawResponse: {
      stub: true,
      message: "eBay value check not yet implemented \u2014 awaiting P2 eBay-MCP integration",
      productId: product.id
    }
  };
}
function buildWooAuth(integration) {
  const creds = integration.credentials;
  const storeUrl = creds.storeUrl || creds.store_url || creds.woocommerce_url || "";
  const consumerKey = creds.consumerKey || creds.consumer_key || creds.woocommerce_key || "";
  const consumerSecret = creds.consumerSecret || creds.consumer_secret || creds.woocommerce_secret || "";
  return {
    storeUrl: storeUrl.replace(/\/+$/, ""),
    credentials: Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
      "base64"
    )
  };
}
async function executeWooCreate(ctx) {
  const { job, product, integration } = ctx;
  const payload = job.payload ?? {};
  try {
    const { storeUrl, credentials } = buildWooAuth(integration);
    if (!storeUrl) {
      return { success: false, error: "No WooCommerce store URL in integration credentials" };
    }
    const images = product.images;
    const primaryImage = images?.primary;
    const productData = {
      name: payload.title || product.title,
      type: "simple",
      regular_price: payload.price || product.price?.toString() || "0",
      description: payload.description || product.description || "",
      short_description: product.description?.substring(0, 200) || "",
      categories: [],
      images: primaryImage ? [{ src: primaryImage }] : [],
      status: "publish",
      sku: product.sku
    };
    const res = await fetch(`${storeUrl}/wp-json/wc/v3/products`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(productData)
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errBody.message || `WooCommerce error: ${res.status}`,
        rawResponse: errBody
      };
    }
    const wooProduct = await res.json();
    return {
      success: true,
      marketplaceId: String(wooProduct.id),
      rawResponse: {
        id: wooProduct.id,
        permalink: wooProduct.permalink
      }
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown WooCommerce create error"
    };
  }
}
async function executeWooUpdate(ctx) {
  const { job, product, integration } = ctx;
  const payload = job.payload ?? {};
  try {
    const { storeUrl, credentials } = buildWooAuth(integration);
    const wooProductId = payload.marketplaceId || payload.wooProductId;
    if (!storeUrl || !wooProductId) {
      return {
        success: false,
        error: "Missing WooCommerce store URL or product ID"
      };
    }
    const updateData = {};
    if (payload.title || product.title) updateData.name = payload.title || product.title;
    if (payload.price || product.price)
      updateData.regular_price = payload.price || product.price?.toString();
    if (payload.description || product.description)
      updateData.description = payload.description || product.description;
    const res = await fetch(
      `${storeUrl}/wp-json/wc/v3/products/${wooProductId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      }
    );
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errBody.message || `WooCommerce update error: ${res.status}`,
        rawResponse: errBody
      };
    }
    const updated = await res.json();
    return {
      success: true,
      marketplaceId: String(updated.id),
      rawResponse: updated
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown WooCommerce update error"
    };
  }
}
async function executeWooDelete(ctx) {
  const { job, integration } = ctx;
  const payload = job.payload ?? {};
  try {
    const { storeUrl, credentials } = buildWooAuth(integration);
    const wooProductId = payload.marketplaceId || payload.wooProductId;
    if (!storeUrl || !wooProductId) {
      return {
        success: false,
        error: "Missing WooCommerce store URL or product ID"
      };
    }
    const res = await fetch(
      `${storeUrl}/wp-json/wc/v3/products/${wooProductId}?force=true`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json"
        }
      }
    );
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errBody.message || `WooCommerce delete error: ${res.status}`,
        rawResponse: errBody
      };
    }
    return {
      success: true,
      marketplaceId: wooProductId,
      rawResponse: { deleted: true }
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown WooCommerce delete error"
    };
  }
}

// server/services/sync-worker.ts
var BASE_BACKOFF_MS = 3e4;
var MAX_JOBS_PER_TICK = 10;
var LOG_PREFIX = "[sync-worker]";
var ACTION_MAP = {
  ebay_create_listing: executeEbayCreate,
  ebay_update_listing: executeEbayUpdate,
  ebay_delete_listing: executeEbayDelete,
  ebay_value_check: executeEbayValueCheck,
  woo_create_listing: executeWooCreate,
  woo_update_listing: executeWooUpdate,
  woo_delete_listing: executeWooDelete
};
async function processSyncQueue() {
  const now = /* @__PURE__ */ new Date();
  const jobs = await db.select().from(syncQueue).where(
    and3(
      or2(eq4(syncQueue.status, "pending"), eq4(syncQueue.status, "retry")),
      lte3(syncQueue.scheduledAt, now)
    )
  ).orderBy(asc(syncQueue.scheduledAt)).limit(MAX_JOBS_PER_TICK);
  if (jobs.length === 0) return 0;
  console.log(`${LOG_PREFIX} Found ${jobs.length} job(s) to process`);
  let processed = 0;
  for (const job of jobs) {
    try {
      await processJob(job);
      processed++;
    } catch (err) {
      console.error(`${LOG_PREFIX} Unhandled error processing job ${job.id}:`, err);
      await markFailed(
        job,
        err instanceof Error ? err.message : "Unhandled worker error"
      );
      processed++;
    }
  }
  return processed;
}
async function processJob(job) {
  const handler = ACTION_MAP[job.action];
  if (!handler) {
    console.warn(`${LOG_PREFIX} Unknown action "${job.action}" for job ${job.id}`);
    await markFailed(job, `Unknown action: ${job.action}`);
    return;
  }
  await db.update(syncQueue).set({ status: "processing" }).where(eq4(syncQueue.id, job.id));
  const [product] = await db.select().from(products).where(eq4(products.id, job.productId));
  if (!product) {
    await markFailed(job, `Product ${job.productId} not found`);
    return;
  }
  const integration = await resolveIntegration(job.sellerId, job.marketplace);
  if (!integration) {
    await markFailed(
      job,
      `No active ${job.marketplace} integration for seller ${job.sellerId}`
    );
    return;
  }
  const ctx = { job, product, integration };
  console.log(
    `${LOG_PREFIX} Executing ${job.action} for product ${product.id} (job ${job.id})`
  );
  const result = await handler(ctx);
  if (result.success) {
    await onSuccess(job, product, result);
  } else {
    await onFailure(job, product, result);
  }
}
async function resolveIntegration(sellerId, marketplace) {
  const serviceMap = {
    ebay: "ebay",
    woocommerce: "woocommerce",
    woo: "woocommerce"
  };
  const service = serviceMap[marketplace.toLowerCase()] || marketplace;
  const [integration] = await db.select().from(integrations).where(
    and3(
      eq4(integrations.sellerId, sellerId),
      eq4(integrations.service, service),
      eq4(integrations.isActive, true)
    )
  );
  return integration ?? null;
}
async function onSuccess(job, product, result) {
  console.log(
    `${LOG_PREFIX} Job ${job.id} completed \u2014 marketplaceId: ${result.marketplaceId ?? "n/a"}`
  );
  await db.update(syncQueue).set({
    status: "completed",
    completedAt: /* @__PURE__ */ new Date(),
    errorMessage: null
  }).where(eq4(syncQueue.id, job.id));
  if (result.marketplaceId && isCreateOrUpdateAction(job.action)) {
    await upsertListing(job, product, result);
  }
  if (isDeleteAction(job.action) && result.marketplaceId) {
    await db.update(listingsTable).set({
      status: "inactive",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      and3(
        eq4(listingsTable.productId, job.productId),
        eq4(listingsTable.marketplace, job.marketplace)
      )
    );
  }
  await updateProductSyncStatus(product, job.marketplace, "synced");
  await db.update(integrations).set({
    lastSyncedAt: /* @__PURE__ */ new Date(),
    syncCount: sql2`${integrations.syncCount} + 1`,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(
    and3(
      eq4(integrations.sellerId, job.sellerId),
      eq4(integrations.service, job.marketplace)
    )
  );
}
async function onFailure(job, product, result) {
  const currentRetries = job.retryCount ?? 0;
  const maxRetries = job.maxRetries ?? 3;
  if (currentRetries < maxRetries) {
    const backoffMs = BASE_BACKOFF_MS * Math.pow(2, currentRetries);
    const nextScheduledAt = new Date(Date.now() + backoffMs);
    console.log(
      `${LOG_PREFIX} Job ${job.id} failed (attempt ${currentRetries + 1}/${maxRetries}) \u2014 retrying at ${nextScheduledAt.toISOString()}: ${result.error}`
    );
    await db.update(syncQueue).set({
      status: "retry",
      retryCount: currentRetries + 1,
      scheduledAt: nextScheduledAt,
      errorMessage: result.error || "Unknown error"
    }).where(eq4(syncQueue.id, job.id));
  } else {
    await markFailed(job, result.error || "Max retries exceeded");
  }
  await updateProductSyncStatus(product, job.marketplace, "error");
}
async function markFailed(job, error) {
  console.error(`${LOG_PREFIX} Job ${job.id} permanently failed: ${error}`);
  await db.update(syncQueue).set({
    status: "failed",
    errorMessage: error,
    completedAt: /* @__PURE__ */ new Date()
  }).where(eq4(syncQueue.id, job.id));
}
function isCreateOrUpdateAction(action) {
  return action.endsWith("_create_listing") || action.endsWith("_update_listing");
}
function isDeleteAction(action) {
  return action.endsWith("_delete_listing");
}
async function upsertListing(job, product, result) {
  const payload = job.payload ?? {};
  const [existing] = await db.select().from(listingsTable).where(
    and3(
      eq4(listingsTable.productId, job.productId),
      eq4(listingsTable.marketplace, job.marketplace)
    )
  );
  if (existing) {
    await db.update(listingsTable).set({
      marketplaceId: result.marketplaceId,
      status: "active",
      publishedAt: /* @__PURE__ */ new Date(),
      syncError: null,
      rawApiResponse: result.rawResponse ?? {},
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq4(listingsTable.id, existing.id));
  } else {
    await db.insert(listingsTable).values({
      sellerId: job.sellerId,
      productId: job.productId,
      marketplace: job.marketplace,
      marketplaceId: result.marketplaceId,
      title: payload.title || product.title,
      description: payload.description || product.description || product.title,
      price: payload.price || product.price?.toString(),
      quantity: payload.quantity || 1,
      sku: product.sku,
      status: "active",
      publishedAt: /* @__PURE__ */ new Date(),
      rawApiResponse: result.rawResponse ?? {}
    });
  }
}
async function updateProductSyncStatus(product, marketplace, status) {
  const currentSyncStatus = product.syncStatus ?? {};
  const updatedSyncStatus = { ...currentSyncStatus, [marketplace]: status };
  await db.update(products).set({
    syncStatus: updatedSyncStatus,
    syncLastAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq4(products.id, product.id));
}
var workerInterval = null;
var isProcessing = false;
function startSyncWorker(pollIntervalMs = 15e3) {
  if (workerInterval) {
    console.warn(`${LOG_PREFIX} Worker already running \u2014 ignoring start`);
    return;
  }
  console.log(
    `${LOG_PREFIX} Starting sync queue worker (poll every ${pollIntervalMs / 1e3}s)`
  );
  workerInterval = setInterval(async () => {
    if (isProcessing) return;
    isProcessing = true;
    try {
      const count2 = await processSyncQueue();
      if (count2 > 0) {
        console.log(`${LOG_PREFIX} Processed ${count2} job(s) this tick`);
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Worker tick error:`, err);
    } finally {
      isProcessing = false;
    }
  }, pollIntervalMs);
}
function stopSyncWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log(`${LOG_PREFIX} Sync queue worker stopped`);
  }
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, _next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0"
    },
    () => {
      log(`express server serving on port ${port}`);
      startSyncWorker(15e3);
      const SIX_HOURS_MS = 6 * 60 * 60 * 1e3;
      setInterval(async () => {
        try {
          log("Running scheduled price check...");
          await processPriceChecks();
          log("Scheduled price check completed");
        } catch (error) {
          console.error("Scheduled price check failed:", error);
        }
      }, SIX_HOURS_MS);
      log("Price check scheduled every 6 hours");
    }
  );
  const shutdown = () => {
    log("Shutting down\u2026");
    stopSyncWorker();
    server.close(() => {
      log("Server closed");
      process.exit(0);
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
})();
