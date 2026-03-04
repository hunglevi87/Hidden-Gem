import { GoogleGenAI } from "@google/genai";

export type AIProviderType = "gemini" | "openai" | "anthropic" | "custom";

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey?: string;
  endpoint?: string;
  model?: string;
}

export interface AnalysisResult {
  title: string;
  description: string;
  category: string;
  estimatedValue: string;
  condition: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  tags: string[];
}

interface ImageInput {
  mimeType: string;
  data: string;
}

const ANALYSIS_PROMPT = `You are an expert appraiser and reseller assistant. Analyze this collectible/vintage item and provide a detailed assessment.

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

const FALLBACK_RESULT: AnalysisResult = {
  title: "Vintage Item",
  description: "A vintage collectible item in good condition.",
  category: "Collectible",
  estimatedValue: "$50-$100",
  condition: "Good",
  seoTitle: "Vintage Collectible Item for Sale",
  seoDescription: "Authentic vintage collectible in excellent condition. Perfect for collectors.",
  seoKeywords: ["vintage", "collectible", "antique"],
  tags: ["vintage", "collectible"],
};

function parseAnalysisResult(text: string): AnalysisResult {
  try {
    return JSON.parse(text) as AnalysisResult;
  } catch {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as AnalysisResult;
      }
    } catch {}
    return FALLBACK_RESULT;
  }
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
