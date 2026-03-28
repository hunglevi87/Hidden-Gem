/**
 * Supabase Storage module — replaces Multer in-memory storage.
 * Uploads images to a Supabase Storage bucket with seller-namespaced filenames,
 * validates type & size, and returns both public URL and base64.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET_NAME = "product-images";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export interface ImageUploadResult {
  path: string;
  publicUrl: string;
  base64: string;
}

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const url =
      process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      "";

    if (!url || !key) {
      throw new Error("Missing Supabase credentials for storage");
    }

    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

/**
 * Upload a product image to Supabase Storage.
 * Accepts raw buffer + metadata (from Express/Multer or any other source).
 */
export async function uploadProductImage(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  sellerId: string,
): Promise<ImageUploadResult> {
  if (!mimeType.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("Image must be less than 20 MB");
  }

  const supabase = getSupabase();

  // Unique seller-namespaced filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${sellerId}/${timestamp}-${random}-${safeName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, { contentType: mimeType });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

  const base64 = buffer.toString("base64");

  return { path: data.path, publicUrl, base64 };
}

/**
 * Delete a product image from Supabase Storage.
 */
export async function deleteProductImage(path: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) throw new Error(`Delete failed: ${error.message}`);
}
