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
- **Scan Tab**: Camera-based two-step capture (full item, then label), sends to AI analysis
- **Stash Tab**: Grid view of inventory items with publish status badges, natural-language search
- **Settings**: Marketplace integrations (WooCommerce, eBay), AI provider config, appearance (dark/light toggle), account management

### Path Aliases
- `@/` maps to `./client/`
- `@shared/` maps to `./shared/`

## External Dependencies

### Supabase
- **Purpose**: User authentication and session management
- **Configuration**: Requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` environment variables
- **Behavior**: App works in unauthenticated mode if credentials not provided

### AI Providers & Fallback Chain
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
- FlipAgent backend: Seller profiles, product inventory, marketplace listings, AI audit trail, sync queue

### Not Yet Implemented
- Advanced publish status tracking across marketplaces (eBay/WooCommerce sync state)

## Recent Changes
- 2026-03-17: Multi-model fallback chain (Gemini → OpenFang → HuggingFace → Gemini) with post-analysis correction pass
- 2026-03-17: Full AI-powered SEO listing generation via "Generate Listing" button in Item Details
- 2026-03-17: First-run onboarding carousel (3 steps, AsyncStorage flag, PagerView)
- 2026-03-17: Theme switching (dark/light mode toggle in Settings, ThemeContext, persisted)
- 2026-03-08: Added OpenFang as multi-model AI routing provider
- 2026-03-08: Added natural-language stash search via AI query parsing
- 2026-03-08: Added human-in-the-loop approval gate for high-value item publishing
- 2026-03-08: Added OpenFang configuration UI in AI Providers settings
- 2026-02-06: Added Terms of Service and Privacy Policy screens
