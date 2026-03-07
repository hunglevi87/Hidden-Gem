-- FlipAgent schema: sellers, products, listings, integrations, ai_generations, sync_queue
-- These tables add seller profiles, proper inventory with SKU/cost/profit tracking,
-- per-marketplace listing status, AI audit trail, and async retry queue.

CREATE TABLE IF NOT EXISTS "sellers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "shop_name" TEXT NOT NULL,
  "shop_description" TEXT,
  "avatar_url" TEXT,
  "stripe_customer_id" TEXT,
  "subscription_tier" TEXT DEFAULT 'free',
  "subscription_expires_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "products" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "seller_id" UUID NOT NULL REFERENCES "sellers"("id") ON DELETE CASCADE,
  "sku" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "brand" TEXT,
  "style_name" TEXT,
  "category" TEXT,
  "condition" TEXT,
  "price" DECIMAL(10, 2),
  "cost" DECIMAL(10, 2),
  "estimated_profit" DECIMAL(10, 2),
  "images" JSONB DEFAULT '{}'::jsonb,
  "attributes" JSONB DEFAULT '{}'::jsonb,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "listings" JSONB DEFAULT '{}'::jsonb,
  "sync_status" JSONB DEFAULT '{}'::jsonb,
  "sync_last_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  UNIQUE("seller_id", "sku")
);

CREATE TABLE IF NOT EXISTS "listings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "seller_id" UUID NOT NULL REFERENCES "sellers"("id") ON DELETE CASCADE,
  "product_id" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "marketplace" TEXT NOT NULL,
  "marketplace_id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "seo_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "category_id" TEXT,
  "sku" TEXT,
  "price" DECIMAL(10, 2),
  "quantity" INT DEFAULT 1,
  "status" TEXT DEFAULT 'draft',
  "published_at" TIMESTAMP,
  "sync_error" TEXT,
  "raw_api_response" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "integrations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "seller_id" UUID NOT NULL REFERENCES "sellers"("id") ON DELETE CASCADE,
  "service" TEXT NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "token_expires_at" TIMESTAMP,
  "credentials" JSONB DEFAULT '{}'::jsonb,
  "is_active" BOOLEAN DEFAULT true,
  "last_synced_at" TIMESTAMP,
  "sync_count" INT DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  UNIQUE("seller_id", "service")
);

CREATE TABLE IF NOT EXISTS "ai_generations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "seller_id" UUID NOT NULL REFERENCES "sellers"("id") ON DELETE CASCADE,
  "product_id" UUID REFERENCES "products"("id") ON DELETE SET NULL,
  "input_image_url" TEXT,
  "input_text" TEXT,
  "model_used" TEXT,
  "output_listing" JSONB,
  "tokens_used" INT,
  "cost" DECIMAL(8, 4),
  "quality_score" DECIMAL(3, 2),
  "user_feedback" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "sync_queue" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "seller_id" UUID NOT NULL REFERENCES "sellers"("id") ON DELETE CASCADE,
  "product_id" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "marketplace" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "payload" JSONB,
  "status" TEXT DEFAULT 'pending',
  "error_message" TEXT,
  "retry_count" INT DEFAULT 0,
  "max_retries" INT DEFAULT 3,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "scheduled_at" TIMESTAMP DEFAULT NOW() + INTERVAL '5 seconds',
  "completed_at" TIMESTAMP
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_products_seller ON "products"("seller_id");
CREATE INDEX IF NOT EXISTS idx_products_sku ON "products"("seller_id", "sku");
CREATE INDEX IF NOT EXISTS idx_listings_seller_marketplace ON "listings"("seller_id", "marketplace");
CREATE INDEX IF NOT EXISTS idx_integrations_seller ON "integrations"("seller_id");
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON "sync_queue"("status", "scheduled_at");
CREATE INDEX IF NOT EXISTS idx_ai_generations_seller ON "ai_generations"("seller_id", "created_at" DESC);
