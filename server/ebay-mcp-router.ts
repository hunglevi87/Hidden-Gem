import { Router, type Request, type Response } from "express";
import {
  getAccessToken,
  updateEbayListing,
  updateListingPrice,
  createInventoryItem,
  createOffer,
  publishOffer,
  makeOffer,
  type EbayCredentials,
} from "./ebay-service";

const router = Router();

function authGuard(req: Request, res: Response): boolean {
  const token = process.env.EBAY_MCP_API_KEY;
  if (!token) return true;

  const header = req.headers.authorization ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : header;

  if (provided !== token) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return false;
  }
  return true;
}

function extractCreds(context: Record<string, unknown>): EbayCredentials {
  return {
    clientId: String(context.clientId ?? process.env.EBAY_CLIENT_ID ?? ""),
    clientSecret: String(
      context.clientSecret ?? process.env.EBAY_CLIENT_SECRET ?? "",
    ),
    refreshToken: String(
      context.refreshToken ?? process.env.EBAY_USER_REFRESH_TOKEN ?? "",
    ),
    environment: String(
      context.environment ?? process.env.EBAY_ENVIRONMENT ?? "production",
    ) as "sandbox" | "production",
  };
}

router.post("/:action", async (req: Request, res: Response) => {
  if (!authGuard(req, res)) return;

  const { action } = req.params;
  const { payload = {}, context = {} } = req.body as {
    action?: string;
    payload: Record<string, unknown>;
    context: Record<string, unknown>;
  };

  try {
    const creds = extractCreds(context);
    const marketplaceId = String(
      context.marketplaceId ?? process.env.EBAY_MARKETPLACE_ID ?? "EBAY_US",
    );
    const contentLanguage = String(
      context.contentLanguage ??
        process.env.EBAY_CONTENT_LANGUAGE ??
        "en-US",
    );

    if (action === "publish") {
      const sku = String(payload.sku ?? "");
      const template = (payload.listingTemplate ?? {}) as Record<
        string,
        unknown
      >;

      await createInventoryItem(creds, {
        sku,
        title: String(template.title ?? sku),
        description: String(template.description ?? ""),
        condition:
          (template.condition as
            | "NEW"
            | "LIKE_NEW"
            | "GOOD"
            | "ACCEPTABLE") ?? "GOOD",
        quantity: Number(template.quantity ?? 1),
        price: Number(template.price ?? 0),
        currency: String(template.currency ?? "USD"),
        imageUrls: Array.isArray(template.imageUrls)
          ? (template.imageUrls as string[])
          : [],
        categoryId: template.categoryId
          ? String(template.categoryId)
          : undefined,
      });

      const { offerId } = await createOffer(creds, {
        sku,
        marketplaceId,
        categoryId: String(template.categoryId ?? "1"),
        price: Number(template.price ?? 0),
        currency: String(template.currency ?? "USD"),
        quantity: Number(template.quantity ?? 1),
        contentLanguage,
        listingDescription: String(template.description ?? ""),
      });

      const { listingId } = await publishOffer(creds, offerId);

      return res.json({
        success: true,
        status: "done",
        message: "Listing published",
        data: { listingId, offerId, sku },
      });
    }

    if (action === "update") {
      const listingId = String(payload.listingId ?? "");
      const patch = (payload.patch ?? {}) as Record<string, unknown>;
      const result = await updateEbayListing(creds, listingId, patch);
      return res.json({
        success: result.status === "success",
        status: result.status === "success" ? "done" : "failed",
        message: result.message,
        data: result,
      });
    }

    if (action === "offer") {
      const listingId = String(payload.listingId ?? "");
      const offerAmount = Number(payload.offerAmount ?? 0);
      const currency = String(payload.currency ?? "USD");
      const message = payload.message ? String(payload.message) : undefined;
      const result = await makeOffer(
        creds,
        listingId,
        offerAmount,
        currency,
        message,
      );
      return res.json({
        success: result.success,
        status: "done",
        message: "Offer submitted",
        data: result,
      });
    }

    if (action === "reprice") {
      const listingId = String(payload.listingId ?? "");
      const newPrice = Number(payload.newPrice ?? 0);
      const currency = String(payload.currency ?? "USD");
      const result = await updateListingPrice(
        creds,
        listingId,
        String(newPrice),
        currency,
      );
      return res.json({
        success: result.success,
        status: "done",
        message: result.message,
        data: result,
      });
    }

    return res.status(400).json({
      success: false,
      status: "failed",
      message: `Unknown action: ${action}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      status: "failed",
      message,
      errorCode: "MCP_ACTION_ERROR",
    });
  }
});

export { router as ebayMcpRouter };
