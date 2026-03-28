export interface EbayCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  environment: "sandbox" | "production";
}

export interface EbayListingSummary {
  listingId: string;
  title: string;
  price: string;
  currency: string;
  quantity: number;
  quantitySold: number;
  status: string;
  listingUrl: string;
  imageUrl?: string;
  sku?: string;
}

export interface EbayInventoryItem {
  sku: string;
  title: string;
  description: string;
  condition: string;
  quantity: number;
  imageUrls: string[];
}

function getBaseUrl(environment: string): string {
  return environment === "production"
    ? "https://api.ebay.com"
    : "https://api.sandbox.ebay.com";
}

function getWebUrl(environment: string): string {
  return environment === "production"
    ? "https://www.ebay.com"
    : "https://sandbox.ebay.com";
}

export async function getAccessToken(creds: EbayCredentials): Promise<string> {
  const baseUrl = getBaseUrl(creds.environment);
  const credentials = Buffer.from(
    `${creds.clientId}:${creds.clientSecret}`,
  ).toString("base64");

  const response = await fetch(`${baseUrl}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(creds.refreshToken)}`,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error_description || "Failed to authenticate with eBay",
    );
  }

  const data = await response.json();
  return data.access_token;
}

export async function getActiveListings(
  creds: EbayCredentials,
  limit = 50,
  offset = 0,
): Promise<{ listings: EbayListingSummary[]; total: number }> {
  const accessToken = await getAccessToken(creds);
  const baseUrl = getBaseUrl(creds.environment);
  const webUrl = getWebUrl(creds.environment);

  const response = await fetch(
    `${baseUrl}/sell/inventory/v1/offer?limit=${limit}&offset=${offset}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      return { listings: [], total: 0 };
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.errors?.[0]?.message ||
        `Failed to fetch listings: ${response.status}`,
    );
  }

  const data = await response.json();
  const offers = data.offers || [];

  const listings: EbayListingSummary[] = offers.map((offer: any) => ({
    listingId: offer.listingId || offer.offerId,
    title: offer.listing?.title || offer.sku || "Untitled",
    price: offer.pricingSummary?.price?.value || "0",
    currency: offer.pricingSummary?.price?.currency || "USD",
    quantity: offer.availableQuantity || 0,
    quantitySold: offer.quantitySold || 0,
    status: offer.status || "UNKNOWN",
    listingUrl: offer.listingId ? `${webUrl}/itm/${offer.listingId}` : "",
    sku: offer.sku,
  }));

  return { listings, total: data.total || listings.length };
}

export async function getInventoryItems(
  creds: EbayCredentials,
  limit = 50,
  offset = 0,
): Promise<{ items: EbayInventoryItem[]; total: number }> {
  const accessToken = await getAccessToken(creds);
  const baseUrl = getBaseUrl(creds.environment);

  const response = await fetch(
    `${baseUrl}/sell/inventory/v1/inventory_item?limit=${limit}&offset=${offset}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      return { items: [], total: 0 };
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.errors?.[0]?.message ||
        `Failed to fetch inventory: ${response.status}`,
    );
  }

  const data = await response.json();
  const inventoryItems = data.inventoryItems || [];

  const items: EbayInventoryItem[] = inventoryItems.map((inv: any) => ({
    sku: inv.sku,
    title: inv.product?.title || inv.sku,
    description: inv.product?.description || "",
    condition: inv.condition || "UNKNOWN",
    quantity: inv.availability?.shipToLocationAvailability?.quantity || 0,
    imageUrls: inv.product?.imageUrls || [],
  }));

  return { items, total: data.total || items.length };
}

export async function endListing(
  creds: EbayCredentials,
  offerId: string,
): Promise<{ success: boolean; message: string }> {
  const accessToken = await getAccessToken(creds);
  const baseUrl = getBaseUrl(creds.environment);

  const response = await fetch(
    `${baseUrl}/sell/inventory/v1/offer/${offerId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (response.ok || response.status === 204) {
    return { success: true, message: "Listing ended successfully" };
  }

  const error = await response.json().catch(() => ({}));
  throw new Error(
    error.errors?.[0]?.message || `Failed to end listing: ${response.status}`,
  );
}

export async function updateListingPrice(
  creds: EbayCredentials,
  offerId: string,
  price: string,
  currency = "USD",
): Promise<{ success: boolean; message: string }> {
  const accessToken = await getAccessToken(creds);
  const baseUrl = getBaseUrl(creds.environment);

  const getResponse = await fetch(
    `${baseUrl}/sell/inventory/v1/offer/${offerId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!getResponse.ok) {
    throw new Error("Could not retrieve current offer details");
  }

  const offerData = await getResponse.json();
  offerData.pricingSummary = {
    price: { currency, value: price },
  };

  const updateResponse = await fetch(
    `${baseUrl}/sell/inventory/v1/offer/${offerId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Content-Language": "en-US",
      },
      body: JSON.stringify(offerData),
    },
  );

  if (updateResponse.ok || updateResponse.status === 204) {
    return { success: true, message: "Price updated successfully" };
  }

  const error = await updateResponse.json().catch(() => ({}));
  throw new Error(
    error.errors?.[0]?.message ||
      `Failed to update price: ${updateResponse.status}`,
  );
}

export async function updateListingQuantity(
  creds: EbayCredentials,
  sku: string,
  quantity: number,
): Promise<{ success: boolean; message: string }> {
  const accessToken = await getAccessToken(creds);
  const baseUrl = getBaseUrl(creds.environment);

  const getResponse = await fetch(
    `${baseUrl}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!getResponse.ok) {
    throw new Error("Could not retrieve inventory item");
  }

  const itemData = await getResponse.json();
  itemData.availability = {
    shipToLocationAvailability: { quantity },
  };

  const updateResponse = await fetch(
    `${baseUrl}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Content-Language": "en-US",
      },
      body: JSON.stringify(itemData),
    },
  );

  if (updateResponse.ok || updateResponse.status === 204) {
    return { success: true, message: "Quantity updated successfully" };
  }

  const error = await updateResponse.json().catch(() => ({}));
  throw new Error(
    error.errors?.[0]?.message ||
      `Failed to update quantity: ${updateResponse.status}`,
  );
}

export const EBAY_CATEGORY_MAP: Record<string, string> = {
  Handbag: "169291",
  Watch: "31387",
  Clothing: "11450",
  Shoes: "93427",
  Jewelry: "281",
  Electronics: "293",
  Collectible: "1",
  Art: "550",
  Antique: "20081",
  Vintage: "156955",
  Toy: "220",
  Book: "267",
  Sports: "888",
  Music: "11233",
  Coin: "11116",
  Stamp: "260",
  Pottery: "870",
  Glass: "870",
  Furniture: "3197",
  Rug: "20571",
};

export function mapCategoryToEbay(appCategory: string | null): string {
  if (!appCategory) return "1";

  const normalized = appCategory.trim();
  if (EBAY_CATEGORY_MAP[normalized]) {
    return EBAY_CATEGORY_MAP[normalized];
  }

  const lowerCategory = normalized.toLowerCase();
  for (const [key, value] of Object.entries(EBAY_CATEGORY_MAP)) {
    if (
      lowerCategory.includes(key.toLowerCase()) ||
      key.toLowerCase().includes(lowerCategory)
    ) {
      return value;
    }
  }

  return "1";
}

// ---------------------------------------------------------------------------
// FlipAgent additions — full inventory CRUD + proper token refresh
// ---------------------------------------------------------------------------

export interface EbayAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Full OAuth2 refresh that returns the new access token, refresh token, and
 * expiry timestamp — use this when you need to persist updated credentials.
 */
export async function refreshEbayAccessToken(
  creds: EbayCredentials,
): Promise<EbayAuthTokens> {
  const baseUrl = getBaseUrl(creds.environment);
  const credentials = Buffer.from(
    `${creds.clientId}:${creds.clientSecret}`,
  ).toString("base64");

  const response = await fetch(`${baseUrl}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(creds.refreshToken)}`,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error_description ||
        `eBay token refresh failed: ${response.statusText}`,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export interface EbayListingInput {
  title: string;
  description: string;
  price: number;
  quantity: number;
  categoryId?: string;
  imageUrls?: string[];
  condition?: "NEW" | "LIKE_NEW" | "GOOD" | "ACCEPTABLE";
}

export interface EbayListingResponse {
  itemId: string;
  status: "success" | "error";
  message: string;
  url?: string;
}

/**
 * Update an existing eBay inventory item (PUT).
 */
export async function updateEbayListing(
  creds: EbayCredentials,
  itemId: string,
  input: Partial<EbayListingInput>,
): Promise<EbayListingResponse> {
  try {
    const accessToken = await getAccessToken(creds);
    const baseUrl = getBaseUrl(creds.environment);
    const webUrl = getWebUrl(creds.environment);

    const response = await fetch(
      `${baseUrl}/sell/inventory/v1/inventory_item/${encodeURIComponent(itemId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US",
        },
        body: JSON.stringify(input),
      },
    );

    if (!response.ok && response.status !== 204) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.errors?.[0]?.message || `eBay API error: ${response.statusText}`,
      );
    }

    return {
      itemId,
      status: "success",
      message: "Listing updated successfully",
      url: `${webUrl}/itm/${itemId}`,
    };
  } catch (error) {
    return {
      itemId,
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete an eBay inventory item (DELETE with 204 handling).
 */
export async function deleteEbayListing(
  creds: EbayCredentials,
  itemId: string,
): Promise<EbayListingResponse> {
  try {
    const accessToken = await getAccessToken(creds);
    const baseUrl = getBaseUrl(creds.environment);

    const response = await fetch(
      `${baseUrl}/sell/inventory/v1/inventory_item/${encodeURIComponent(itemId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok && response.status !== 204) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.errors?.[0]?.message || `eBay API error: ${response.statusText}`,
      );
    }

    return {
      itemId,
      status: "success",
      message: "Listing deleted successfully",
    };
  } catch (error) {
    return {
      itemId,
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ---------------------------------------------------------------------------
// MCP Actions — createInventoryItem, createOffer, publishOffer, makeOffer
// ---------------------------------------------------------------------------

export interface EbayCreateInventoryItemInput {
  sku: string
  title: string
  description: string
  condition: "NEW" | "LIKE_NEW" | "GOOD" | "ACCEPTABLE"
  quantity: number
  price: number
  currency?: string
  imageUrls?: string[]
  categoryId?: string
}

export interface EbayCreateOfferInput {
  sku: string
  marketplaceId: string
  categoryId: string
  price: number
  currency?: string
  quantity: number
  contentLanguage?: string
  listingDescription?: string
}

export async function createInventoryItem(
  creds: EbayCredentials,
  input: EbayCreateInventoryItemInput,
): Promise<{ success: boolean; sku: string }> {
  const accessToken = await getAccessToken(creds)
  const baseUrl = getBaseUrl(creds.environment)

  const body = {
    availability: {
      shipToLocationAvailability: { quantity: input.quantity },
    },
    condition: input.condition ?? "GOOD",
    product: {
      title: input.title,
      description: input.description,
      imageUrls: input.imageUrls ?? [],
      aspects: {},
    },
  }

  const response = await fetch(
    `${baseUrl}/sell/inventory/v1/inventory_item/${encodeURIComponent(input.sku)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Content-Language": "en-US",
      },
      body: JSON.stringify(body),
    },
  )

  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      (error as any)?.errors?.[0]?.message ?? `createInventoryItem failed: ${response.status}`,
    )
  }

  return { success: true, sku: input.sku }
}

export interface EbayCreateOfferResponse {
  offerId: string
}

export async function createOffer(
  creds: EbayCredentials,
  input: EbayCreateOfferInput,
): Promise<EbayCreateOfferResponse> {
  const accessToken = await getAccessToken(creds)
  const baseUrl = getBaseUrl(creds.environment)

  const body = {
    sku: input.sku,
    marketplaceId: input.marketplaceId,
    format: "FIXED_PRICE",
    availableQuantity: input.quantity,
    categoryId: input.categoryId,
    listingDescription: input.listingDescription ?? "",
    pricingSummary: {
      price: {
        currency: input.currency ?? "USD",
        value: String(input.price),
      },
    },
    merchantLocationKey: "default",
  }

  const response = await fetch(`${baseUrl}/sell/inventory/v1/offer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Content-Language": input.contentLanguage ?? "en-US",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      (error as any)?.errors?.[0]?.message ?? `createOffer failed: ${response.status}`,
    )
  }

  const data = await response.json()
  return { offerId: data.offerId }
}

export async function publishOffer(
  creds: EbayCredentials,
  offerId: string,
): Promise<{ listingId: string }> {
  const accessToken = await getAccessToken(creds)
  const baseUrl = getBaseUrl(creds.environment)

  const response = await fetch(
    `${baseUrl}/sell/inventory/v1/offer/${offerId}/publish`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      (error as any)?.errors?.[0]?.message ?? `publishOffer failed: ${response.status}`,
    )
  }

  const data = await response.json()
  return { listingId: data.listingId }
}

export async function makeOffer(
  creds: EbayCredentials,
  listingId: string,
  offerAmount: number,
  currency = "USD",
  message?: string,
): Promise<{ success: boolean; offerId?: string }> {
  const accessToken = await getAccessToken(creds)
  const baseUrl = getBaseUrl(creds.environment)

  const body: Record<string, unknown> = {
    offerPrice: { currency, value: String(offerAmount) },
    message,
  }

  const response = await fetch(
    `${baseUrl}/buy/offer/v1_beta/offer?item_id=${encodeURIComponent(listingId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": creds.environment === "production" ? "EBAY_US" : "EBAY_US",
      },
      body: JSON.stringify(body),
    },
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      (error as any)?.errors?.[0]?.message ?? `makeOffer failed: ${response.status}`,
    )
  }

  const data = await response.json().catch(() => ({}))
  return { success: true, offerId: (data as any)?.offerId }
}
