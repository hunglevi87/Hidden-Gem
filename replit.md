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
- **AI Integration**: Google Gemini via Replit AI Integrations for item analysis and image generation
- **File Uploads**: Multer with memory storage for image processing

### Authentication
- **Provider**: Supabase Auth with email/password authentication
- **Client Storage**: AsyncStorage for general data, SecureStore for sensitive credentials (API keys)
- **Pattern**: AuthContext provider wrapping the app with conditional navigation based on auth state

### Data Models
- **users**: Core user accounts with username/password
- **userSettings**: Per-user API keys and marketplace credentials (Gemini, HuggingFace, WooCommerce, eBay)
- **stashItems**: Inventory items with images, AI analysis, SEO metadata, and marketplace publish status
- **articles**: Educational content for the Discover tab
- **conversations/messages**: Chat history for AI interactions

### Key Features by Screen
- **Discover Tab**: Curated articles fetched from API, featured card layout
- **Scan Tab**: Camera-based two-step capture (full item, then label), sends to AI analysis
- **Stash Tab**: Grid view of inventory items with publish status badges
- **Settings**: Marketplace integrations (WooCommerce, eBay), account management

### Path Aliases
- `@/` maps to `./client/`
- `@shared/` maps to `./shared/`

## External Dependencies

### Supabase
- **Purpose**: User authentication and session management
- **Configuration**: Requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` environment variables
- **Behavior**: App works in unauthenticated mode if credentials not provided

### Google Gemini (via Replit AI Integrations)
- **Purpose**: AI-powered item analysis, appraisals, and image generation
- **Models**: gemini-2.5-flash (fast), gemini-2.5-pro (advanced), gemini-2.5-flash-image (images)
- **Configuration**: Uses `AI_INTEGRATIONS_GEMINI_API_KEY` and `AI_INTEGRATIONS_GEMINI_BASE_URL`

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