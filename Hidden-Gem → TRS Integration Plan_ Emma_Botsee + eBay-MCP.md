# Hidden\-Gem → TRS Integration Plan
Emma is the AI system; Botsee is the stash\-critic hand name\. Hidden\-Gem is inventory source of truth on shared Supabase; TRS is storefront/admin consumer and orchestration surface\.
# 1 — Architecture Map
## 1\.1 Inventory \(source of truth\)
Two parallel inventory models coexist on the same Postgres/Supabase instance:
* **Legacy `stash_items`** — serial PK, simple text fields, `userId` varchar FK\. Used by the mobile app \(Scan → Analysis → Stash\)\. Fields: title, description, category, estimatedValue \(text\), condition, tags\[\], fullImageUrl, labelImageUrl, aiAnalysis \(jsonb\), SEO fields, publishStatus, publishedToWoocommerce/Ebay flags, marketplace IDs\.
* **FlipAgent `products`** — UUID PK, `sellerId` UUID FK → `sellers`\. Richer model: SKU, brand, styleName, price/cost/estimatedProfit \(numeric\), images \(jsonb\), attributes \(jsonb\), tags\[\], listings \(jsonb\), syncStatus \(jsonb\)\. Related tables: `listings` \(per\-marketplace\), `integrations` \(per\-seller OAuth\), `sync_queue`, `ai_generations`\.
Key observation: **There is no foreign key or sync path between `stash_items` and `products`\.** These are two separate worlds\. TRS must decide which model to consume \(recommendation: `products` \+ `listings`\)\.
## 1\.2 OpenFang Hand Execution
`server/ai-providers.ts` — the `analyzeWithOpenFang()` function sends image\+prompt to a configurable OpenFang endpoint \(`OPENFANG_BASE_URL` / user `openfangBaseUrl`\)\. Uses OpenAI\-compatible `/v1/chat/completions` with routing hints \(`prefer: ["vision"]`, `fallback: ["gpt-4o", "gemini-2.5-flash", "claude-sonnet-4-20250514"]`\)\. Returns full `AnalysisResult` with brand, authenticity, market analysis, SEO, aspects, eBay categoryId\.
OpenFang credentials stored in `user_settings` table: `openfang_api_key`, `openfang_base_url`, `preferred_openfang_model`\.
This is the pathway where **Emma** \(AI system\) and **Botsee** \(stash\-critic hand\) currently execute — through the `POST /api/analyze` and `POST /api/analyze/retry` routes\.
## 1\.3 Jobs / Sync Queue
`sync_queue` table: `sellerId`, `productId`, `marketplace`, `action`, `payload`, `status` \(pending/…\), `errorMessage`, `retryCount`, `maxRetries`, `scheduledAt`, `completedAt`\.
`GET /api/sync-queue?sellerId=` — read\-only inspection\. **No worker/processor exists yet\.** The queue is write\-schema only; nothing dequeues or executes jobs\. This is a critical gap for TRS orchestration\.
Separately, `server/index.ts` runs a `setInterval` every 6 hours calling `processPriceChecks()` — a simple loop over `price_tracking` rows that compares `aiAnalysis.suggestedListPrice` to `lastPrice`\. Not a true job runner\.
## 1\.4 Content / Discover Flows
`articles` table — editorial content \(title, content, excerpt, category, imageUrl, readingTime, featured\)\. Served by `GET /api/articles` and rendered in `DiscoverScreen.tsx`\.
Purely read\-only from the app side; no admin/CMS endpoint for creation beyond direct DB inserts\. **TRS could own article creation** for the Discover feed\.
# 2 — Supabase Contract Map
## 2\.1 Tables TRS Must Read \(inventory source of truth\)
* **`products`** — id \(UUID\), seller\_id, sku, title, description, brand, style\_name, category, condition, price, cost, estimated\_profit, images \(jsonb: \{primary, gallery\[\], ai\_analysis\}\), attributes \(jsonb\), tags\[\], listings \(jsonb\), sync\_status \(jsonb\), sync\_last\_at, created\_at, updated\_at\.
    * Unique index: `(seller_id, sku)`
* **`listings`** — id \(UUID\), seller\_id, product\_id, marketplace \("ebay"|"woocommerce"|"custom\_store"\), marketplace\_id, title, description, seo\_tags\[\], category\_id, sku, price, quantity, status \("draft"|"active"|"sold"|"inactive"\), published\_at, sync\_error, raw\_api\_response \(jsonb\)\.
* **`sellers`** — id \(UUID\), user\_id \(→users\.id\), shop\_name, shop\_description, avatar\_url, stripe\_customer\_id, subscription\_tier, subscription\_expires\_at\.
## 2\.2 Tables TRS Must Read\+Write \(orchestration\)
* **`sync_queue`** — TRS enqueues jobs; Hidden\-Gem \(or a shared worker\) dequeues\. Fields: seller\_id, product\_id, marketplace, action, payload \(jsonb\), status, error\_message, retry\_count, max\_retries, scheduled\_at, completed\_at\.
* **`ai_generations`** — TRS writes audit records when Emma/Botsee runs analysis\. Fields: seller\_id, product\_id, input\_image\_url, input\_text, model\_used, output\_listing \(jsonb\), tokens\_used, cost, quality\_score, user\_feedback\.
* **`integrations`** — TRS manages marketplace OAuth\. Fields: seller\_id, service, access\_token, refresh\_token, token\_expires\_at, credentials \(jsonb\), is\_active, last\_synced\_at, sync\_count\. Unique: `(seller_id, service)`\.
## 2\.3 Tables TRS May Read \(context\)
* **`stash_items`** — legacy inventory\. TRS may read for migration/display but should not write\.
* **`articles`** — Discover content\. TRS could own creation\.
* **`user_settings`** — Contains openfang keys, gemini keys, preferred models, highValueThreshold\.
* **`notifications`** / **`push_tokens`** / **`price_tracking`** — notification subsystem\.
## 2\.4 RLS Policies
Migration `0002_rls_policies.sql` enables RLS on all FlipAgent tables\. All policies gate on `auth.uid()::text = user_id` \(sellers\) or sub\-select through sellers\. **TRS must authenticate as the user \(Supabase Auth JWT\) or use the service\_role key for server\-side access\.** If TRS uses service\_role, it bypasses RLS — acceptable for admin/orchestration but must enforce its own authz\.
## 2\.5 Events / Realtime
No Supabase Realtime subscriptions or database triggers exist yet\. **TRS should subscribe to Supabase Realtime on `products`, `listings`, `sync_queue` for live UI updates\.** Alternatively, a Postgres trigger \+ `pg_notify` channel could signal TRS when sync\_queue rows change status\.
## 2\.6 Storage
Supabase Storage bucket `product-images`\. Namespace: `{sellerId}/{timestamp}-{random}-{safeName}`\. Server uses `SUPABASE_SERVICE_ROLE_KEY` for uploads\. Public URLs returned via `getPublicUrl()`\.
# 3 — Prioritized Backlog
## P0 — Foundation \(Week 1\-2\)
**3\.1 Sync Queue Worker** — No processor exists for `sync_queue`\. Build a worker \(Node cron or Supabase Edge Function\) that: dequeues pending jobs → executes marketplace API calls \(eBay Inventory API, WooCommerce REST\) → updates status/error/completedAt → updates `listings` table\. This unblocks all automated publishing\.
**3\.2 stash\_items → products Migration Path** — Define a one\-way promotion function: given a `stash_items` row, create/upsert a `products` row with seller\_id, auto\-generated SKU, mapped fields \(aiAnalysis → attributes, estimatedValue → price\)\. This lets existing HG mobile users' inventory become visible to TRS\.
**3\.3 Shared Auth Contract** — Document how TRS authenticates to the shared Supabase\. Options: \(a\) Supabase Auth JWT pass\-through, \(b\) service\_role key for server\-to\-server\. Decide and implement middleware\.
## P1 — Emma/Botsee Integration \(Week 2\-3\)
**3\.4 Emma Analysis API for TRS** — Expose a clean API \(or let TRS call HG's `POST /api/analyze` / `POST /api/analyze/retry` directly\)\. The current endpoint accepts multipart images \+ provider config and returns `AnalysisResult`\. TRS needs: \(a\) to call this with sellerId context, \(b\) to receive structured analysis, \(c\) to persist to `ai_generations`\.
**3\.5 Botsee Stash\-Critic Hand** — Define a Telegram\-callable interface: user sends item photo\(s\) via Telegram → bot calls Emma analysis → bot returns critique \(authenticity, valuation, market analysis\) formatted for chat\. This is a thin adapter over the existing `analyzeItem()` \+ `analyzeItemWithRetry()` functions\.
**3\.6 OpenFang Config Surface in TRS** — TRS admin should be able to configure per\-seller or global OpenFang credentials \(base\_url, api\_key, preferred\_model\)\. Currently stored in `user_settings`; may need a TRS\-specific config table or use `integrations` with service="openfang"\.
## P2 — eBay\-MCP Workflows \(Week 3\-4\)
**3\.7 eBay\-MCP Listing Orchestration** — Wire the sync\_queue worker \(P0\) to the existing `ebay-service.ts` functions: `getAccessToken()`, inventory PUT, offer POST, publish POST, `updateEbayListing()`, `deleteEbayListing()`\. The worker reads `sync_queue.payload` → calls eBay API → writes `listings.marketplace_id`, `status`, `raw_api_response`\.
**3\.8 eBay Token Lifecycle** — `refreshEbayAccessToken()` exists but isn't called automatically\. The worker must check `integrations.token_expires_at` before each call and refresh if needed, persisting new tokens back to `integrations`\.
**3\.9 TRS eBay Dashboard** — TRS reads `listings` where marketplace="ebay" and joins to `products` for display\. Show status, sync\_error, price, listing URL\. Allow re\-sync \(enqueue to sync\_queue\)\.
## P3 — Telegram \+ Content \(Week 4\-5\)
**3\.10 Telegram Bot Bridge** — Build a Telegram bot handler that: receives photos → uploads to Supabase Storage → calls Emma analysis → creates `stash_items` or `products` row → sends back formatted critique \(Botsee persona\)\. Optionally enqueue to `sync_queue` for auto\-listing\.
**3\.11 Discover Content Pipeline** — Add `POST /api/articles` endpoint \(admin\-only\) so TRS can create/manage Discover articles\. Hidden\-Gem mobile app already renders them\.
**3\.12 Notification Bridge** — TRS triggers notifications via the existing `sendPushNotification()` / `sendPriceAlert()` functions\. Expose as API or let TRS write directly to `notifications` table \+ call Expo Push API\.
# 4 — Risk List & Sequencing
## 4\.1 Risks
* **Dual inventory model** \(stash\_items vs products\): Highest risk\. Without a clear migration/promotion path, data will diverge\. TRS should treat `products` as canonical and stash\_items as mobile\-only staging\.
* **No sync\_queue worker**: All automated marketplace publishing is blocked\. The schema exists but nothing processes it\.
* **RLS vs service\_role**: If TRS uses service\_role key, it bypasses all RLS\. Must implement application\-level authz to prevent cross\-seller data access\.
* **eBay token expiry**: `refreshEbayAccessToken()` is not called proactively\. A stale token will cause silent failures in the worker\.
* **OpenFang availability**: No circuit breaker or fallback logic if OpenFang is down\. The retry system \(`analyzeItemWithRetry`\) re\-sends to the same provider\. Need fallback to Gemini/OpenAI\.
* **Price tracking is naive**: `processPriceChecks()` compares cached AI analysis values, not live market data\. No external price feed\.
* **No API authentication on Express routes**: All `/api/*` endpoints are unauthenticated\. Anyone with the URL can read/write inventory\. Must add auth middleware before TRS integration\.
* **Supabase Realtime not configured**: No triggers or subscriptions\. TRS will need to poll or set up Realtime channels\.
## 4\.2 Sequencing Recommendation
1. **Week 1**: Sync queue worker \(3\.1\) \+ API auth middleware \+ shared auth contract \(3\.3\)
2. **Week 2**: stash→products migration \(3\.2\) \+ Emma analysis API cleanup \(3\.4\)
3. **Week 3**: Botsee Telegram hand \(3\.5, 3\.10\) \+ OpenFang config in TRS \(3\.6\)
4. **Week 4**: eBay\-MCP worker integration \(3\.7, 3\.8\) \+ TRS eBay dashboard \(3\.9\)
5. **Week 5**: Content pipeline \(3\.11\) \+ notification bridge \(3\.12\) \+ Supabase Realtime setup
## 4\.3 Dependency Graph
```warp-runnable-command
3.3 (Auth) ──→ 3.1 (Worker) ──→ 3.7 (eBay-MCP) ──→ 3.9 (Dashboard)
                    │
3.2 (Migration) ────┤
                    │
3.4 (Emma API) ─→ 3.5 (Botsee) ─→ 3.10 (Telegram)
                    │
3.6 (OF Config) ────┘
```
