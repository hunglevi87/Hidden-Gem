/**
 * Authentication middleware for the Hidden-Gem API.
 *
 * Two authentication paths:
 *   1. **Supabase JWT** — `Authorization: Bearer <token>`
 *      Validates via `supabase.auth.getUser(token)`, resolves `sellers` row.
 *   2. **Service-role key** — `x-service-role-key` header
 *      Compares against `SUPABASE_SERVICE_ROLE_KEY` env var.
 *      Requires `x-seller-id` header to establish seller context.
 *
 * Three middleware exports:
 *   - `requireAuth`       — 401 unless authenticated via either path
 *   - `optionalAuth`      — attach auth context if present, continue regardless
 *   - `requireServiceRole` — 401 unless authenticated with service-role key
 */

import type { Request, Response, NextFunction } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { db } from "../db";
import { sellers } from "@shared/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Auth context attached to every request
// ---------------------------------------------------------------------------

export interface AuthContext {
  /** Supabase auth.uid() or the user behind the service-role call */
  userId: string;
  /** UUID from the `sellers` table (resolved lazily) */
  sellerId?: string;
  /** 'user' = JWT auth, 'service' = service-role key */
  role: "user" | "service";
  /** Shortcut boolean */
  isServiceRole: boolean;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

// ---------------------------------------------------------------------------
// Supabase client (singleton, service-role for token verification)
// ---------------------------------------------------------------------------

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url =
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      "";
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      "";

    if (!url || !key) {
      throw new Error(
        "Missing Supabase credentials (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
      );
    }

    _supabase = createClient(url, key);
  }
  return _supabase;
}

// ---------------------------------------------------------------------------
// Seller lookup cache (in-memory, short TTL)
// ---------------------------------------------------------------------------

const sellerCache = new Map<string, { sellerId: string; expiresAt: number }>();
const SELLER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function resolveSellerId(userId: string): Promise<string | undefined> {
  const cached = sellerCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.sellerId;
  }

  const [seller] = await db
    .select({ id: sellers.id })
    .from(sellers)
    .where(eq(sellers.userId, userId))
    .limit(1);

  if (seller) {
    sellerCache.set(userId, {
      sellerId: seller.id,
      expiresAt: Date.now() + SELLER_CACHE_TTL_MS,
    });
    return seller.id;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Core auth resolution (shared by all middleware variants)
// ---------------------------------------------------------------------------

async function resolveAuth(req: Request): Promise<AuthContext | null> {
  // --- Path 1: Service-role key ---
  const serviceKey = req.header("x-service-role-key");
  const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceKey && expectedKey && serviceKey === expectedKey) {
    const sellerId = req.header("x-seller-id") || undefined;
    return {
      userId: "__service__",
      sellerId,
      role: "service",
      isServiceRole: true,
    };
  }

  // --- Path 2: Supabase JWT ---
  const authHeader = req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  if (!token) return null;

  try {
    const supabase = getSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) return null;

    const sellerId = await resolveSellerId(user.id);

    return {
      userId: user.id,
      sellerId,
      role: "user",
      isServiceRole: false,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Middleware exports
// ---------------------------------------------------------------------------

/**
 * Require authentication — returns 401 if the request is not authenticated
 * via either Supabase JWT or service-role key.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = await resolveAuth(req);
  if (!auth) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  req.auth = auth;
  next();
}

/**
 * Optional authentication — attach auth context if present, otherwise
 * continue without it. Useful for read endpoints that work for both
 * authenticated and anonymous users.
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  req.auth = (await resolveAuth(req)) || undefined;
  next();
}

/**
 * Require service-role key — only allows service-role key access.
 * Use for TRS-only server-to-server endpoints.
 */
export async function requireServiceRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = await resolveAuth(req);
  if (!auth || !auth.isServiceRole) {
    res.status(401).json({ error: "Service-role authentication required" });
    return;
  }
  req.auth = auth;
  next();
}

/**
 * Helper: get the effective userId from the request.
 * Prefers `req.auth.userId` (from middleware), falls back to legacy
 * `req.body.userId` or `req.query.userId` with a deprecation warning.
 */
export function getEffectiveUserId(req: Request): string | undefined {
  if (req.auth?.userId && req.auth.userId !== "__service__") {
    return req.auth.userId;
  }

  // Legacy fallback — log deprecation
  const legacyId =
    (req.body?.userId as string) || (req.query?.userId as string);
  if (legacyId) {
    console.warn(
      `[auth] DEPRECATED: userId passed via body/query on ${req.method} ${req.path}. ` +
        "Use Authorization header instead.",
    );
  }

  return legacyId || undefined;
}
