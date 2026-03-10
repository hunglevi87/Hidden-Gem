ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "openfang_api_key" text;
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "openfang_base_url" text;
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "preferred_openfang_model" text;
