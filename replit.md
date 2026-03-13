# HiddenGem

## Overview

HiddenGem is a professional inventory management mobile application built for resellers. The app enables users to scan collectible items (bags, clothes, etc.), leverage AI for instant appraisals, and generate SEO-optimized listings for WooCommerce and eBay. The aesthetic is luxurious and refined, designed to feel like a curator's tool with a premium art gallery sensibility.

The app follows a two-photo scanning ritual (full item + label close-up) to create a deliberate, professional workflow for expert appraisals.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation v7 with bottom tabs and native stack navigators
- **State Management**: TanStack React Query for server state, React Context for auth state
- **Styling**: Custom theme system with dark mode as default, using a gold/dark color palette
- **UI Components**: Custom themed components (ThemedText, ThemedView, Button, Card) with Reanimated animations
- **Typography**: Cormorant Garamond for headings, Jost for body text

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: Multi-provider support via OpenFang routing, Google Gemini, OpenAI, Anthropic, and custom endpoints
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
- **Discover Tab**: Curated articles fetched from API, featured card layout
- **Scan Tab**: Camera-based two-step capture (full item, then label), sends to AI analysis
- **Stash Tab**: Grid view of inventory items with publish status badges, natural-language search
- **Settings**: Marketplace integrations (WooCommerce, eBay), AI provider configuration, account management

### Path Aliases
- `@/` maps to `./client/`
- `@shared/` maps to `./shared/`

## External Dependencies

### Supabase
- **Purpose**: User authentication and session management
- **Configuration**: Requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` environment variables
- **Behavior**: App works in unauthenticated mode if credentials not provided

### AI Providers
- **Google Gemini** (via Replit AI Integrations): Default provider, uses `AI_INTEGRATIONS_GEMINI_API_KEY` and `AI_INTEGRATIONS_GEMINI_BASE_URL`
- **OpenFang**: Multi-model AI routing layer with intelligent model selection. Uses `OPENFANG_BASE_URL` and `OPENFANG_API_KEY` env vars. Routes to best model per item category with fallback chain (vision-capable models preferred). OpenAI-compatible `/v1/chat/completions` endpoint.
- **OpenAI**: Direct GPT-4o integration, requires user-provided API key
- **Anthropic**: Direct Claude integration, requires user-provided API key
- **Custom**: Any OpenAI-compatible endpoint (Ollama, LM Studio, etc.)

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

## Feature Completion Status

### Completed
- Authentication: Supabase email/password and Google OAuth with inline error/success messages
- Settings screen: Account header with user email/avatar, sign-out button, marketplace connection status badges
- WooCommerce integration: Save credentials (SecureStore), test connection, publish items from ItemDetailsScreen
- eBay integration: Save credentials (SecureStore), test connection, publish items from ItemDetailsScreen
- Terms of Service and Privacy Policy screens (accessible from Settings)
- Item scanning: Two-photo capture workflow (full item + label close-up) with camera and gallery support
- AI analysis: Multi-provider support (Gemini, OpenFang, OpenAI, Anthropic, Custom) for item identification and appraisal
- Stash (inventory) management: Grid view with item details, publish status badges
- Natural-language stash search: AI-powered search parsing (e.g., "Louis Vuitton bags under $300")
- High-value publish approval gate: Configurable threshold (default $500), items exceeding threshold require explicit approval before publishing
- Discover tab: Curated articles with featured card layout
- Backend API: Express.js with PostgreSQL/Drizzle, marketplace proxy endpoints
- P0 item 3.3 Shared Auth Contract + API Auth Middleware: Added `server/middleware/auth.ts` and applied auth middleware across API routes in `server/routes.ts`
- FlipAgent backend: Seller profiles, product inventory, marketplace listings, AI audit trail, sync queue

### Not Yet Implemented
- Full SEO-optimized listing generation (backend stubs exist)
- Theme switching (light mode)
- Push notifications
- Onboarding/welcome screen

## Recent Changes
- 2026-03-13: Completed P0 item 3.3 (Shared Auth Contract + API Auth Middleware); added `server/middleware/auth.ts` and updated `server/routes.ts` to enforce auth middleware across API routes. Run: https://oz.warp.dev/runs/f9b7026d-0bb6-4ac6-ab40-f914216957d6
- 2026-03-08: Added OpenFang as multi-model AI routing provider (replaces HuggingFace as secondary model)
- 2026-03-08: Added natural-language stash search via AI query parsing
- 2026-03-08: Added human-in-the-loop approval gate for high-value item publishing
- 2026-03-08: Added OpenFang configuration UI in AI Providers settings
- 2026-02-06: Added Terms of Service and Privacy Policy screens
- 2026-02-06: Added environment setup documentation (ENVIRONMENT.md)
- 2026-02-06: Added E2E testing infrastructure with Maestro

## Next Unblocked Step
- P0 item 3.1: Sync Queue Worker
