import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "./db";
import { articles, stashItems } from "@shared/schema";
import { eq, desc, count } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";

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

  const httpServer = createServer(app);
  return httpServer;
}
