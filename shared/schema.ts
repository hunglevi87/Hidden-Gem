import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  serial,
  integer,
  timestamp,
  boolean,
  jsonb,
  uuid,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  geminiApiKey: text("gemini_api_key"),
  huggingfaceApiKey: text("huggingface_api_key"),
  preferredGeminiModel: text("preferred_gemini_model").default(
    "gemini-2.5-flash",
  ),
  preferredHuggingfaceModel: text("preferred_huggingface_model"),
  woocommerceUrl: text("woocommerce_url"),
  woocommerceKey: text("woocommerce_key"),
  woocommerceSecret: text("woocommerce_secret"),
  ebayToken: text("ebay_token"),
  openfangApiKey: text("openfang_api_key"),
  openfangBaseUrl: text("openfang_base_url"),
  preferredOpenfangModel: text("preferred_openfang_model"),
  highValueThreshold: integer("high_value_threshold").default(500),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const stashItems = pgTable("stash_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
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
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  readingTime: integer("reading_time").default(5),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStashItemSchema = createInsertSchema(stashItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

// ---------------------------------------------------------------------------
// FlipAgent tables — seller profiles, product inventory, marketplace listings,
// AI audit trail, and async sync queue
// ---------------------------------------------------------------------------

export const sellers = pgTable("sellers", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  shopName: text("shop_name").notNull(),
  shopDescription: text("shop_description"),
  avatarUrl: text("avatar_url"),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionTier: text("subscription_tier").default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  createdAt: timestamp("created_at").default(sql`NOW()`),
  updatedAt: timestamp("updated_at").default(sql`NOW()`),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellers.id, { onDelete: "cascade" }),
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
    tags: text("tags")
      .array()
      .default(sql`ARRAY[]::TEXT[]`),
    listings: jsonb("listings").default({}),
    syncStatus: jsonb("sync_status").default({}),
    syncLastAt: timestamp("sync_last_at"),
    createdAt: timestamp("created_at").default(sql`NOW()`),
    updatedAt: timestamp("updated_at").default(sql`NOW()`),
  },
  (table) => [
    uniqueIndex("products_seller_sku_unique").on(table.sellerId, table.sku),
  ],
);

export const listingsTable = pgTable("listings", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => sellers.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(),
  marketplaceId: text("marketplace_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  seoTags: text("seo_tags")
    .array()
    .default(sql`ARRAY[]::TEXT[]`),
  categoryId: text("category_id"),
  sku: text("sku"),
  price: numeric("price", { precision: 10, scale: 2 }),
  quantity: integer("quantity").default(1),
  status: text("status").default("draft"),
  publishedAt: timestamp("published_at"),
  syncError: text("sync_error"),
  rawApiResponse: jsonb("raw_api_response"),
  createdAt: timestamp("created_at").default(sql`NOW()`),
  updatedAt: timestamp("updated_at").default(sql`NOW()`),
});

export const aiGenerations = pgTable("ai_generations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => sellers.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  inputImageUrl: text("input_image_url"),
  inputText: text("input_text"),
  modelUsed: text("model_used"),
  outputListing: jsonb("output_listing"),
  tokensUsed: integer("tokens_used"),
  cost: numeric("cost", { precision: 8, scale: 4 }),
  qualityScore: numeric("quality_score", { precision: 3, scale: 2 }),
  userFeedback: text("user_feedback"),
  createdAt: timestamp("created_at").default(sql`NOW()`),
});

export const syncQueue = pgTable("sync_queue", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => sellers.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(),
  action: text("action").notNull(),
  payload: jsonb("payload"),
  status: text("status").default("pending"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  createdAt: timestamp("created_at").default(sql`NOW()`),
  scheduledAt: timestamp("scheduled_at").default(
    sql`NOW() + INTERVAL '5 seconds'`,
  ),
  completedAt: timestamp("completed_at"),
});

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellers.id, { onDelete: "cascade" }),
    service: text("service").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at"),
    credentials: jsonb("credentials").default({}),
    isActive: boolean("is_active").default(true),
    lastSyncedAt: timestamp("last_synced_at"),
    syncCount: integer("sync_count").default(0),
    createdAt: timestamp("created_at").default(sql`NOW()`),
    updatedAt: timestamp("updated_at").default(sql`NOW()`),
  },
  (table) => [
    uniqueIndex("integrations_seller_service_unique").on(
      table.sellerId,
      table.service,
    ),
  ],
);

// Insert schemas for new tables
export const insertSellerSchema = createInsertSchema(sellers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertListingSchema = createInsertSchema(listingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiGenerationSchema = createInsertSchema(aiGenerations).omit({
  id: true,
  createdAt: true,
});

export const insertSyncQueueSchema = createInsertSchema(syncQueue).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Push tokens for notifications
export const pushTokens = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: text("platform").notNull(), // 'ios', 'android', 'web'
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Price tracking for items
export const priceTracking = pgTable("price_tracking", {
  id: serial("id").primaryKey(),
  stashItemId: integer("stash_item_id")
    .notNull()
    .references(() => stashItems.id, { onDelete: "cascade" }),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true),
  lastPrice: integer("last_price"),
  lastCheckedAt: timestamp("last_checked_at"),
  nextCheckAt: timestamp("next_check_at"),
  alertThreshold: integer("alert_threshold"), // Percentage change to trigger alert
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Notification history
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stashItemId: integer("stash_item_id").references(() => stashItems.id, {
    onDelete: "cascade",
  }),
  type: text("type").notNull(), // 'price_drop', 'price_increase', 'market_update'
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data"), // Additional payload data
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const insertPushTokenSchema = createInsertSchema(pushTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPriceTrackingSchema = createInsertSchema(priceTracking).omit(
  {
    id: true,
    createdAt: true,
    updatedAt: true,
  },
);

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  sentAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type StashItem = typeof stashItems.$inferSelect;
export type InsertStashItem = z.infer<typeof insertStashItemSchema>;
export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
export type PriceTracking = typeof priceTracking.$inferSelect;
export type InsertPriceTracking = z.infer<typeof insertPriceTrackingSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// FlipAgent table types
export type Seller = typeof sellers.$inferSelect;
export type InsertSeller = z.infer<typeof insertSellerSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Listing = typeof listingsTable.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;
export type AIGeneration = typeof aiGenerations.$inferSelect;
export type InsertAIGeneration = z.infer<typeof insertAiGenerationSchema>;
export type SyncQueueItem = typeof syncQueue.$inferSelect;
export type InsertSyncQueueItem = z.infer<typeof insertSyncQueueSchema>;
export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
