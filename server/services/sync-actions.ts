/**
 * Sync Queue Action Handlers
 *
 * Each handler executes a single marketplace action and returns a uniform result.
 * Handlers are pure-ish functions that take the job row + integration credentials
 * and return { success, marketplaceId?, error?, rawResponse? }.
 *
 * eBay handlers delegate to server/ebay-service.ts.
 * WooCommerce handlers use the WooCommerce REST API directly.
 */

import {
  getAccessToken,
  refreshEbayAccessToken,
  updateEbayListing,
  deleteEbayListing,
  mapCategoryToEbay,
  type EbayCredentials,
} from "../ebay-service";
import { db } from "../db";
import { integrations } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { SyncQueueItem, Integration, Product } from "@shared/schema";

// -------------------------------------------------------------------------
// Shared types
// -------------------------------------------------------------------------

export interface ActionResult {
  success: boolean;
  marketplaceId?: string;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

export interface JobContext {
  job: SyncQueueItem;
  product: Product;
  integration: Integration;
}

// -------------------------------------------------------------------------
// Token lifecycle — refresh eBay token if about to expire
// -------------------------------------------------------------------------

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export async function ensureFreshEbayToken(
  integration: Integration,
): Promise<EbayCredentials> {
  const creds = integration.credentials as Record<string, string>;
  const ebayEnv =
    (creds.environment as "sandbox" | "production") ?? "sandbox";

  const ebayCredentials: EbayCredentials = {
    clientId: creds.clientId || creds.client_id || "",
    clientSecret: creds.clientSecret || creds.client_secret || "",
    refreshToken: integration.refreshToken || creds.refreshToken || creds.refresh_token || "",
    environment: ebayEnv,
  };

  // Check if token is about to expire
  const expiresAt = integration.tokenExpiresAt
    ? new Date(integration.tokenExpiresAt).getTime()
    : 0;
  const now = Date.now();

  if (expiresAt > 0 && expiresAt - now > TOKEN_REFRESH_BUFFER_MS) {
    // Token still valid — use existing access token
    return ebayCredentials;
  }

  // Token expired or about to expire — refresh
  console.log(
    `[sync-worker] Refreshing eBay token for integration ${integration.id}`,
  );
  try {
    const tokens = await refreshEbayAccessToken(ebayCredentials);
    // Persist refreshed tokens
    await db
      .update(integrations)
      .set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: new Date(tokens.expiresAt),
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, integration.id));

    return {
      ...ebayCredentials,
      refreshToken: tokens.refreshToken,
    };
  } catch (err) {
    console.error("[sync-worker] eBay token refresh failed:", err);
    // Fall through with existing creds — the action itself will fail
    // with a clear auth error if the token is truly expired
    return ebayCredentials;
  }
}

// -------------------------------------------------------------------------
// eBay actions
// -------------------------------------------------------------------------

export async function executeEbayCreate(
  ctx: JobContext,
): Promise<ActionResult> {
  const { job, product, integration } = ctx;
  const payload = (job.payload ?? {}) as Record<string, unknown>;

  try {
    const creds = await ensureFreshEbayToken(integration);
    const accessToken = await getAccessToken(creds);
    const baseUrl =
      creds.environment === "production"
        ? "https://api.ebay.com"
        : "https://api.sandbox.ebay.com";

    const sku =
      (payload.sku as string) || product.sku || `HG-${product.id}-${Date.now()}`;
    const price =
      (payload.price as string) || product.price?.toString() || "9.99";
    const title =
      (payload.title as string) || product.title.substring(0, 80);
    const description =
      (payload.description as string) || product.description || product.title;
    const images = product.images as Record<string, unknown> | null;
    const primaryImage = images?.primary as string | undefined;
    const galleryImages = (images?.gallery as string[]) ?? [];
    const imageUrls = primaryImage
      ? [primaryImage, ...galleryImages]
      : galleryImages;

    const conditionMap: Record<string, string> = {
      new: "NEW",
      "like-new": "LIKE_NEW",
      excellent: "VERY_GOOD",
      good: "GOOD",
      fair: "ACCEPTABLE",
    };
    const ebayCondition = conditionMap[product.condition ?? "good"] || "GOOD";
    const categoryId =
      (payload.categoryId as string) || mapCategoryToEbay(product.category);

    // Step 1: Create inventory item
    const inventoryItem = {
      availability: { shipToLocationAvailability: { quantity: 1 } },
      condition: ebayCondition,
      product: {
        title,
        description: `<p>${description}</p>`,
        imageUrls,
      },
    };

    const invRes = await fetch(
      `${baseUrl}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US",
        },
        body: JSON.stringify(inventoryItem),
      },
    );

    if (!invRes.ok && invRes.status !== 204) {
      const errBody = await invRes.json().catch(() => ({}));
      return {
        success: false,
        error:
          (errBody as Record<string, unknown[]>).errors?.[0]?.toString() ||
          `eBay inventory error: ${invRes.status}`,
        rawResponse: errBody as Record<string, unknown>,
      };
    }

    // Step 2: Create offer
    const offer = {
      sku,
      marketplaceId: "EBAY_US",
      format: "FIXED_PRICE",
      availableQuantity: (payload.quantity as number) || 1,
      categoryId,
      listingDescription: `<p>${description}</p>`,
      pricingSummary: {
        price: { currency: "USD", value: price },
      },
      merchantLocationKey: (payload.merchantLocationKey as string) || "DEFAULT",
    };

    const offerRes = await fetch(
      `${baseUrl}/sell/inventory/v1/offer`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US",
        },
        body: JSON.stringify(offer),
      },
    );

    if (!offerRes.ok && offerRes.status !== 201) {
      const errBody = await offerRes.json().catch(() => ({}));
      return {
        success: false,
        error:
          (errBody as Record<string, unknown[]>).errors?.[0]?.toString() ||
          `eBay offer error: ${offerRes.status}`,
        rawResponse: errBody as Record<string, unknown>,
      };
    }

    const offerData = (await offerRes.json()) as { offerId: string };
    const offerId = offerData.offerId;

    // Step 3: Publish the offer
    const publishRes = await fetch(
      `${baseUrl}/sell/inventory/v1/offer/${offerId}/publish`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    let listingId: string | undefined;
    if (publishRes.ok) {
      const pubData = (await publishRes.json()) as { listingId?: string };
      listingId = pubData.listingId;
    }

    return {
      success: true,
      marketplaceId: listingId || offerId,
      rawResponse: { offerId, listingId, sku },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown eBay create error",
    };
  }
}

export async function executeEbayUpdate(
  ctx: JobContext,
): Promise<ActionResult> {
  const { job, integration } = ctx;
  const payload = (job.payload ?? {}) as Record<string, unknown>;

  try {
    const creds = await ensureFreshEbayToken(integration);
    const itemId = (payload.itemId as string) || (payload.marketplaceId as string);
    if (!itemId) {
      return { success: false, error: "No eBay itemId in payload" };
    }

    const result = await updateEbayListing(creds, itemId, payload);
    return {
      success: result.status === "success",
      marketplaceId: result.itemId,
      error: result.status === "error" ? result.message : undefined,
      rawResponse: result as unknown as Record<string, unknown>,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown eBay update error",
    };
  }
}

export async function executeEbayDelete(
  ctx: JobContext,
): Promise<ActionResult> {
  const { job, integration } = ctx;
  const payload = (job.payload ?? {}) as Record<string, unknown>;

  try {
    const creds = await ensureFreshEbayToken(integration);
    const itemId = (payload.itemId as string) || (payload.marketplaceId as string);
    if (!itemId) {
      return { success: false, error: "No eBay itemId in payload" };
    }

    const result = await deleteEbayListing(creds, itemId);
    return {
      success: result.status === "success",
      marketplaceId: result.itemId,
      error: result.status === "error" ? result.message : undefined,
      rawResponse: result as unknown as Record<string, unknown>,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown eBay delete error",
    };
  }
}

/**
 * Placeholder for P2 eBay MCP valuation check.
 * Logs the request and completes successfully so the queue doesn't retry.
 */
export async function executeEbayValueCheck(
  ctx: JobContext,
): Promise<ActionResult> {
  const { job, product } = ctx;
  console.log(
    `[sync-worker] ebay_value_check stub for product ${product.id} (job ${job.id})`,
  );
  return {
    success: true,
    rawResponse: {
      stub: true,
      message: "eBay value check not yet implemented — awaiting P2 eBay-MCP integration",
      productId: product.id,
    },
  };
}

// -------------------------------------------------------------------------
// WooCommerce actions
// -------------------------------------------------------------------------

function buildWooAuth(integration: Integration): {
  storeUrl: string;
  credentials: string;
} {
  const creds = integration.credentials as Record<string, string>;
  const storeUrl =
    creds.storeUrl || creds.store_url || creds.woocommerce_url || "";
  const consumerKey =
    creds.consumerKey || creds.consumer_key || creds.woocommerce_key || "";
  const consumerSecret =
    creds.consumerSecret ||
    creds.consumer_secret ||
    creds.woocommerce_secret ||
    "";

  return {
    storeUrl: storeUrl.replace(/\/+$/, ""),
    credentials: Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
      "base64",
    ),
  };
}

export async function executeWooCreate(
  ctx: JobContext,
): Promise<ActionResult> {
  const { job, product, integration } = ctx;
  const payload = (job.payload ?? {}) as Record<string, unknown>;

  try {
    const { storeUrl, credentials } = buildWooAuth(integration);
    if (!storeUrl) {
      return { success: false, error: "No WooCommerce store URL in integration credentials" };
    }

    const images = product.images as Record<string, unknown> | null;
    const primaryImage = images?.primary as string | undefined;

    const productData = {
      name: (payload.title as string) || product.title,
      type: "simple",
      regular_price:
        (payload.price as string) || product.price?.toString() || "0",
      description:
        (payload.description as string) || product.description || "",
      short_description:
        product.description?.substring(0, 200) || "",
      categories: [] as unknown[],
      images: primaryImage ? [{ src: primaryImage }] : [],
      status: "publish",
      sku: product.sku,
    };

    const res = await fetch(`${storeUrl}/wp-json/wc/v3/products`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(productData),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error:
          (errBody as Record<string, string>).message ||
          `WooCommerce error: ${res.status}`,
        rawResponse: errBody as Record<string, unknown>,
      };
    }

    const wooProduct = (await res.json()) as { id: number; permalink?: string };
    return {
      success: true,
      marketplaceId: String(wooProduct.id),
      rawResponse: {
        id: wooProduct.id,
        permalink: wooProduct.permalink,
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Unknown WooCommerce create error",
    };
  }
}

export async function executeWooUpdate(
  ctx: JobContext,
): Promise<ActionResult> {
  const { job, product, integration } = ctx;
  const payload = (job.payload ?? {}) as Record<string, unknown>;

  try {
    const { storeUrl, credentials } = buildWooAuth(integration);
    const wooProductId =
      (payload.marketplaceId as string) || (payload.wooProductId as string);
    if (!storeUrl || !wooProductId) {
      return {
        success: false,
        error: "Missing WooCommerce store URL or product ID",
      };
    }

    const updateData: Record<string, unknown> = {};
    if (payload.title || product.title) updateData.name = payload.title || product.title;
    if (payload.price || product.price)
      updateData.regular_price =
        (payload.price as string) || product.price?.toString();
    if (payload.description || product.description)
      updateData.description = payload.description || product.description;

    const res = await fetch(
      `${storeUrl}/wp-json/wc/v3/products/${wooProductId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      },
    );

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error:
          (errBody as Record<string, string>).message ||
          `WooCommerce update error: ${res.status}`,
        rawResponse: errBody as Record<string, unknown>,
      };
    }

    const updated = (await res.json()) as { id: number };
    return {
      success: true,
      marketplaceId: String(updated.id),
      rawResponse: updated as unknown as Record<string, unknown>,
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Unknown WooCommerce update error",
    };
  }
}

export async function executeWooDelete(
  ctx: JobContext,
): Promise<ActionResult> {
  const { job, integration } = ctx;
  const payload = (job.payload ?? {}) as Record<string, unknown>;

  try {
    const { storeUrl, credentials } = buildWooAuth(integration);
    const wooProductId =
      (payload.marketplaceId as string) || (payload.wooProductId as string);
    if (!storeUrl || !wooProductId) {
      return {
        success: false,
        error: "Missing WooCommerce store URL or product ID",
      };
    }

    const res = await fetch(
      `${storeUrl}/wp-json/wc/v3/products/${wooProductId}?force=true`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error:
          (errBody as Record<string, string>).message ||
          `WooCommerce delete error: ${res.status}`,
        rawResponse: errBody as Record<string, unknown>,
      };
    }

    return {
      success: true,
      marketplaceId: wooProductId,
      rawResponse: { deleted: true },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Unknown WooCommerce delete error",
    };
  }
}
