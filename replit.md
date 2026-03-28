# HiddenGem

## Overview

HiddenGem is a professional inventory management mobile application for a designer/luxury resale and handmade artisan goods shop. The app enables users to scan items, leverage Emma AI for instant appraisals and pricing, and generate SEO-optimized listings saved to Supabase. The storefront reads directly from Supabase — no publish action needed.

**Item Types:**
- **Designer/Luxury Items**: Three-photo scan ritual (2 full item photos + 1 label close-up photo) — Emma authenticates and appraises
- **Handmade Goods**: Single photo + details form (product name, ingredients, scent/texture, size/volume, COG) — Emma prices using artisan market formula (COG × 3-5×)

**CRITICAL**: Never use "vintage," "antique," or "collectible" language. This is a designer resale + handmade artisan goods shop only.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation v7 with bottom tabs and native stack navigators
- **State Management**: TanStack React Query for server state, React Context for auth + theme state
- **Styling**: Custom theme system with dark/light mode switching, gold/dark palette
- **UI Components**: Custom themed components (ThemedText, ThemedView, Button, Card) with Reanimated animations
- **Typography**: Cormorant Garamond for headings, Jost for body text

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: Multi-provider with fallback chain (Gemini → OpenFang → HuggingFace endpoint → Gemini). Post-analysis correction pass using secondary model.
- **File Uploads**: Multer with memory storage for image processing

### Authentication
- **Provider**: Supabase Auth with email/password authentication
- **Client Storage**: AsyncStorage for general data, SecureStore for sensitive credentials (API keys)
- **Pattern**: AuthContext provider wrapping the app with conditional navigation based on auth state

### Data Models
- **users**: Core user accounts with username/password
- **userSettings**: Per-user API keys (Gemini, OpenFang, OpenAI, Anthropic), marketplace credentials, high-value threshold
- **stashItems**: Inventory items with images, AI analysis, SEO metadata, marketplace publish status, and approval status (publishStatus)
- **articles**: Educational content for the Discover tab
- **conversations/messages**: Chat history for AI interactions
- **FlipAgent tables**: sellers, products, listings, aiGenerations, syncQueue, integrations

### Key Features by Screen
- **Onboarding**: 3-step first-run carousel (shown once), skipped on return visits
- **Discover Tab**: Curated articles fetched from API, featured card layout
- **Scan Tab**: Item type selector (Designer vs Handmade). Designer: two-step camera (full item + label). Handmade: details form (name, ingredients, scent, size, COG) then single product photo. Both routes through Analysis screen.
- **ItemTypeSelectorScreen**: Entry point for the Scan tab — choose Designer/Luxury or Handmade Goods
- **HandmadeDetailsScreen**: Form for handmade product details before camera capture
- **ScanScreen**: Camera screen, now a root stack modal — handles both 1-photo (handmade) and 2-photo (designer) flows via itemType param
- **Stash Tab**: Grid view of inventory items with publish status badges, natural-language search
- **Craft Tab** (`CraftScreen`): Two-tab studio — Gift Set Builder + Shop Strategy
  - **Gift Sets**: Emma bundles the stash into 5 tiers (Budget → Ultimate) with marketing hooks, pricing, and thumbnail previews. Save sets to Supabase for the storefront via `/api/craft/gift-sets`.
  - **Strategy**: Ask Emma any inventory question using quick prompt shortcuts or free-form text. Emma responds with structured markdown referencing real item names/prices. Route: `/api/craft/strategy`.
  - **DB**: `gift_sets` table (id, userId, tier, title, description, marketing_hook, item_ids, items_snapshot, total_value, selling_price, created_at)
- **Settings**: Marketplace integrations (WooCommerce, eBay), AI provider config, appearance (dark/light toggle), account management

### Path Aliases
- `@/` maps to `./client/`
- `@shared/` maps to `./shared/`

## External Dependencies

### Supabase
- **Purpose**: User authentication and session management
- **Configuration**: Requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` environment variables
- **Behavior**: App works in unauthenticated mode if credentials not provided

### Emma — The AI System
Emma is the name of HiddenGem's AI system, presented to customers across the app and any storefront integrations. Emma handles appraisals, SEO listing generation, and natural-language stash search. All user-facing references to the AI use her name.

### Emma's Fallback Chain (Backend)
- **Fallback order**: Primary (user-selected) → OpenFang → HuggingFace-compatible endpoint → Gemini
- **Post-analysis correction**: Secondary model pass refines appraisal quality and SEO fields
- **Google Gemini** (via Replit AI Integrations): Default primary provider. Uses `AI_INTEGRATIONS_GEMINI_API_KEY` and `AI_INTEGRATIONS_GEMINI_BASE_URL`
- **OpenFang**: Multi-model AI routing layer. Uses `OPENFANG_BASE_URL` and `OPENFANG_API_KEY`. OpenAI-compatible `/v1/chat/completions` endpoint with routing metadata for vision-capable models.
- **OpenAI**: Direct GPT-4o integration, requires user-provided API key
- **Anthropic**: Direct Claude integration, requires user-provided API key
- **Custom/HuggingFace**: Any OpenAI-compatible endpoint (Ollama, LM Studio, HuggingFace TGI, etc.)

### PostgreSQL
- **Purpose**: Persistent data storage for users, items, articles, and settings
- **Configuration**: Requires `DATABASE_URL` environment variable
- **ORM**: Drizzle with migrations in `./migrations` directory

### WooCommerce Integration
- **Purpose**: Publish inventory items to WooCommerce stores
- **Credentials**: Store URL, consumer key, and consumer secret stored securely per-user

### eBay Integration
- **Purpose**: Publish inventory items to eBay marketplace
- **Credentials**: Client ID, client secret, refresh token with sandbox/production environment support

### Expo Services
- **Camera**: For item scanning with flash control
- **Image Picker**: Alternative to camera for selecting existing photos
- **Haptics**: Tactile feedback on iOS/Android
- **SecureStore**: Encrypted storage for API keys and secrets
- **Notifications**: Push notification token registration + price alert delivery via Expo Push API
- **PagerView**: Used for onboarding carousel

## Feature Completion Status

### Completed
- Authentication: Supabase email/password and Google OAuth with inline error/success messages
- Settings screen: Account header with user email/avatar, sign-out button, marketplace connection status badges
- WooCommerce integration: Save credentials (SecureStore), test connection, publish items from ItemDetailsScreen
- eBay integration: Save credentials (SecureStore), test connection, publish items from ItemDetailsScreen
- Terms of Service and Privacy Policy screens (accessible from Settings)
- Item scanning: Two-photo capture workflow (full item + label close-up) with camera and gallery support
- AI analysis: Multi-provider with graceful fallback chain + post-analysis correction pass
- SEO listing generation: "Generate Listing" button in ItemDetails triggers AI-powered eBay/WooCommerce listing optimization
- Stash (inventory) management: Grid view with item details, publish status badges, natural-language search
- High-value publish approval gate: Configurable threshold (default $500)
- Onboarding: 3-step first-run carousel with swipe navigation (shown once, persisted)
- Theme switching: Dark/light mode toggle in Settings, persisted across launches
- Push notifications: Token registration, price tracking alerts, notification history
- Discover tab: Curated articles with featured card layout
- Backend API: Express.js with PostgreSQL/Drizzle, marketplace proxy endpoints
- P0 item 3.3 Shared Auth Contract + API Auth Middleware: Added `server/middleware/auth.ts` and applied auth middleware across API routes in `server/routes.ts`
- P0 item 3.1 Sync Queue Worker: Production-ready queue processor for `sync_queue` table with status transitions (pending→processing→completed/failed/retry), exponential backoff retries, eBay token lifecycle management, and listing/product sync status updates. Supports actions: `ebay_create_listing`, `ebay_update_listing`, `ebay_delete_listing`, `ebay_value_check` (P2 stub), `woo_create_listing`, `woo_update_listing`, `woo_delete_listing`. New files: `server/services/sync-worker.ts`, `server/services/sync-actions.ts`. New API endpoints: `POST /api/sync-queue` (enqueue), `GET /api/sync-queue/:id`, `POST /api/sync-queue/:id/retry`, `POST /api/sync-queue/:id/cancel`. Worker starts on server boot (15s poll interval) with graceful shutdown.
- FlipAgent backend: Seller profiles, product inventory, marketplace listings, AI audit trail, sync queue

### Not Yet Implemented
- Advanced publish status tracking across marketplaces (eBay/WooCommerce sync state)

## Recent Changes
- 2026-03-13: Completed P0 item 3.1 (Sync Queue Worker); added `server/services/sync-worker.ts` and `server/services/sync-actions.ts` with full queue processing, retry/backoff, eBay/WooCommerce action handlers, token lifecycle, listing table upserts, and management API endpoints. Worker auto-starts on server boot.
- 2026-03-13: Completed P0 item 3.3 (Shared Auth Contract + API Auth Middleware); added `server/middleware/auth.ts` and updated `server/routes.ts` to enforce auth middleware across API routes. Run: https://oz.warp.dev/runs/f9b7026d-0bb6-4ac6-ab40-f914216957d6
- 2026-03-08: Added OpenFang as multi-model AI routing provider (replaces HuggingFace as secondary model)
- 2026-03-17: Multi-model fallback chain (Gemini → OpenFang → HuggingFace → Gemini) with post-analysis correction pass
- 2026-03-17: Full AI-powered SEO listing generation via "Generate Listing" button in Item Details
- 2026-03-17: First-run onboarding carousel (3 steps, AsyncStorage flag, PagerView)
- 2026-03-17: Theme switching (dark/light mode toggle in Settings, ThemeContext, persisted)
- 2026-03-13: Restored Gemini-first identification defaults while keeping OpenFang optional
- 2026-03-13: Completed P0 item 3.3 (Shared Auth Contract + API Auth Middleware); added `server/middleware/auth.ts` and updated `server/routes.ts` to enforce auth middleware across API routes
- 2026-03-08: Added OpenFang as multi-model AI routing provider
- 2026-03-08: Added natural-language stash search via AI query parsing
- 2026-03-08: Added human-in-the-loop approval gate for high-value item publishing
- 2026-03-08: Added OpenFang configuration UI in AI Providers settings
- 2026-02-06: Added Terms of Service and Privacy Policy screens
- 2026-02-06: Added environment setup documentation (ENVIRONMENT.md)
- 2026-02-06: Added E2E testing infrastructure with Maestro

## Next Unblocked Step
- P0 item 3.2: stash_items → products Migration Path
