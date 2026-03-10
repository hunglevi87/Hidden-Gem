ALTER TABLE "stash_items" ADD COLUMN IF NOT EXISTS "publish_status" text DEFAULT 'draft';
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "high_value_threshold" integer DEFAULT 500;
