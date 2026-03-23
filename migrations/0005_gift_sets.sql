CREATE TABLE IF NOT EXISTS "gift_sets" (
  "id" SERIAL PRIMARY KEY,
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "tier" TEXT NOT NULL,
  "description" TEXT,
  "marketing_hook" TEXT,
  "item_ids" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "items_snapshot" JSONB,
  "total_value" NUMERIC(10, 2),
  "selling_price" NUMERIC(10, 2),
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
