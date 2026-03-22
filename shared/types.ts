/**
 * Canonical FlipAgent types — shared between server and client.
 * These mirror the database schema and provide the single source of truth
 * for product, listing, AI generation, seller, and integration shapes.
 */

export interface HandmadeDetails {
  productName: string;
  ingredients: string;
  scentOrTexture: string;
  sizeVolume: string;
  costOfGoods: number;
}

export interface ProductType {
  id: string;
  seller_id: string;
  sku: string;
  title: string;
  description?: string;
  brand?: string;
  style_name?: string;
  category?: string;
  condition?: "new" | "like-new" | "excellent" | "good" | "fair";
  price?: number;
  cost?: number;
  estimated_profit?: number;
  images?: {
    primary: string;
    gallery?: string[];
    ai_analysis?: Record<string, string | number | boolean>;
  };
  attributes?: Record<string, string | number | boolean>;
  tags?: string[];
  listings?: Record<string, string>;
  sync_status?: Record<string, string>;
  sync_last_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ListingType {
  id: string;
  seller_id: string;
  product_id: string;
  marketplace: "ebay" | "woocommerce" | "custom_store";
  marketplace_id?: string;
  title: string;
  description: string;
  seo_tags?: string[];
  category_id?: string;
  sku?: string;
  price: number;
  quantity: number;
  status: "draft" | "active" | "sold" | "inactive";
  published_at?: string;
  sync_error?: string;
  raw_api_response?: Record<string, string | number | boolean | null>;
  created_at: string;
  updated_at: string;
}

export interface AIGenerationType {
  id: string;
  seller_id: string;
  product_id?: string;
  input_image_url: string;
  input_text?: string;
  model_used: string;
  output_listing: {
    title: string;
    description: string;
    tags: string[];
    analysis: Record<string, string | number | string[] | boolean | undefined>;
  };
  tokens_used: number;
  cost: number;
  quality_score: number;
  user_feedback?: "liked" | "needs-revision" | "rejected";
  created_at: string;
}

export interface SellerType {
  id: string;
  user_id: string;
  shop_name: string;
  shop_description?: string;
  avatar_url?: string;
  subscription_tier: "free" | "pro" | "enterprise";
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationType {
  id: string;
  seller_id: string;
  service: "ebay" | "woocommerce";
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  credentials: Record<string, string | number | boolean>;
  is_active: boolean;
  last_synced_at?: string;
  sync_count: number;
  created_at: string;
  updated_at: string;
}

/** Result shape returned by the Gemini analyzeProductImage function */
export interface GeminiAnalysisResult {
  brand?: string;
  style_name?: string;
  category: string;
  condition: string;
  material?: string;
  color?: string;
  size?: string;
  features?: string[];
  estimated_resale_value?: number;
  authenticity_notes?: string;
  [key: string]: string | number | string[] | undefined;
}
