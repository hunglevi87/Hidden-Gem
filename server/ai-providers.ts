import { GoogleGenAI } from "@google/genai";
import type { HandmadeDetails } from "@shared/types";

export type AIProviderType = "gemini" | "openai" | "anthropic" | "custom" | "openfang";

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  secondaryProvider?: AIProviderType;
  secondaryApiKey?: string;
  secondaryEndpoint?: string;
  secondaryModel?: string;
}

export interface PlatformListing {
  title: string;
  description: string;
  tags: string[];
  suggestedPrice: number;
}

export interface MarketMatch {
  source: string;
  title: string;
  price: number;
  url: string;
}

export interface AnalysisResult {
  // Legacy fields (backward compatibility)
  title: string;
  description: string;
  category: string;
  estimatedValue: string;
  condition: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  tags: string[];

  // New enhanced fields
  brand: string;
  subtitle: string;
  shortDescription: string;
  fullDescription: string;
  estimatedValueLow: number;
  estimatedValueHigh: number;
  suggestedListPrice: number;
  confidence: "high" | "medium" | "low";
  authenticity: "Authentic" | "Likely Authentic" | "Uncertain" | "Likely Counterfeit" | "Counterfeit";
  authenticityConfidence: number;
  authenticityDetails: string;
  authenticationTips: string[];
  marketAnalysis: string;
  aspects: Record<string, string[]>;
  ebayCategoryId: string;
  wooCategory: string;

  // Multi-platform listing versions
  platformVersions?: {
    ebay: PlatformListing;
    poshmark: PlatformListing;
    depop: PlatformListing;
    stripe: PlatformListing;
  };

  // Market comparable sold listings
  marketMatches?: MarketMatch[];

  // Item type
  itemType?: "designer" | "handmade";
}

interface ImageInput {
  mimeType: string;
  data: string;
}

const ANALYSIS_PROMPT = `You are Emma, an expert appraiser and reseller assistant specializing in designer goods, luxury fashion, and premium brands. Analyze the provided images (full item + label/tag) and deliver a comprehensive professional appraisal report.

## AUTHENTICATION ASSESSMENT
Carefully examine for authenticity indicators of designer and luxury goods:
- Brand markings, logos, serial numbers, date codes, authenticity cards
- Hardware quality (zippers, clasps, studs), stitching consistency, material quality
- Font, logo placement, and print quality on tags and labels
- Common counterfeit red flags specific to this brand and item type
- Overall craftsmanship consistency with genuine pieces from this brand

Provide:
- authenticity: One of ["Authentic", "Likely Authentic", "Uncertain", "Likely Counterfeit", "Counterfeit"]
- authenticityConfidence: Number 0-100 representing your confidence
- authenticityDetails: Detailed explanation of authentication indicators observed
- authenticationTips: Array of 3-5 specific tips for authenticating this brand/item type

## MARKET VALUATION ANALYSIS
Research the current luxury resale market:
- estimatedValueLow: Numeric low end of resale value range (just the number, no $)
- estimatedValueHigh: Numeric high end of resale value range (just the number, no $)
- suggestedListPrice: Numeric recommended listing price for quick sale (just the number, no $)
- confidence: One of ["high", "medium", "low"] for overall appraisal confidence
- marketAnalysis: Detailed paragraph on current resale demand, comparable sold listings, brand desirability, and pricing rationale on platforms like eBay, The RealReal, Poshmark, and Depop

## MARKET COMPARABLE LISTINGS (marketMatches)
Generate 3-5 realistic comparable sold listings from resale platforms. Each must have:
- source: Platform name (e.g., "eBay", "Poshmark", "The RealReal", "Depop", "Vestiaire")
- title: Realistic listing title for that comparable item
- price: Numeric sold price (just the number, no $)
- url: Plausible but illustrative URL (e.g., "https://www.ebay.com/itm/example")

## ITEM IDENTIFICATION & LISTING DATA
- brand: Identified brand name (or "Unknown" if unbranded)
- title: Clear, keyword-rich item title (max 80 chars for eBay) — include brand, style, material, and condition
- subtitle: Short catchy subtitle (max 55 chars for eBay)
- category: General category (e.g., Handbag, Shoes, Clothing, Jewelry, Watch, Sunglasses, Belt, Wallet)
- condition: One of ["New", "Like New", "Very Good", "Good", "Acceptable", "For Parts"]
- shortDescription: Concise 1-2 sentence storefront description highlighting brand and key appeal
- fullDescription: Rich, detailed HTML description for listings — include brand story, materials, dimensions, condition notes, and what makes this piece special
- description: Medium-length plain text description
- estimatedValue: Formatted string (e.g., "$150-$200")

## SEO & CATEGORIZATION
- seoTitle: SEO-optimized title including brand, style name, and category
- seoDescription: SEO-optimized meta description for storefront
- seoKeywords: Array of 8-12 relevant SEO keywords (brand, style, material, category, luxury resale keywords)
- tags: Array of 3-6 relevant tags for categorization

## ITEM SPECIFICS / ASPECTS
Provide key-value pairs as an object relevant to this luxury/designer item. Examples:
- Brand: ["Louis Vuitton"]
- Style Name: ["Neverfull MM"]
- Material: ["Coated Canvas", "Leather Trim"]
- Color: ["Brown", "Monogram"]
- Size: ["Medium", "32cm"]
- Hardware: ["Gold-tone"]
- Country of Origin: ["France"]
- Includes: ["Dust Bag", "Authenticity Card"]
- ebayCategoryId: Suggested eBay category ID (use "1" for generic if unsure)
- wooCategory: Suggested category name for the storefront

## MULTI-PLATFORM LISTING VERSIONS (platformVersions)
Generate optimized listing versions for each selling platform. Each version needs title, description, tags (array), and suggestedPrice (number):

- platformVersions.ebay: SEO-dense title with brand/model/condition keywords (max 80 chars). Description uses eBay HTML formatting with bullet points, condition details, and seller policy mentions. Tags are eBay item specifics keywords. Price is the standard resale price.
- platformVersions.poshmark: Casual community-style title using conversational language (e.g., "Gorgeous LV Neverfull MM 🛍️"). Description is warm, personal, mentions measurements, condition honestly, and uses Poshmark community norms. Tags are comma-style closet tags. Price matches the estimated list price.
- platformVersions.depop: Short, trendy title that Gen Z/millennial buyers would search (e.g., "y2k coach bag vintage"). Description is brief, emoji-friendly, mentions measurements and condition. Tags use depop hashtag style keywords. Price may be slightly lower to attract younger buyers.
- platformVersions.stripe: Clean, branded e-commerce copy. Professional product title without platform constraints. Description is polished marketing copy suitable for a boutique checkout page — no emoji, no seller jargon. Tags are clean category and style keywords for search. Price is retail/full price.

Respond ONLY with valid JSON. All fields must be present. Use empty strings/arrays/zeros for unknown values, never omit fields.`;

export type { HandmadeDetails };

export function buildHandmadePrompt(details: HandmadeDetails): string {
  return `You are Emma, an artisan product pricing expert and copywriter specializing in handmade goods, natural beauty products, and small-batch artisan items. A seller has provided the following details about a handmade product along with a product photo. Your job is to price it correctly based on artisan market standards and write compelling, ingredient-forward listing copy.

## PRODUCT DETAILS PROVIDED BY SELLER
- Product Name: ${details.productName}
- Ingredients / Materials: ${details.ingredients}
- Scent / Texture Notes: ${details.scentOrTexture}
- Size / Volume: ${details.sizeVolume}
- Cost of Goods (COG): $${details.costOfGoods}

## ARTISAN PRICING GUIDELINES
Price handmade goods using the artisan market formula: retail price = COG × (3 to 5×) depending on:
- Product category (candles: 3-4×, body butter/lotion: 3-5×, soap: 3-4×, bath salts: 3-4×)
- Premium ingredients (shea butter, essential oils, botanical extracts) justify higher multipliers
- Small-batch, handmade positioning supports premium pricing vs mass-market
- Review comparable Etsy, farmers market, and specialty boutique pricing

Provide:
- estimatedValueLow: Numeric low end of suggested retail price range (no $)
- estimatedValueHigh: Numeric high end of suggested retail price range (no $)
- suggestedListPrice: Numeric recommended retail price (no $)
- confidence: One of ["high", "medium", "low"]
- marketAnalysis: Paragraph explaining the pricing rationale, comparable Etsy/artisan pricing, and what drives demand for this type of product

## LISTING DATA
- brand: The shop brand or "Handmade" if no brand provided
- title: Product listing title (max 80 chars) — lead with key ingredients or scent, then product type
- subtitle: Short enticing subtitle (max 55 chars) — highlight a key benefit or scent note
- category: Product category (e.g., Candle, Body Butter, Body Wash, Lotion, Soap, Hand Soap, Bath Salt, Lip Balm)
- condition: Always "New" for handmade products
- shortDescription: 1-2 sentence storefront description leading with what makes this product special
- fullDescription: Rich HTML description — lead with sensory details (scent, texture, feel), then ingredients highlights, then usage instructions, then size/volume
- description: Medium-length plain text description
- estimatedValue: Formatted string (e.g., "$18-$24")

## AUTHENTICATION (not applicable for handmade)
- authenticity: Always "Authentic" for handmade products
- authenticityConfidence: Always 100
- authenticityDetails: "Handmade product — authenticity not applicable."
- authenticationTips: []

## SEO & CATEGORIZATION
- seoTitle: SEO-optimized title with key ingredients, product type, and handmade/artisan keywords
- seoDescription: SEO meta description for storefront
- seoKeywords: Array of 8-12 keywords (ingredients, scent, product type, handmade, natural, artisan, small-batch)
- tags: Array of 3-6 tags

## ITEM SPECIFICS / ASPECTS
Provide handmade-relevant key-value pairs:
- Key Ingredients: [list top 3-5 ingredients]
- Scent: [scent name or "Unscented"]
- Net Weight / Volume: ["value from seller details"]
- Skin Type: ["All Skin Types" or specific if indicated by ingredients]
- Finish / Texture: ["from seller details"]
- Handmade: ["Yes"]
- Vegan: ["Yes" / "No" / "Unknown" based on ingredients]
- ebayCategoryId: Suggested eBay category ID
- wooCategory: Suggested category name for the storefront

## MARKET COMPARABLE LISTINGS (marketMatches)
Generate 3-5 realistic comparable sold listings from artisan/handmade platforms. Each must have:
- source: Platform name (e.g., "Etsy", "Amazon Handmade", "Notonthehighstreet", "Shopify")
- title: Realistic listing title for that comparable handmade item
- price: Numeric sold price (just the number, no $)
- url: Plausible but illustrative URL (e.g., "https://www.etsy.com/listing/example")

## MULTI-PLATFORM LISTING VERSIONS (platformVersions)
Generate optimized listing versions for each selling platform. Each version needs title, description, tags (array), and suggestedPrice (number):

- platformVersions.ebay: Ingredient-forward title with product type and natural/handmade keywords (max 80 chars). Description uses eBay HTML formatting with bullet-pointed ingredient list, scent/texture notes, and usage info. Tags are eBay search keywords.
- platformVersions.poshmark: Casual, sensory title emphasizing scent or key benefit. Description is warm and personal, mentions ingredients, size, and how it feels/smells. Tags use poshmark hashtag style.
- platformVersions.depop: Short trendy title a younger buyer would search. Brief, emoji-friendly description mentioning hero ingredient and scent. Tags use depop hashtag style.
- platformVersions.stripe: Clean branded e-commerce copy. Professional product name. Description is polished marketing copy for a boutique checkout — lead with sensory experience, then ingredients and size. Tags are clean category keywords.

Respond ONLY with valid JSON. All fields must be present. Use empty strings/arrays/zeros for unknown values, never omit fields.`;
}

const FALLBACK_RESULT: AnalysisResult = {
  // Legacy fields
  title: "Designer Item",
  description: "A pre-owned designer item in good condition.",
  category: "Fashion",
  estimatedValue: "$50-$100",
  condition: "Good",
  seoTitle: "Pre-Owned Designer Item for Sale",
  seoDescription: "Authentic pre-owned designer item in good condition. Great addition to any wardrobe.",
  seoKeywords: ["designer", "luxury", "pre-owned", "resale"],
  tags: ["designer", "luxury", "pre-owned"],
  // New enhanced fields
  brand: "Unknown",
  subtitle: "Pre-owned designer item",
  shortDescription: "A pre-owned designer item in good condition.",
  fullDescription: "<p>This is a pre-owned designer item in good overall condition. Please review photos carefully as they form part of the description.</p>",
  estimatedValueLow: 50,
  estimatedValueHigh: 100,
  suggestedListPrice: 75,
  confidence: "low",
  authenticity: "Uncertain",
  authenticityConfidence: 50,
  authenticityDetails: "Unable to perform detailed authentication analysis. Please consult a professional authenticator for high-value items.",
  authenticationTips: ["Check for brand markings and serial numbers", "Examine hardware quality and materials", "Compare with official product images", "Consult a professional authenticator for valuable items"],
  marketAnalysis: "Market analysis unavailable. Research comparable sold listings on eBay, Poshmark, and The RealReal to determine fair market value.",
  aspects: { Category: ["Fashion"], Condition: ["Good"] },
  ebayCategoryId: "1",
  wooCategory: "Fashion",
  platformVersions: {
    ebay: { title: "Designer Item Pre-Owned Good Condition", description: "<p>Pre-owned designer item in good condition. See photos for details.</p>", tags: ["designer", "luxury", "pre-owned"], suggestedPrice: 75 },
    poshmark: { title: "Designer item great find", description: "Pre-owned designer item in good condition! DM with questions.", tags: ["designer", "luxury", "preloved"], suggestedPrice: 75 },
    depop: { title: "vintage designer find", description: "pre-owned designer item good condition 📦 dm for measurements", tags: ["designer", "vintage", "preloved"], suggestedPrice: 65 },
    stripe: { title: "Pre-Owned Designer Item", description: "A pre-owned designer item in good overall condition.", tags: ["designer", "luxury", "resale"], suggestedPrice: 80 },
  },
  marketMatches: [],
};

function parseAnalysisResult(text: string): AnalysisResult {
  let parsed: Partial<AnalysisResult>;
  
  try {
    parsed = JSON.parse(text);
  } catch {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return FALLBACK_RESULT;
      }
    } catch {
      return FALLBACK_RESULT;
    }
  }

  // Merge with defaults for backward compatibility
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
    estimatedValueLow: typeof parsed.estimatedValueLow === 'number' ? parsed.estimatedValueLow : FALLBACK_RESULT.estimatedValueLow,
    estimatedValueHigh: typeof parsed.estimatedValueHigh === 'number' ? parsed.estimatedValueHigh : FALLBACK_RESULT.estimatedValueHigh,
    suggestedListPrice: typeof parsed.suggestedListPrice === 'number' ? parsed.suggestedListPrice : FALLBACK_RESULT.suggestedListPrice,
    confidence: parsed.confidence || FALLBACK_RESULT.confidence,
    authenticity: parsed.authenticity || FALLBACK_RESULT.authenticity,
    authenticityConfidence: typeof parsed.authenticityConfidence === 'number' ? parsed.authenticityConfidence : FALLBACK_RESULT.authenticityConfidence,
    authenticityDetails: parsed.authenticityDetails || FALLBACK_RESULT.authenticityDetails,
    authenticationTips: parsed.authenticationTips || FALLBACK_RESULT.authenticationTips,
    marketAnalysis: parsed.marketAnalysis || FALLBACK_RESULT.marketAnalysis,
    aspects: parsed.aspects || FALLBACK_RESULT.aspects,
    ebayCategoryId: parsed.ebayCategoryId || FALLBACK_RESULT.ebayCategoryId,
    wooCategory: parsed.wooCategory || FALLBACK_RESULT.wooCategory,
    platformVersions: parsed.platformVersions || FALLBACK_RESULT.platformVersions,
    marketMatches: parsed.marketMatches || FALLBACK_RESULT.marketMatches,
  };
}

const VALID_PROVIDERS = new Set(["gemini", "openai", "anthropic", "custom", "openfang"]);

function validateProvider(provider: string): provider is AIProviderType {
  return VALID_PROVIDERS.has(provider);
}

function validateCustomEndpoint(endpoint: string): void {
  let parsed: URL;
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
    "172.16.", "172.17.", "172.18.", "172.19.",
    "172.20.", "172.21.", "172.22.", "172.23.",
    "172.24.", "172.25.", "172.26.", "172.27.",
    "172.28.", "172.29.", "172.30.", "172.31.",
    "192.168.",
    "metadata.google",
    ".internal",
  ];

  for (const pattern of blockedPatterns) {
    if (hostname === pattern || hostname.startsWith(pattern) || hostname.endsWith(pattern)) {
      throw new Error("Custom endpoint cannot target private or internal network addresses");
    }
  }
}

async function analyzeWithGemini(
  images: ImageInput[],
  config: AIProviderConfig,
  prompt: string = ANALYSIS_PROMPT
): Promise<AnalysisResult> {
  const apiKey = config.apiKey || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is required");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion: config.apiKey ? "v1beta" : "",
      baseUrl: config.apiKey ? undefined : process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
    },
  });

  const parts: any[] = [{ text: prompt }];
  for (const img of images) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  }

  const response = await ai.models.generateContent({
    model: config.model || "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
    config: { responseMimeType: "application/json" },
  });

  return parseAnalysisResult(response.text || "");
}

async function analyzeWithHuggingFace(
  images: ImageInput[],
  config: AIProviderConfig,
  prompt: string = ANALYSIS_PROMPT
): Promise<AnalysisResult> {
  const endpoint = config.endpoint || process.env.HUGGINGFACE_CUSTOM_ENDPOINT;
  const apiKey = config.apiKey || process.env.HUGGINGFACE_API_KEY;

  if (!endpoint) {
    throw new Error("HuggingFace custom endpoint is required");
  }

  const content: any[] = [{ type: "text", text: prompt }];
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.data}` },
    });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model || "tgi",
      messages: [{ role: "user", content }],
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HuggingFace API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || data.generated_text || "";
  return parseAnalysisResult(text);
}

export async function analyzeWithFallback(
  images: ImageInput[],
  userConfig: AIProviderConfig,
  prompt: string = ANALYSIS_PROMPT
): Promise<AnalysisResult> {
  const fallbacks: AIProviderConfig[] = [
    userConfig, // Primary
    { 
      provider: "openfang", 
      apiKey: process.env.OPENFANG_API_KEY, 
      endpoint: process.env.OPENFANG_BASE_URL 
    },
    { 
      provider: "custom", // Used for HuggingFace via custom endpoint
      endpoint: process.env.HUGGINGFACE_CUSTOM_ENDPOINT,
      apiKey: process.env.HUGGINGFACE_API_KEY
    },
    { 
      provider: "gemini", 
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      endpoint: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL
    }
  ];

  let lastError: Error | null = null;

  for (const config of fallbacks) {
    try {
      if (config.provider === "custom" && !config.endpoint) continue;
      if (config.provider === "openfang" && (!config.apiKey || !config.endpoint)) continue;
      if (config.provider === "gemini" && !config.apiKey) continue;

      console.log(`Attempting analysis with provider: ${config.provider}`);
      const result = await analyzeItem(config, images, prompt);
      return result;
    } catch (error: any) {
      console.warn(`Provider ${config.provider} failed: ${error.message}`);
      lastError = error;
    }
  }

  throw lastError || new Error("All AI providers failed");
}

const CORRECTION_PROMPT = `You are a marketplace listing specialist. Review the following appraisal result and improve it. 
Catch any errors, enhance SEO fields (title, description, keywords), and ensure the formatting is perfect for marketplaces like eBay and WooCommerce.

## INITIAL APPRAISAL
{initialResult}

## YOUR TASK
- Review and refine the title and descriptions for maximum conversion
- Improve the SEO keywords and tags
- Double check if the category and suggested price seem reasonable
- Correct any obvious formatting issues

Respond ONLY with valid JSON following the same schema as the initial appraisal.`;

export async function correctAnalysis(
  initialResult: AnalysisResult,
  config: AIProviderConfig
): Promise<AnalysisResult> {
  const secondaryProvider = config.secondaryProvider || (process.env.OPENFANG_API_KEY ? "openfang" : null);
  
  if (!secondaryProvider) {
    console.log("No secondary provider configured for correction pass, skipping.");
    return initialResult;
  }

  const secondaryConfig: AIProviderConfig = {
    provider: secondaryProvider as AIProviderType,
    apiKey: config.secondaryApiKey || (secondaryProvider === "openfang" ? process.env.OPENFANG_API_KEY : process.env.HUGGINGFACE_API_KEY),
    endpoint: config.secondaryEndpoint || (secondaryProvider === "openfang" ? process.env.OPENFANG_BASE_URL : process.env.HUGGINGFACE_CUSTOM_ENDPOINT),
    model: config.secondaryModel
  };

  const prompt = CORRECTION_PROMPT.replace("{initialResult}", JSON.stringify(initialResult, null, 2));

  try {
    console.log(`Running correction pass with provider: ${secondaryConfig.provider}`);
    
    // We use a simplified text-only call for correction since images were already processed
    let text = "";
    if (secondaryConfig.provider === "openfang") {
      const baseUrl = (secondaryConfig.endpoint || "").replace(/\/+$/, "");
      const url = baseUrl.includes("/v1/chat/completions") ? baseUrl : `${baseUrl}/v1/chat/completions`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secondaryConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: secondaryConfig.model || "auto",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        text = data.choices?.[0]?.message?.content || "";
      }
    } else {
      // Fallback to custom endpoint (HuggingFace compatible)
      if (secondaryConfig.endpoint) {
        const response = await fetch(secondaryConfig.endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secondaryConfig.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          text = data.choices?.[0]?.message?.content || data.generated_text || "";
        }
      }
    }

    if (text) {
      return parseAnalysisResult(text);
    }
  } catch (error: any) {
    console.warn(`Correction pass failed: ${error.message}. Returning initial result.`);
  }

  return initialResult;
}

async function analyzeWithOpenAI(
  images: ImageInput[],
  config: AIProviderConfig,
  prompt: string = ANALYSIS_PROMPT
): Promise<AnalysisResult> {
  if (!config.apiKey) {
    throw new Error("OpenAI API key is required");
  }

  const content: any[] = [{ type: "text", text: prompt }];
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.data}` },
    });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model || "gpt-4o",
      messages: [{ role: "user", content }],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return parseAnalysisResult(text);
}

async function analyzeWithAnthropic(
  images: ImageInput[],
  config: AIProviderConfig,
  prompt: string = ANALYSIS_PROMPT
): Promise<AnalysisResult> {
  if (!config.apiKey) {
    throw new Error("Anthropic API key is required");
  }

  const content: any[] = [];
  for (const img of images) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mimeType,
        data: img.data,
      },
    });
  }
  content.push({ type: "text", text: prompt });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model || "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  return parseAnalysisResult(text);
}

async function analyzeWithOpenFang(
  images: ImageInput[],
  config: AIProviderConfig,
  prompt: string = ANALYSIS_PROMPT
): Promise<AnalysisResult> {
  const baseUrl = (config.endpoint || process.env.OPENFANG_BASE_URL || "").replace(/\/+$/, "");
  const apiKey = config.apiKey || process.env.OPENFANG_API_KEY || "";

  if (!baseUrl) {
    throw new Error("OpenFang base URL is required. Set OPENFANG_BASE_URL or configure in settings.");
  }
  if (!apiKey) {
    throw new Error("OpenFang API key is required. Set OPENFANG_API_KEY or configure in settings.");
  }

  const content: any[] = [{ type: "text", text: prompt }];
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.data}` },
    });
  }

  const url = baseUrl.includes("/v1/chat/completions")
    ? baseUrl
    : `${baseUrl}/v1/chat/completions`;

  const body: any = {
    model: config.model || "auto",
    messages: [{ role: "user", content }],
    response_format: { type: "json_object" },
    extra_body: {
      routing: {
        prefer: ["vision"],
        fallback: ["gpt-4o", "gemini-2.5-flash", "claude-sonnet-4-20250514"],
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenFang API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return parseAnalysisResult(text);
}

async function analyzeWithCustom(
  images: ImageInput[],
  config: AIProviderConfig,
  prompt: string = ANALYSIS_PROMPT
): Promise<AnalysisResult> {
  if (!config.endpoint) {
    throw new Error("Custom AI endpoint URL is required");
  }
  validateCustomEndpoint(config.endpoint);

  const content: any[] = [{ type: "text", text: prompt }];
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.data}` },
    });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const baseUrl = config.endpoint.replace(/\/+$/, "");
  const url = baseUrl.includes("/v1/chat/completions")
    ? baseUrl
    : `${baseUrl}/v1/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model || "default",
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Custom AI error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return parseAnalysisResult(text);
}

const SEO_GENERATION_PROMPT = `You are a marketplace listing specialist. Based on the provided item appraisal, generate a high-converting, search-optimized listing for eBay and WooCommerce.

## APPRAISAL DATA
{initialResult}

## YOUR TASK
Generate a polished SEO-ready listing including:
1. title: eBay-compliant title (max 80 chars), optimized with keywords (Brand, Model, Material, Size, Condition).
2. fullDescription: A rich, professional HTML description. Include a clear headline, condition details in bullet points, key features, and dimensions.
3. seoKeywords: 10+ relevant SEO keyword tags for search ranking.
4. aspects: Detailed item specifics (material, era, size, color, style).
5. ebayCategoryId: Suggest the most accurate eBay category ID.
6. wooCategory: Suggest the most appropriate WooCommerce category name.

Respond ONLY with valid JSON following the appraisal schema. Ensure the listing is persuasive and optimized for marketplace search algorithms.`;

export async function generateSEOListing(
  item: AnalysisResult,
  config: AIProviderConfig
): Promise<AnalysisResult> {
  const prompt = SEO_GENERATION_PROMPT.replace("{initialResult}", JSON.stringify(item, null, 2));
  
  // Use primary provider for SEO generation
  const seoConfig = { ...config };
  
  try {
    console.log(`Generating SEO listing with provider: ${seoConfig.provider}`);
    
    // Using analyzeItem but with a text-only prompt if possible, or just re-sending the same images if we had them.
    // However, the task says "call Gemini (or active provider) with a rich SEO-specific prompt".
    // Since we already have the analysis, we can do a text-to-text generation.
    
    let text = "";
    if (seoConfig.provider === "gemini") {
      const apiKey = seoConfig.apiKey || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
      const ai = new GoogleGenAI({
        apiKey: apiKey!,
        httpOptions: {
          apiVersion: seoConfig.apiKey ? "v1beta" : "",
          baseUrl: seoConfig.apiKey ? undefined : process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
        },
      });
      const response = await ai.models.generateContent({
        model: seoConfig.model || "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" },
      });
      text = response.text || "";
    } else if (seoConfig.provider === "openfang") {
      const baseUrl = (seoConfig.endpoint || process.env.OPENFANG_BASE_URL || "").replace(/\/+$/, "");
      const url = baseUrl.includes("/v1/chat/completions") ? baseUrl : `${baseUrl}/v1/chat/completions`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${seoConfig.apiKey || process.env.OPENFANG_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: seoConfig.model || "auto",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        text = data.choices?.[0]?.message?.content || "";
      }
    } else {
      // Generic fallback for other providers (OpenAI, Anthropic, Custom)
      // For brevity, we'll try a generic fetch if it's OpenAI-compatible
      const baseUrl = seoConfig.endpoint || (seoConfig.provider === "openai" ? "https://api.openai.com/v1/chat/completions" : "");
      if (baseUrl) {
        const response = await fetch(baseUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${seoConfig.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: seoConfig.model || "default",
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          text = data.choices?.[0]?.message?.content || "";
        }
      }
    }

    if (text) {
      let result = parseAnalysisResult(text);
      
      // If OpenFang is configured as secondary, run a secondary pass to refine further
      if (config.secondaryProvider === "openfang" || (!config.secondaryProvider && process.env.OPENFANG_API_KEY)) {
        console.log("Running OpenFang refinement pass for SEO...");
        result = await correctAnalysis(result, config);
      }
      
      return result;
    }
  } catch (error: any) {
    console.warn(`SEO generation failed: ${error.message}. Returning initial item.`);
  }

  return item;
}

export async function analyzeItem(
  config: AIProviderConfig,
  images: ImageInput[],
  prompt: string = ANALYSIS_PROMPT
): Promise<AnalysisResult> {
  switch (config.provider) {
    case "gemini":
      return analyzeWithGemini(images, config, prompt);
    case "openai":
      return analyzeWithOpenAI(images, config, prompt);
    case "anthropic":
      return analyzeWithAnthropic(images, config, prompt);
    case "custom":
      return analyzeWithCustom(images, config, prompt);
    case "openfang":
      return analyzeWithOpenFang(images, config, prompt);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}

const RETRY_PROMPT_TEMPLATE = `You are an expert appraiser re-evaluating an item based on seller feedback. Review the previous appraisal and the seller's concerns, then provide an updated assessment.

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

export async function analyzeItemWithRetry(
  config: AIProviderConfig,
  images: ImageInput[],
  previousResult: AnalysisResult,
  feedback: string
): Promise<AnalysisResult> {
  const retryPrompt = RETRY_PROMPT_TEMPLATE
    .replace("{previousReport}", JSON.stringify(previousResult, null, 2))
    .replace("{feedback}", feedback);

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

async function analyzeWithGeminiRetry(
  images: ImageInput[],
  config: AIProviderConfig,
  retryPrompt: string
): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({
    apiKey: config.apiKey || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
    httpOptions: {
      apiVersion: config.apiKey ? "v1beta" : "",
      baseUrl: config.apiKey ? undefined : process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
    },
  });

  const parts: any[] = [{ text: retryPrompt }];
  for (const img of images) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  }

  const response = await ai.models.generateContent({
    model: config.model || "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
    config: { responseMimeType: "application/json" },
  });

  return parseAnalysisResult(response.text || "");
}

async function analyzeWithOpenAIRetry(
  images: ImageInput[],
  config: AIProviderConfig,
  retryPrompt: string
): Promise<AnalysisResult> {
  if (!config.apiKey) {
    throw new Error("OpenAI API key is required");
  }

  const content: any[] = [{ type: "text", text: retryPrompt }];
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.data}` },
    });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model || "gpt-4o",
      messages: [{ role: "user", content }],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return parseAnalysisResult(text);
}

async function analyzeWithAnthropicRetry(
  images: ImageInput[],
  config: AIProviderConfig,
  retryPrompt: string
): Promise<AnalysisResult> {
  if (!config.apiKey) {
    throw new Error("Anthropic API key is required");
  }

  const content: any[] = [];
  for (const img of images) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mimeType,
        data: img.data,
      },
    });
  }
  content.push({ type: "text", text: retryPrompt });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model || "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  return parseAnalysisResult(text);
}

async function analyzeWithOpenFangRetry(
  images: ImageInput[],
  config: AIProviderConfig,
  retryPrompt: string
): Promise<AnalysisResult> {
  const baseUrl = (config.endpoint || process.env.OPENFANG_BASE_URL || "").replace(/\/+$/, "");
  const apiKey = config.apiKey || process.env.OPENFANG_API_KEY || "";

  if (!baseUrl) {
    throw new Error("OpenFang base URL is required. Set OPENFANG_BASE_URL or configure in settings.");
  }
  if (!apiKey) {
    throw new Error("OpenFang API key is required. Set OPENFANG_API_KEY or configure in settings.");
  }

  const content: any[] = [{ type: "text", text: retryPrompt }];
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.data}` },
    });
  }

  const url = baseUrl.includes("/v1/chat/completions")
    ? baseUrl
    : `${baseUrl}/v1/chat/completions`;

  const body: any = {
    model: config.model || "auto",
    messages: [{ role: "user", content }],
    response_format: { type: "json_object" },
    extra_body: {
      routing: {
        prefer: ["vision"],
        fallback: ["gpt-4o", "gemini-2.5-flash", "claude-sonnet-4-20250514"],
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenFang API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return parseAnalysisResult(text);
}

async function analyzeWithCustomRetry(
  images: ImageInput[],
  config: AIProviderConfig,
  retryPrompt: string
): Promise<AnalysisResult> {
  if (!config.endpoint) {
    throw new Error("Custom AI endpoint URL is required");
  }
  validateCustomEndpoint(config.endpoint);

  const content: any[] = [{ type: "text", text: retryPrompt }];
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.data}` },
    });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const baseUrl = config.endpoint.replace(/\/+$/, "");
  const url = baseUrl.includes("/v1/chat/completions")
    ? baseUrl
    : `${baseUrl}/v1/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model || "default",
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Custom AI error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return parseAnalysisResult(text);
}

export async function testProviderConnection(
  config: AIProviderConfig
): Promise<{ success: boolean; message: string }> {
  try {
    switch (config.provider) {
      case "gemini": {
        const ai = new GoogleGenAI({
          apiKey: config.apiKey || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
          httpOptions: {
            apiVersion: config.apiKey ? "v1beta" : "",
            baseUrl: config.apiKey ? undefined : process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
          },
        });
        const response = await ai.models.generateContent({
          model: config.model || "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: "Reply with: OK" }] }],
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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.model || "gpt-4o",
            messages: [{ role: "user", content: "Reply with: OK" }],
            max_tokens: 5,
          }),
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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.model || "claude-sonnet-4-20250514",
            max_tokens: 10,
            messages: [{ role: "user", content: "Reply with: OK" }],
          }),
        });
        if (response.ok) return { success: true, message: "Anthropic connection successful" };
        const error = await response.json().catch(() => ({}));
        return { success: false, message: error.error?.message || `Anthropic error: ${response.status}` };
      }

      case "custom": {
        if (!config.endpoint) return { success: false, message: "Custom endpoint URL is required" };
        validateCustomEndpoint(config.endpoint);
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;
        const baseUrl = config.endpoint.replace(/\/+$/, "");
        const url = baseUrl.includes("/v1/chat/completions")
          ? baseUrl
          : `${baseUrl}/v1/chat/completions`;
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: config.model || "default",
            messages: [{ role: "user", content: "Reply with: OK" }],
            max_tokens: 5,
          }),
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
        const ofUrl = ofBaseUrl.includes("/v1/chat/completions")
          ? ofBaseUrl
          : `${ofBaseUrl}/v1/chat/completions`;
        const response = await fetch(ofUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ofApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.model || "auto",
            messages: [{ role: "user", content: "Reply with: OK" }],
            max_tokens: 5,
          }),
        });
        if (response.ok) return { success: true, message: "OpenFang connection successful" };
        const error = await response.json().catch(() => ({}));
        return { success: false, message: error.error?.message || `OpenFang error: ${response.status}` };
      }

      default:
        return { success: false, message: `Unsupported provider: ${config.provider}` };
    }
  } catch (error: any) {
    return { success: false, message: error.message || "Connection test failed" };
  }
}

// ---------------------------------------------------------------------------
// Craft & Strategy Studio — Gift Set Generation + Shop Strategy Analysis
// ---------------------------------------------------------------------------

export interface AIAnalysisSnapshot {
  estimatedValueHigh?: number;
  estimatedValueLow?: number;
  suggestedListPrice?: number;
  brand?: string;
  confidence?: string;
  marketAnalysis?: string;
}

export interface StashItemSummary {
  id: number;
  title: string;
  category: string | null;
  estimatedValue: string | null;
  estimatedValueHigh?: number;
  suggestedListPrice?: number;
  fullImageUrl: string | null;
  itemType: string | null;
  brand?: string;
  condition?: string;
}

export interface GeneratedGiftSet {
  tier: "Budget" | "Starter" | "Core" | "Premium" | "Ultimate";
  title: string;
  description: string;
  marketingHook: string;
  itemIds: number[];
  totalValue: number;
  sellingPrice: number;
}

const GIFT_SET_PROMPT_TEMPLATE = `You are Emma, a luxury resale and artisan shop strategist. You are looking at a seller's current inventory and must create 5 gift bundle tiers that make commercial sense. Bundle items that complement each other logically — by brand family, aesthetic, category, or use case.

## INVENTORY
{inventory}

## YOUR TASK
Create exactly 5 gift set tiers. Each tier must group 2-5 items that make sense together. A single high-value item can be its own tier set (e.g. Ultimate = one exceptional designer piece).

Tiers (from accessible to premium):
1. Budget — under $100 total selling price
2. Starter — $100-$250 total selling price
3. Core — $250-$500 total selling price
4. Premium — $500-$1000 total selling price
5. Ultimate — $1000+ total selling price (best items, max luxury/artisan impact)

Rules:
- Each item can only appear in ONE tier
- Only use item IDs that exist in the inventory list above
- sellingPrice should be 5-15% less than totalValue (bundle discount incentive)
- If inventory is too small to fill all 5 tiers meaningfully, use fewer items per tier or repeat categories with the best matches
- marketingHook: 1 punchy sentence for marketing copy (benefit-led, not price-led)
- description: 2-3 sentences describing the experience of the bundle

Respond ONLY with a valid JSON array of exactly 5 objects:
[
  {
    "tier": "Budget",
    "title": "...",
    "description": "...",
    "marketingHook": "...",
    "itemIds": [1, 5],
    "totalValue": 85,
    "sellingPrice": 75
  },
  ...
]`;

export async function generateGiftSets(
  stashItems: StashItemSummary[]
): Promise<GeneratedGiftSet[]> {
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is required for gift set generation");
  }

  const inventoryText = stashItems
    .map((item) => {
      const price = item.suggestedListPrice || item.estimatedValueHigh
        || (() => {
          const match = item.estimatedValue?.match(/\$?(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })();
      return `- ID:${item.id} | "${item.title}" | ${item.category || "Item"} | ${item.itemType === "handmade" ? "Handmade" : "Designer"} | $${price}`;
    })
    .join("\n");

  const prompt = GIFT_SET_PROMPT_TEMPLATE.replace("{inventory}", inventoryText);

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "v1beta" },
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json" },
  });

  const text = response.text || "[]";
  let parsed: GeneratedGiftSet[];
  try {
    parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Not an array");
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error("Failed to parse gift sets from Emma's response");
    }
  }

  return parsed.slice(0, 5);
}

const STRATEGY_PROMPT_TEMPLATE = `You are Emma, a seasoned shop strategy advisor for a designer resale and handmade artisan goods boutique. You have access to the seller's live inventory below and must answer their question with specific, actionable insights.

## SELLER'S INVENTORY SNAPSHOT
{inventory}

## SELLER'S QUESTION
{question}

## YOUR RESPONSE FORMAT
- Use markdown formatting: **bold** for emphasis, ## for section headers, - for bullet points
- Reference actual item names and prices from the inventory where relevant
- Be specific and actionable — no generic advice
- Keep response focused and structured (max 400 words)
- Avoid generic platitudes. Emma speaks like a trusted advisor who knows this specific shop.

Important context:
- This shop sells designer/luxury resale items AND handmade artisan goods (candles, body butters, soaps, etc.)
- Never use "vintage," "antique," or "collectible" language
- Handmade pricing formula: COG × 3-5× depending on category and ingredient quality
- Designer resale: pricing driven by brand, condition, and current secondary market demand`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StashContext {
  itemCount: number;
  totalEstimatedValue: number;
  topItems: StashItemSummary[];
}

const EMMA_SYSTEM_CONTEXT = `You are Emma, an expert AI assistant for a designer resale and handmade artisan goods boutique. You help the seller with pricing, copywriting, strategy, and inventory decisions.

Key facts about this shop:
- Sells designer/luxury resale items (handbags, shoes, jewelry, accessories) AND handmade artisan goods (candles, body butters, soaps, bath products)
- Never describe items as "vintage," "antique," or "collectible" — use "pre-owned," "pre-loved," or "gently used" instead
- Handmade pricing: COG × 3-5× depending on category and ingredient quality
- Designer resale: pricing driven by brand, condition, and secondary market demand on eBay, Poshmark, Depop, The RealReal

Your style:
- Friendly, confident, and specific — like a trusted advisor who knows this shop personally
- Reference the seller's actual inventory when relevant
- Give actionable answers, not generic platitudes
- Use markdown formatting: **bold** for key points, bullet lists for steps
- Keep responses concise (under 300 words unless depth is truly needed)`;

export async function emmaChatStream(
  messages: ChatMessage[],
  stashContext: StashContext,
  onChunk: (chunk: string) => void
): Promise<string> {
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is required for Emma chat");
  }

  const contextMessage = `${EMMA_SYSTEM_CONTEXT}

## SELLER'S CURRENT STASH
- Total items: ${stashContext.itemCount}
- Combined estimated value: $${stashContext.totalEstimatedValue.toFixed(0)}
${stashContext.topItems.length > 0
    ? `- Recent inventory:\n${stashContext.topItems.map((item) => {
      const price = item.suggestedListPrice || item.estimatedValueHigh || (() => {
        const m = item.estimatedValue?.match(/\$?(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      })();
      return `  • "${item.title}" (${item.category || "Item"}, ${item.itemType === "handmade" ? "Handmade" : "Designer"}, $${price})`;
    }).join("\n")}`
    : ""}

Now answer the seller's question.`;

  const geminiContents = [
    { role: "user" as const, parts: [{ text: contextMessage }] },
    { role: "model" as const, parts: [{ text: "Got it! I have full context about your stash. How can I help you today?" }] },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    })),
  ];

  const gemini = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "v1beta" },
  });

  const stream = await gemini.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: geminiContents,
  });

  let fullText = "";
  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) {
      fullText += text;
      onChunk(text);
    }
  }
  return fullText || "I wasn't able to respond just now — please try again.";
}

export async function analyzeShopStrategy(
  stashItems: StashItemSummary[],
  question: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is required for shop strategy");
  }

  const inventoryText = stashItems
    .map((item) => {
      const price = item.suggestedListPrice || item.estimatedValueHigh
        || (() => {
          const match = item.estimatedValue?.match(/\$?(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })();
      return `- "${item.title}" (${item.category || "Item"}, ${item.itemType === "handmade" ? "Handmade" : "Designer"}, $${price}, ${item.condition || "Unknown condition"})`;
    })
    .join("\n");

  const prompt = STRATEGY_PROMPT_TEMPLATE
    .replace("{inventory}", inventoryText)
    .replace("{question}", question);

  const gemini = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "v1beta" },
  });

  // When a streaming callback is provided, use generateContentStream
  if (onChunk) {
    const stream = await gemini.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    let fullText = "";
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(text);
      }
    }
    return fullText || "Emma was unable to analyze your shop at this time. Please try again.";
  }

  // Non-streaming fallback
  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return response.text || "Emma was unable to analyze your shop at this time. Please try again.";
}
