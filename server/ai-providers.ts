import { GoogleGenAI } from "@google/genai";

export type AIProviderType = "gemini" | "openai" | "anthropic" | "custom";

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey?: string;
  endpoint?: string;
  model?: string;
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
}

interface ImageInput {
  mimeType: string;
  data: string;
}

const ANALYSIS_PROMPT = `You are an expert appraiser, authenticator, and reseller assistant with deep knowledge of vintage items, luxury goods, and collectibles. Analyze the provided images (full item + label/tag) and deliver a comprehensive professional appraisal report.

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

const FALLBACK_RESULT: AnalysisResult = {
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
  wooCategory: "Collectibles",
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
  };
}

const VALID_PROVIDERS = new Set(["gemini", "openai", "anthropic", "custom"]);

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
  config: AIProviderConfig
): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({
    apiKey: config.apiKey || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
    httpOptions: {
      apiVersion: config.apiKey ? "v1beta" : "",
      baseUrl: config.apiKey ? undefined : process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
    },
  });

  const parts: any[] = [{ text: ANALYSIS_PROMPT }];
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

async function analyzeWithOpenAI(
  images: ImageInput[],
  config: AIProviderConfig
): Promise<AnalysisResult> {
  if (!config.apiKey) {
    throw new Error("OpenAI API key is required");
  }

  const content: any[] = [{ type: "text", text: ANALYSIS_PROMPT }];
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
  config: AIProviderConfig
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
  content.push({ type: "text", text: ANALYSIS_PROMPT });

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

async function analyzeWithCustom(
  images: ImageInput[],
  config: AIProviderConfig
): Promise<AnalysisResult> {
  if (!config.endpoint) {
    throw new Error("Custom AI endpoint URL is required");
  }
  validateCustomEndpoint(config.endpoint);

  const content: any[] = [{ type: "text", text: ANALYSIS_PROMPT }];
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

export async function analyzeItem(
  config: AIProviderConfig,
  images: ImageInput[]
): Promise<AnalysisResult> {
  switch (config.provider) {
    case "gemini":
      return analyzeWithGemini(images, config);
    case "openai":
      return analyzeWithOpenAI(images, config);
    case "anthropic":
      return analyzeWithAnthropic(images, config);
    case "custom":
      return analyzeWithCustom(images, config);
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

      default:
        return { success: false, message: `Unsupported provider: ${config.provider}` };
    }
  } catch (error: any) {
    return { success: false, message: error.message || "Connection test failed" };
  }
}
