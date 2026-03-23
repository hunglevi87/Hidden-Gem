import { createClient } from "@supabase/supabase-js";
import type { Request, Response, NextFunction } from "express";

let supabaseAuthClient: ReturnType<typeof createClient> | null = null;

function getSupabaseAuthClient() {
  if (!supabaseAuthClient) {
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
      throw new Error("Missing Supabase credentials for auth verification");
    }
    supabaseAuthClient = createClient(url, key);
  }
  return supabaseAuthClient;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const supabase = getSupabaseAuthClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    res.locals.userId = data.user.id;
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Auth verification failed";
    console.error("Auth middleware error:", message);
    res.status(401).json({ error: "Authentication failed" });
  }
}
