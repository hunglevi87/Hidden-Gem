/**
 * AI SEO module — ported from FlipAgent's packages/api/src/ai/gemini.ts
 *
 * Provides standalone SEO generation functions that work with any analysis
 * result (Gemini, OpenAI, Anthropic, Custom) and an AI audit trail writer.
 *
 * - generateSEOTitle()   — 80-char eBay-compliant title
 * - generateDescription() — formatted listing body
 * - generateTags()        — SEO tag array
 * - createAIRecord()      — persists to ai_generations table
 */

import { db } from "./db";
import { aiGenerations } from "@shared/schema";
import type { GeminiAnalysisResult } from "@shared/types";

/**
 * Build an eBay-compliant SEO title from an analysis result.
 * Enforces the 80-character limit.
 */
export function generateSEOTitle(analysis: GeminiAnalysisResult): string {
  const parts = [
    analysis.brand,
    analysis.style_name || analysis.category,
    analysis.color ? `${analysis.color}` : "",
    analysis.size ? `Size ${analysis.size}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return parts.substring(0, 80);
}

/**
 * Produce a formatted marketplace listing description from the analysis.
 */
export function generateDescription(analysis: GeminiAnalysisResult): string {
  return `
**Condition:** ${analysis.condition}
**Brand:** ${analysis.brand || "Curated Collection"}
**Category:** ${analysis.category}
**Material:** ${analysis.material || "Premium"}
**Color:** ${analysis.color || "See Images"}
**Dimensions:** ${analysis.size || "See Details"}

**Distinguishing Features:**
${(analysis.features || []).map((f) => `• ${f}`).join("\n")}

**Market Value:** $${analysis.estimated_resale_value || "Inquire for Offer"}

${analysis.authenticity_notes ? `\n**Authentication Notes:** ${analysis.authenticity_notes}` : ""}

*Each piece in our collection is carefully curated and authenticated. We stand behind every item.*
  `.trim();
}

/**
 * Build an SEO tag array from the analysis (brand, category, color, etc.).
 */
export function generateTags(analysis: GeminiAnalysisResult): string[] {
  return [
    analysis.brand || "",
    analysis.category || "",
    analysis.color || "",
    analysis.style_name || "",
    analysis.condition
      ? `${analysis.condition.toLowerCase()}-condition`
      : "",
    analysis.material || "",
    "luxury",
    "curated",
    ...((analysis.features || []) as string[]),
  ].filter(Boolean);
}

/**
 * Persist an AI generation record to the `ai_generations` table.
 * Logs the model, cost estimate, quality heuristic, and the full output.
 */
export async function createAIRecord({
  sellerId,
  productId,
  imageUrl,
  analysis,
}: {
  sellerId: string;
  productId?: string;
  imageUrl: string;
  analysis: GeminiAnalysisResult;
}): Promise<string> {
  const [record] = await db
    .insert(aiGenerations)
    .values({
      sellerId,
      productId: productId ?? null,
      inputImageUrl: imageUrl,
      modelUsed: "gemini-1.5-pro",
      outputListing: {
        title: generateSEOTitle(analysis),
        description: generateDescription(analysis),
        tags: generateTags(analysis),
        analysis,
      },
      tokensUsed: Math.ceil(JSON.stringify(analysis).length / 4),
      cost: "0.003", // rough estimate as string for numeric column
      qualityScore: analysis.brand ? "0.90" : "0.70",
    })
    .returning();

  return record.id;
}
