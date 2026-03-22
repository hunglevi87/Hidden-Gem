ALTER TABLE "stash_items" ADD COLUMN IF NOT EXISTS "platform_versions" JSONB;
ALTER TABLE "stash_items" ADD COLUMN IF NOT EXISTS "market_matches" JSONB;
