-- Row-Level Security policies for FlipAgent tables.
-- These lock every row to its owning seller via auth.uid() (Supabase Auth).
-- Run against your Supabase project; on plain PG without Supabase Auth these
-- are no-ops but won't break anything.

ALTER TABLE "sellers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "listings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_generations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sync_queue" ENABLE ROW LEVEL SECURITY;

-- Sellers
CREATE POLICY "Sellers: Users see their own" ON "sellers"
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Sellers: Users insert their own" ON "sellers"
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Sellers: Users update their own" ON "sellers"
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Products
CREATE POLICY "Products: Users see their own" ON "products"
  FOR SELECT USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));
CREATE POLICY "Products: Users insert their own" ON "products"
  FOR INSERT WITH CHECK (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));
CREATE POLICY "Products: Users update their own" ON "products"
  FOR UPDATE USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));
CREATE POLICY "Products: Users delete their own" ON "products"
  FOR DELETE USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));

-- Listings
CREATE POLICY "Listings: Users see their own" ON "listings"
  FOR SELECT USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));
CREATE POLICY "Listings: Users insert their own" ON "listings"
  FOR INSERT WITH CHECK (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));
CREATE POLICY "Listings: Users update their own" ON "listings"
  FOR UPDATE USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));

-- Integrations
CREATE POLICY "Integrations: Users see their own" ON "integrations"
  FOR SELECT USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));
CREATE POLICY "Integrations: Users insert their own" ON "integrations"
  FOR INSERT WITH CHECK (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));
CREATE POLICY "Integrations: Users update their own" ON "integrations"
  FOR UPDATE USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));
CREATE POLICY "Integrations: Users delete their own" ON "integrations"
  FOR DELETE USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));

-- AI Generations
CREATE POLICY "AI Generations: Users see their own" ON "ai_generations"
  FOR SELECT USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));
CREATE POLICY "AI Generations: Users insert their own" ON "ai_generations"
  FOR INSERT WITH CHECK (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));

-- Sync Queue
CREATE POLICY "Sync Queue: Users see their own" ON "sync_queue"
  FOR SELECT USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));
CREATE POLICY "Sync Queue: Users insert their own" ON "sync_queue"
  FOR INSERT WITH CHECK (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));
CREATE POLICY "Sync Queue: Users update their own" ON "sync_queue"
  FOR UPDATE
  USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text))
  WITH CHECK (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));
CREATE POLICY "Sync Queue: Users delete their own" ON "sync_queue"
  FOR DELETE USING (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()::text));
