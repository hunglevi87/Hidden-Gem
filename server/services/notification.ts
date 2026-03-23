import { db } from "../db";
import {
  pushTokens,
  notifications,
  priceTracking,
  stashItems,
} from "@shared/schema";
import { eq, and, lte, isNotNull } from "drizzle-orm";

// Expo Push API endpoint
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  priority?: "default" | "normal" | "high";
}

interface PushResponse {
  data?: {
    id?: string;
    status?: string;
  };
  errors?: {
    code: string;
    message: string;
  }[];
}

/**
 * Register a push token for a user
 */
export async function registerPushToken(
  userId: string,
  token: string,
  platform: "ios" | "android" | "web",
): Promise<void> {
  // Check if token already exists
  const existing = await db
    .select()
    .from(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)))
    .limit(1);

  if (existing.length > 0) {
    // Update existing token
    await db
      .update(pushTokens)
      .set({ updatedAt: new Date() })
      .where(eq(pushTokens.id, existing[0].id));
    return;
  }

  // Insert new token
  await db.insert(pushTokens).values({
    userId,
    token,
    platform,
  });
}

/**
 * Unregister a push token
 */
export async function unregisterPushToken(
  userId: string,
  token: string,
): Promise<void> {
  await db
    .delete(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
}

/**
 * Send push notification to a user's devices
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<boolean> {
  // Get user's push tokens
  const tokens = await db
    .select()
    .from(pushTokens)
    .where(eq(pushTokens.userId, userId));

  if (tokens.length === 0) {
    console.log(`No push tokens found for user ${userId}`);
    return false;
  }

  const messages: PushMessage[] = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data,
    sound: "default",
    priority: "high",
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Push notification failed:", error);
      return false;
    }

    const result = (await response.json()) as PushResponse;

    // Store notification in database
    await db.insert(notifications).values({
      userId,
      type: (data?.type as string) || "general",
      title,
      body,
      data: (data || {}) as Record<string, unknown>,
    });

    return true;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return false;
  }
}

/**
 * Send price alert notification
 */
export async function sendPriceAlert(
  userId: string,
  stashItemId: number,
  itemTitle: string,
  oldPrice: number,
  newPrice: number,
  percentChange: number,
): Promise<boolean> {
  const isIncrease = newPrice > oldPrice;
  const title = isIncrease
    ? `📈 Price Increase: ${itemTitle}`
    : `📉 Price Drop: ${itemTitle}`;
  const body = isIncrease
    ? `The market value increased by ${percentChange.toFixed(1)}% to $${newPrice}`
    : `The market value dropped by ${Math.abs(percentChange).toFixed(1)}% to $${newPrice}`;

  return sendPushNotification(userId, title, body, {
    type: isIncrease ? "price_increase" : "price_drop",
    stashItemId,
    oldPrice,
    newPrice,
    percentChange,
  });
}

/**
 * Enable price tracking for an item
 */
export async function enablePriceTracking(
  userId: string,
  stashItemId: number,
  alertThreshold: number = 10,
): Promise<void> {
  // Check if tracking already exists
  const existing = await db
    .select()
    .from(priceTracking)
    .where(
      and(
        eq(priceTracking.userId, userId),
        eq(priceTracking.stashItemId, stashItemId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing tracking
    await db
      .update(priceTracking)
      .set({
        isActive: true,
        alertThreshold,
        updatedAt: new Date(),
      })
      .where(eq(priceTracking.id, existing[0].id));
    return;
  }

  // Get item's current estimated value
  const item = await db
    .select()
    .from(stashItems)
    .where(eq(stashItems.id, stashItemId))
    .limit(1);

  let lastPrice: number | null = null;
  if (item.length > 0 && item[0].aiAnalysis) {
    const analysis = item[0].aiAnalysis as {
      suggestedListPrice?: number;
      estimatedValueHigh?: number;
      estimatedValueLow?: number;
    };
    lastPrice =
      analysis.suggestedListPrice ||
      analysis.estimatedValueHigh ||
      analysis.estimatedValueLow ||
      null;
  }

  // Create new tracking
  await db.insert(priceTracking).values({
    userId,
    stashItemId,
    isActive: true,
    alertThreshold,
    lastPrice,
    lastCheckedAt: new Date(),
    nextCheckAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Check in 24 hours
  });
}

/**
 * Disable price tracking for an item
 */
export async function disablePriceTracking(
  userId: string,
  stashItemId: number,
): Promise<void> {
  await db
    .update(priceTracking)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(priceTracking.userId, userId),
        eq(priceTracking.stashItemId, stashItemId),
      ),
    );
}

/**
 * Get price tracking status for an item
 */
export async function getPriceTrackingStatus(
  userId: string,
  stashItemId: number,
): Promise<{ isActive: boolean; alertThreshold: number } | null> {
  const tracking = await db
    .select()
    .from(priceTracking)
    .where(
      and(
        eq(priceTracking.userId, userId),
        eq(priceTracking.stashItemId, stashItemId),
      ),
    )
    .limit(1);

  if (tracking.length === 0) {
    return null;
  }

  return {
    isActive: tracking[0].isActive ?? true,
    alertThreshold: tracking[0].alertThreshold || 10,
  };
}

/**
 * Get user's notification history
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 50,
): Promise<(typeof notifications.$inferSelect)[]> {
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(notifications.sentAt)
    .limit(limit);
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  userId: string,
  notificationId: number,
): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ),
    );
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(
  userId: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  const result = await db
    .select()
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
    );

  return result.length;
}

/**
 * Process price checks for all active tracking
 * This would be called by a scheduled job (e.g., cron)
 */
export async function processPriceChecks(): Promise<void> {
  const now = new Date();

  // Get all active tracking that needs checking
  const trackingList = await db
    .select({
      tracking: priceTracking,
      item: stashItems,
    })
    .from(priceTracking)
    .innerJoin(stashItems, eq(priceTracking.stashItemId, stashItems.id))
    .where(
      and(
        eq(priceTracking.isActive, true),
        isNotNull(priceTracking.nextCheckAt),
        lte(priceTracking.nextCheckAt, now),
      ),
    );

  for (const { tracking, item } of trackingList) {
    try {
      // Get current price from AI analysis
      const analysis = item.aiAnalysis as {
        suggestedListPrice?: number;
        estimatedValueHigh?: number;
        estimatedValueLow?: number;
      } | null;

      const currentPrice =
        analysis?.suggestedListPrice ||
        analysis?.estimatedValueHigh ||
        analysis?.estimatedValueLow;

      if (!currentPrice || !tracking.lastPrice) {
        // Update check time but skip alert
        await db
          .update(priceTracking)
          .set({
            lastCheckedAt: now,
            nextCheckAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            updatedAt: now,
          })
          .where(eq(priceTracking.id, tracking.id));
        continue;
      }

      // Calculate price change
      const priceDiff = currentPrice - tracking.lastPrice;
      const percentChange = (priceDiff / tracking.lastPrice) * 100;
      const threshold = tracking.alertThreshold || 10;

      // Check if change exceeds threshold
      if (Math.abs(percentChange) >= threshold) {
        // Send notification
        await sendPriceAlert(
          tracking.userId,
          tracking.stashItemId,
          item.title,
          tracking.lastPrice,
          currentPrice,
          percentChange,
        );
      }

      // Update tracking
      await db
        .update(priceTracking)
        .set({
          lastPrice: currentPrice,
          lastCheckedAt: now,
          nextCheckAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          updatedAt: now,
        })
        .where(eq(priceTracking.id, tracking.id));
    } catch (error) {
      console.error(
        `Error processing price check for item ${tracking.stashItemId}:
        error`,
      );
    }
  }
}
