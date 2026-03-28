/**
 * Sync Queue Worker
 *
 * Polls the `sync_queue` table for pending/retry-eligible jobs and processes
 * them sequentially. Each job is dispatched to the appropriate marketplace
 * action handler, and the queue row + related tables are updated based on
 * the result.
 *
 * Status lifecycle:
 *   pending → processing → completed | failed | retry
 *
 * Retry uses exponential backoff: 30s × 2^retryCount.
 */

import { db } from "../db";
import {
  syncQueue,
  products,
  listingsTable,
  integrations,
} from "@shared/schema";
import { eq, and, or, lte, sql, asc } from "drizzle-orm";
import type { SyncQueueItem, Product, Integration } from "@shared/schema";
import {
  type ActionResult,
  type JobContext,
  executeEbayCreate,
  executeEbayUpdate,
  executeEbayDelete,
  executeEbayValueCheck,
  executeWooCreate,
  executeWooUpdate,
  executeWooDelete,
} from "./sync-actions";

// -------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------

const BASE_BACKOFF_MS = 30_000; // 30 seconds
const MAX_JOBS_PER_TICK = 10;
const LOG_PREFIX = "[sync-worker]";

// -------------------------------------------------------------------------
// Action dispatcher
// -------------------------------------------------------------------------

type ActionHandler = (ctx: JobContext) => Promise<ActionResult>;

const ACTION_MAP: Record<string, ActionHandler> = {
  ebay_create_listing: executeEbayCreate,
  ebay_update_listing: executeEbayUpdate,
  ebay_delete_listing: executeEbayDelete,
  ebay_value_check: executeEbayValueCheck,
  woo_create_listing: executeWooCreate,
  woo_update_listing: executeWooUpdate,
  woo_delete_listing: executeWooDelete,
};

// -------------------------------------------------------------------------
// Core processing loop
// -------------------------------------------------------------------------

/**
 * Main entry point — fetch eligible jobs and process them sequentially.
 * Returns the number of jobs processed in this tick.
 */
export async function processSyncQueue(): Promise<number> {
  const now = new Date();

  // Fetch jobs that are pending or in retry status and whose scheduledAt has passed
  const jobs = await db
    .select()
    .from(syncQueue)
    .where(
      and(
        or(eq(syncQueue.status, "pending"), eq(syncQueue.status, "retry")),
        lte(syncQueue.scheduledAt, now),
      ),
    )
    .orderBy(asc(syncQueue.scheduledAt))
    .limit(MAX_JOBS_PER_TICK);

  if (jobs.length === 0) return 0;

  console.log(`${LOG_PREFIX} Found ${jobs.length} job(s) to process`);

  let processed = 0;
  for (const job of jobs) {
    try {
      await processJob(job);
      processed++;
    } catch (err) {
      // Unexpected error — mark failed to avoid infinite loop
      console.error(`${LOG_PREFIX} Unhandled error processing job ${job.id}:`, err);
      await markFailed(
        job,
        err instanceof Error ? err.message : "Unhandled worker error",
      );
      processed++;
    }
  }

  return processed;
}

// -------------------------------------------------------------------------
// Single job processor
// -------------------------------------------------------------------------

async function processJob(job: SyncQueueItem): Promise<void> {
  const handler = ACTION_MAP[job.action];
  if (!handler) {
    console.warn(`${LOG_PREFIX} Unknown action "${job.action}" for job ${job.id}`);
    await markFailed(job, `Unknown action: ${job.action}`);
    return;
  }

  // Claim the job — set status to "processing"
  await db
    .update(syncQueue)
    .set({ status: "processing" })
    .where(eq(syncQueue.id, job.id));

  // Load product
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, job.productId));

  if (!product) {
    await markFailed(job, `Product ${job.productId} not found`);
    return;
  }

  // Load integration for this seller + marketplace
  const integration = await resolveIntegration(job.sellerId, job.marketplace);
  if (!integration) {
    await markFailed(
      job,
      `No active ${job.marketplace} integration for seller ${job.sellerId}`,
    );
    return;
  }

  const ctx: JobContext = { job, product, integration };

  console.log(
    `${LOG_PREFIX} Executing ${job.action} for product ${product.id} (job ${job.id})`,
  );

  const result = await handler(ctx);

  if (result.success) {
    await onSuccess(job, product, integration, result);
  } else {
    await onFailure(job, product, result);
  }
}

// -------------------------------------------------------------------------
// Integration resolution
// -------------------------------------------------------------------------

async function resolveIntegration(
  sellerId: string,
  marketplace: string,
): Promise<Integration | null> {
  // Map queue marketplace values to integration service names
  const serviceMap: Record<string, string> = {
    ebay: "ebay",
    woocommerce: "woocommerce",
    woo: "woocommerce",
  };
  const service = serviceMap[marketplace.toLowerCase()] || marketplace;

  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.sellerId, sellerId),
        eq(integrations.service, service),
        eq(integrations.isActive, true),
      ),
    );

  return integration ?? null;
}

// -------------------------------------------------------------------------
// Success / failure handlers
// -------------------------------------------------------------------------

async function onSuccess(
  job: SyncQueueItem,
  product: Product,
  integration: Integration,
  result: ActionResult,
): Promise<void> {
  console.log(
    `${LOG_PREFIX} Job ${job.id} completed — marketplaceId: ${result.marketplaceId ?? "n/a"}`,
  );

  // Update sync_queue row
  await db
    .update(syncQueue)
    .set({
      status: "completed",
      completedAt: new Date(),
      errorMessage: null,
    })
    .where(eq(syncQueue.id, job.id));

  // Upsert listings table for create/update actions
  if (result.marketplaceId && isCreateOrUpdateAction(job.action)) {
    await upsertListing(job, product, result);
  }

  // For delete actions, mark listing inactive
  if (isDeleteAction(job.action) && result.marketplaceId) {
    await db
      .update(listingsTable)
      .set({
        status: "inactive",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(listingsTable.productId, job.productId),
          eq(listingsTable.marketplace, job.marketplace),
        ),
      );
  }

  // Update product sync status
  await updateProductSyncStatus(product, job.marketplace, "synced");

  // Update integration sync count — use integration.id to avoid marketplace name mismatch
  await db
    .update(integrations)
    .set({
      lastSyncedAt: new Date(),
      syncCount: sql`${integrations.syncCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integration.id));
}

async function onFailure(
  job: SyncQueueItem,
  product: Product,
  result: ActionResult,
): Promise<void> {
  const currentRetries = job.retryCount ?? 0;
  const maxRetries = job.maxRetries ?? 3;

  if (currentRetries < maxRetries) {
    // Schedule retry with exponential backoff
    const backoffMs = BASE_BACKOFF_MS * Math.pow(2, currentRetries);
    const nextScheduledAt = new Date(Date.now() + backoffMs);

    console.log(
      `${LOG_PREFIX} Job ${job.id} failed (attempt ${currentRetries + 1}/${maxRetries}) — ` +
        `retrying at ${nextScheduledAt.toISOString()}: ${result.error}`,
    );

    await db
      .update(syncQueue)
      .set({
        status: "retry",
        retryCount: currentRetries + 1,
        scheduledAt: nextScheduledAt,
        errorMessage: result.error || "Unknown error",
      })
      .where(eq(syncQueue.id, job.id));
  } else {
    await markFailed(job, result.error || "Max retries exceeded");
  }

  // Update product sync status
  await updateProductSyncStatus(product, job.marketplace, "error");
}

async function markFailed(job: SyncQueueItem, error: string): Promise<void> {
  console.error(`${LOG_PREFIX} Job ${job.id} permanently failed: ${error}`);

  await db
    .update(syncQueue)
    .set({
      status: "failed",
      errorMessage: error,
      completedAt: new Date(),
    })
    .where(eq(syncQueue.id, job.id));
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function isCreateOrUpdateAction(action: string): boolean {
  return action.endsWith("_create_listing") || action.endsWith("_update_listing");
}

function isDeleteAction(action: string): boolean {
  return action.endsWith("_delete_listing");
}

async function upsertListing(
  job: SyncQueueItem,
  product: Product,
  result: ActionResult,
): Promise<void> {
  const payload = (job.payload ?? {}) as Record<string, unknown>;

  // Check for existing listing
  const [existing] = await db
    .select()
    .from(listingsTable)
    .where(
      and(
        eq(listingsTable.productId, job.productId),
        eq(listingsTable.marketplace, job.marketplace),
      ),
    );

  if (existing) {
    await db
      .update(listingsTable)
      .set({
        marketplaceId: result.marketplaceId,
        status: "active",
        publishedAt: new Date(),
        syncError: null,
        rawApiResponse: (result.rawResponse ?? {}) as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(listingsTable.id, existing.id));
  } else {
    await db.insert(listingsTable).values({
      sellerId: job.sellerId,
      productId: job.productId,
      marketplace: job.marketplace,
      marketplaceId: result.marketplaceId,
      title: (payload.title as string) || product.title,
      description:
        (payload.description as string) || product.description || product.title,
      price: (payload.price as string) || product.price?.toString(),
      quantity: (payload.quantity as number) || 1,
      sku: product.sku,
      status: "active",
      publishedAt: new Date(),
      rawApiResponse: (result.rawResponse ?? {}) as Record<string, unknown>,
    });
  }
}

async function updateProductSyncStatus(
  product: Product,
  marketplace: string,
  status: string,
): Promise<void> {
  const currentSyncStatus =
    (product.syncStatus as Record<string, string>) ?? {};
  const updatedSyncStatus = { ...currentSyncStatus, [marketplace]: status };

  await db
    .update(products)
    .set({
      syncStatus: updatedSyncStatus,
      syncLastAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(products.id, product.id));
}

// -------------------------------------------------------------------------
// Worker lifecycle — used by server/index.ts
// -------------------------------------------------------------------------

let workerInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

/**
 * Start the sync queue worker with a configurable poll interval.
 * Only one worker tick runs at a time — overlapping ticks are skipped.
 */
export function startSyncWorker(pollIntervalMs = 15_000): void {
  if (workerInterval) {
    console.warn(`${LOG_PREFIX} Worker already running — ignoring start`);
    return;
  }

  console.log(
    `${LOG_PREFIX} Starting sync queue worker (poll every ${pollIntervalMs / 1000}s)`,
  );

  workerInterval = setInterval(async () => {
    if (isProcessing) return; // skip overlapping tick
    isProcessing = true;
    try {
      const count = await processSyncQueue();
      if (count > 0) {
        console.log(`${LOG_PREFIX} Processed ${count} job(s) this tick`);
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Worker tick error:`, err);
    } finally {
      isProcessing = false;
    }
  }, pollIntervalMs);
}

/**
 * Gracefully stop the sync queue worker.
 */
export function stopSyncWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log(`${LOG_PREFIX} Sync queue worker stopped`);
  }
}
