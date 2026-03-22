# Architecture Overview

<cite>
**Referenced Files in This Document**
- [package.json](file://package.json)
- [server/index.ts](file://server/index.ts)
- [server/routes.ts](file://server/routes.ts)
- [server/db.ts](file://server/db.ts)
- [drizzle.config.ts](file://drizzle.config.ts)
- [shared/schema.ts](file://shared/schema.ts)
- [client/App.tsx](file://client/App.tsx)
- [client/navigation/RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx)
- [client/screens/ScanScreen.tsx](file://client/screens/ScanScreen.tsx)
- [client/lib/supabase.ts](file://client/lib/supabase.ts)
- [client/hooks/useAuth.ts](file://client/hooks/useAuth.ts)
- [client/lib/marketplace.ts](file://client/lib/marketplace.ts)
- [server/ai-providers.ts](file://server/ai-providers.ts)
- [server/ebay-service.ts](file://server/ebay-service.ts)
- [server/services/notification.ts](file://server/services/notification.ts)
- [shared/types.ts](file://shared/types.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document describes the full-stack architecture of Hidden-Gem, a mobile-first application that enables users to capture item photos, analyze them via AI, and publish listings to marketplace platforms (eBay and WooCommerce). The system comprises:
- React Native frontend with TypeScript and Expo
- Express.js backend with TypeScript
- PostgreSQL database with Drizzle ORM and schema-driven migrations
- Authentication via Supabase
- AI analysis powered by a pluggable provider factory supporting multiple AI backends
- Real-time and push notification support via Expo Push
- Marketplace integrations for eBay and WooCommerce

## Project Structure
The repository follows a monorepo-like structure with clear separation of concerns:
- client: React Native mobile UI, navigation, screens, and shared UI components
- server: Express.js API, route handlers, services, and integrations
- shared: Shared database schema and type definitions
- migrations: Drizzle-generated migration files
- .maestro: Test flows for Maestro UI testing

```mermaid
graph TB
subgraph "Client (React Native)"
RN_App["App.tsx"]
Nav["RootStackNavigator.tsx"]
Scan["ScanScreen.tsx"]
Auth["useAuth.ts"]
Supabase["supabase.ts"]
Market["marketplace.ts"]
end
subgraph "Server (Express.js)"
Express["index.ts"]
Routes["routes.ts"]
DB["db.ts"]
Schema["shared/schema.ts"]
DrizzleCfg["drizzle.config.ts"]
AI["ai-providers.ts"]
eBay["ebay-service.ts"]
Notif["services/notification.ts"]
end
subgraph "External Services"
Postgres["PostgreSQL"]
SupabaseExt["Supabase Auth"]
ExpoPush["Expo Push"]
eBayAPI["eBay API"]
WC["WooCommerce REST API"]
Gemini["Google GenAI"]
end
RN_App --> Nav
RN_App --> Auth
RN_App --> Market
Nav --> Scan
Market --> Routes
Auth --> SupabaseExt
Routes --> DB
DB --> Postgres
Routes --> AI
AI --> Gemini
Routes --> eBay
eBay --> eBayAPI
Routes --> WC
Routes --> Notif
Notif --> ExpoPush
```

**Diagram sources**
- [client/App.tsx](file://client/App.tsx#L1-L67)
- [client/navigation/RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L1-L133)
- [client/screens/ScanScreen.tsx](file://client/screens/ScanScreen.tsx#L1-L394)
- [client/lib/supabase.ts](file://client/lib/supabase.ts#L1-L39)
- [client/hooks/useAuth.ts](file://client/hooks/useAuth.ts#L1-L151)
- [client/lib/marketplace.ts](file://client/lib/marketplace.ts#L1-L129)
- [server/index.ts](file://server/index.ts#L1-L262)
- [server/routes.ts](file://server/routes.ts#L1-L929)
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L344)
- [drizzle.config.ts](file://drizzle.config.ts#L1-L19)
- [server/ai-providers.ts](file://server/ai-providers.ts#L1-L696)
- [server/ebay-service.ts](file://server/ebay-service.ts#L1-L474)
- [server/services/notification.ts](file://server/services/notification.ts#L1-L414)

**Section sources**
- [package.json](file://package.json#L1-L95)
- [server/index.ts](file://server/index.ts#L1-L262)
- [server/routes.ts](file://server/routes.ts#L1-L929)
- [server/db.ts](file://server/db.ts#L1-L19)
- [drizzle.config.ts](file://drizzle.config.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L344)
- [client/App.tsx](file://client/App.tsx#L1-L67)
- [client/navigation/RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L1-L133)
- [client/screens/ScanScreen.tsx](file://client/screens/ScanScreen.tsx#L1-L394)
- [client/lib/supabase.ts](file://client/lib/supabase.ts#L1-L39)
- [client/hooks/useAuth.ts](file://client/hooks/useAuth.ts#L1-L151)
- [client/lib/marketplace.ts](file://client/lib/marketplace.ts#L1-L129)
- [server/ai-providers.ts](file://server/ai-providers.ts#L1-L696)
- [server/ebay-service.ts](file://server/ebay-service.ts#L1-L474)
- [server/services/notification.ts](file://server/services/notification.ts#L1-L414)
- [shared/types.ts](file://shared/types.ts#L1-L116)

## Core Components
- React Native Frontend
  - Navigation: Native stack navigator with modal presentation for analysis
  - Screens: Authentication, scanning, analysis, settings, and marketplace configuration
  - Authentication: Supabase-based OAuth and session management
  - Marketplace helpers: Encapsulate credentials retrieval and publish calls
- Express Backend
  - Routing: REST endpoints for notifications, analytics, stash items, AI provider testing, and marketplace publishing
  - Database: Drizzle ORM with PostgreSQL schema and migrations
  - AI Provider Factory: Pluggable AI analysis with Gemini, OpenAI, Anthropic, and custom endpoints
  - Integrations: eBay and WooCommerce publishing flows
  - Notifications: Push notifications via Expo and price tracking automation
- Shared Layer
  - Schema: Database schema definitions and Zod insert schemas
  - Types: Canonical types for FlipAgent domain entities

**Section sources**
- [client/navigation/RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L18-L31)
- [client/screens/ScanScreen.tsx](file://client/screens/ScanScreen.tsx#L17-L62)
- [client/lib/marketplace.ts](file://client/lib/marketplace.ts#L19-L79)
- [server/routes.ts](file://server/routes.ts#L44-L800)
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L344)
- [server/ai-providers.ts](file://server/ai-providers.ts#L380-L396)
- [server/ebay-service.ts](file://server/ebay-service.ts#L42-L62)
- [server/services/notification.ts](file://server/services/notification.ts#L31-L129)

## Architecture Overview
Hidden-Gem employs a layered architecture:
- Presentation Layer (React Native): Handles UI, navigation, camera capture, and user interactions
- Application Layer (Express): Implements business logic, orchestrates AI analysis, and manages marketplace publishing
- Persistence Layer (PostgreSQL): Stores user data, settings, stash items, marketplace listings, and notifications
- Integration Layer: Calls external APIs (eBay, WooCommerce, GenAI) and push notification service

```mermaid
graph TB
Client["React Native Client<br/>Navigation + Screens"] --> API["Express API<br/>REST Routes"]
API --> ORM["Drizzle ORM<br/>PostgreSQL"]
ORM --> DB["PostgreSQL"]
API --> AI["AI Provider Factory<br/>Gemini/OpenAI/Anthropic/Custom"]
API --> eBayInt["eBay Service<br/>Inventory + Offers"]
API --> WCInt["WooCommerce REST API"]
API --> Notif["Push Notifications<br/>Expo Push"]
Client --> Auth["Supabase Auth<br/>OAuth + Session"]
```

**Diagram sources**
- [client/App.tsx](file://client/App.tsx#L1-L67)
- [server/index.ts](file://server/index.ts#L1-L262)
- [server/routes.ts](file://server/routes.ts#L1-L929)
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L344)
- [server/ai-providers.ts](file://server/ai-providers.ts#L380-L396)
- [server/ebay-service.ts](file://server/ebay-service.ts#L42-L62)
- [server/services/notification.ts](file://server/services/notification.ts#L5-L26)

## Detailed Component Analysis

### Mobile-First Navigation and Camera Capture
The client initializes the app with a dark theme, global error boundary, and React Query provider. Navigation is driven by a native stack navigator with modals for analysis. The scan screen coordinates camera permissions, flash toggling, and dual-shot capture (full item + label close-up), then navigates to the analysis screen.

```mermaid
sequenceDiagram
participant User as "User"
participant Scan as "ScanScreen"
participant Camera as "CameraView"
participant Nav as "RootStackNavigator"
User->>Scan : "Open Scan Screen"
Scan->>Camera : "Initialize camera"
User->>Scan : "Take full-item photo"
Scan->>Scan : "Set fullImageUri"
User->>Scan : "Take label photo"
Scan->>Nav : "Navigate('Analysis', {fullImageUri, labelImageUri})"
```

**Diagram sources**
- [client/screens/ScanScreen.tsx](file://client/screens/ScanScreen.tsx#L26-L62)
- [client/navigation/RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L51-L85)

**Section sources**
- [client/App.tsx](file://client/App.tsx#L1-L67)
- [client/navigation/RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L34-L131)
- [client/screens/ScanScreen.tsx](file://client/screens/ScanScreen.tsx#L17-L87)

### Authentication and Supabase Integration
Authentication is handled via Supabase with OAuth flows for Google and password-based login. The hook manages session state, persistence, and browser redirect handling across platforms.

```mermaid
sequenceDiagram
participant User as "User"
participant AuthHook as "useAuth"
participant Supabase as "Supabase Client"
participant Browser as "WebBrowser"
User->>AuthHook : "signInWithGoogle()"
AuthHook->>Supabase : "signInWithOAuth(provider, redirectTo)"
Supabase-->>AuthHook : "OAuth URL"
AuthHook->>Browser : "OpenAuthSessionAsync(url, redirectTo)"
Browser-->>AuthHook : "Callback URL with code/access_token"
AuthHook->>Supabase : "exchangeCodeForSession(code)"
Supabase-->>AuthHook : "Session established"
```

**Diagram sources**
- [client/hooks/useAuth.ts](file://client/hooks/useAuth.ts#L72-L137)
- [client/lib/supabase.ts](file://client/lib/supabase.ts#L20-L38)

**Section sources**
- [client/hooks/useAuth.ts](file://client/hooks/useAuth.ts#L12-L151)
- [client/lib/supabase.ts](file://client/lib/supabase.ts#L1-L39)

### AI Provider Factory Pattern
The backend implements a Factory pattern to select and invoke AI providers. The factory supports Gemini, OpenAI, Anthropic, and custom endpoints, with validation and retry logic. A test endpoint validates provider connectivity.

```mermaid
classDiagram
class AIProviderFactory {
+analyzeItem(config, images) AnalysisResult
+testProviderConnection(config) TestResult
+analyzeItemWithRetry(config, images, previous, feedback) AnalysisResult
}
class GeminiAdapter {
+analyze(images, config) AnalysisResult
+test() TestResult
}
class OpenAIAdapter {
+analyze(images, config) AnalysisResult
+test() TestResult
}
class AnthropicAdapter {
+analyze(images, config) AnalysisResult
+test() TestResult
}
class CustomAdapter {
+analyze(images, config) AnalysisResult
+test() TestResult
}
AIProviderFactory --> GeminiAdapter : "factory"
AIProviderFactory --> OpenAIAdapter : "factory"
AIProviderFactory --> AnthropicAdapter : "factory"
AIProviderFactory --> CustomAdapter : "factory"
```

**Diagram sources**
- [server/ai-providers.ts](file://server/ai-providers.ts#L380-L396)
- [server/ai-providers.ts](file://server/ai-providers.ts#L604-L695)

**Section sources**
- [server/ai-providers.ts](file://server/ai-providers.ts#L3-L41)
- [server/ai-providers.ts](file://server/ai-providers.ts#L224-L248)
- [server/ai-providers.ts](file://server/ai-providers.ts#L250-L287)
- [server/ai-providers.ts](file://server/ai-providers.ts#L289-L332)
- [server/ai-providers.ts](file://server/ai-providers.ts#L334-L378)
- [server/ai-providers.ts](file://server/ai-providers.ts#L604-L695)

### Database and Repository Pattern with Drizzle ORM
The backend uses Drizzle ORM with a shared schema and migrations. The database layer encapsulates queries and updates, enabling a clean repository-style abstraction.

```mermaid
erDiagram
USERS {
varchar id PK
text username UK
text password
}
USER_SETTINGS {
serial id PK
varchar user_id FK
text gemini_api_key
text huggingface_api_key
text preferred_gemini_model
text preferred_huggingface_model
text woocommerce_url
text woocommerce_key
text woocommerce_secret
text ebay_token
timestamp created_at
timestamp updated_at
}
STASH_ITEMS {
serial id PK
varchar user_id FK
text title
text description
text category
text estimated_value
text condition
text[] tags
text full_image_url
text label_image_url
jsonb ai_analysis
text seo_title
text seo_description
text[] seo_keywords
boolean published_to_woocommerce
boolean published_to_ebay
text woocommerce_product_id
text ebay_listing_id
timestamp created_at
timestamp updated_at
}
PUSH_TOKENS {
serial id PK
varchar user_id FK
text token
text platform
timestamp created_at
timestamp updated_at
}
NOTIFICATIONS {
serial id PK
varchar user_id FK
int stash_item_id FK
text type
text title
text body
jsonb data
boolean is_read
timestamp sent_at
}
PRICE_TRACKING {
serial id PK
int stash_item_id FK
varchar user_id FK
boolean is_active
int last_price
timestamp last_checked_at
timestamp next_check_at
int alert_threshold
timestamp created_at
timestamp updated_at
}
USERS ||--o{ USER_SETTINGS : "has"
USERS ||--o{ STASH_ITEMS : "owns"
USERS ||--o{ PUSH_TOKENS : "has"
USERS ||--o{ NOTIFICATIONS : "receives"
STASH_ITEMS ||--o{ NOTIFICATIONS : "triggers"
```

**Diagram sources**
- [shared/schema.ts](file://shared/schema.ts#L6-L293)
- [server/db.ts](file://server/db.ts#L1-L19)

**Section sources**
- [drizzle.config.ts](file://drizzle.config.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L344)
- [server/db.ts](file://server/db.ts#L1-L19)

### API Workflows: Camera-to-Marketplace Publishing
The end-to-end flow from camera capture to marketplace publishing involves:
- Client captures two images and navigates to Analysis
- Backend performs AI analysis via the provider factory
- Client saves analysis result to stash
- Client publishes to marketplace using stored credentials
- Backend validates credentials, calls marketplace APIs, updates stash, and records publication metadata

```mermaid
sequenceDiagram
participant Client as "Client"
participant API as "Express Routes"
participant AI as "AI Provider Factory"
participant DB as "Drizzle ORM"
participant WC as "WooCommerce API"
participant eBay as "eBay API"
Client->>API : "POST /api/analyze (multipart)"
API->>AI : "analyzeItem(config, images)"
AI-->>API : "AnalysisResult"
API-->>Client : "AnalysisResult"
Client->>API : "POST /api/stash (save analysis)"
API->>DB : "INSERT stash_items"
DB-->>API : "New item"
API-->>Client : "Item saved"
Client->>API : "POST /api/stash/ : id/publish/woocommerce"
API->>WC : "Create product"
WC-->>API : "Product details"
API->>DB : "UPDATE stash_items (published flags)"
API-->>Client : "{success, productUrl}"
Client->>API : "POST /api/stash/ : id/publish/ebay"
API->>eBay : "Create inventory + offer + publish"
eBay-->>API : "Offer/Listing details"
API->>DB : "UPDATE stash_items (ebay fields)"
API-->>Client : "{success, listingUrl}"
```

**Diagram sources**
- [server/routes.ts](file://server/routes.ts#L299-L385)
- [server/routes.ts](file://server/routes.ts#L387-L455)
- [server/routes.ts](file://server/routes.ts#L457-L647)
- [server/ai-providers.ts](file://server/ai-providers.ts#L380-L396)
- [client/lib/marketplace.ts](file://client/lib/marketplace.ts#L81-L129)

**Section sources**
- [server/routes.ts](file://server/routes.ts#L299-L385)
- [server/routes.ts](file://server/routes.ts#L387-L455)
- [server/routes.ts](file://server/routes.ts#L457-L647)
- [client/lib/marketplace.ts](file://client/lib/marketplace.ts#L19-L79)

### eBay Integration Service
The eBay service encapsulates OAuth token refresh, inventory CRUD, and listing management. It maps categories and handles environment-specific base URLs.

```mermaid
flowchart TD
Start(["Start"]) --> GetCreds["Load credentials"]
GetCreds --> Refresh["POST /identity/v1/oauth2/token"]
Refresh --> TokenOK{"Token OK?"}
TokenOK --> |No| Error["Throw error"]
TokenOK --> |Yes| CallAPI["Call eBay API (inventory/offers/listings)"]
CallAPI --> RespOK{"Response OK?"}
RespOK --> |No| HandleErr["Parse error and throw"]
RespOK --> |Yes| ReturnData["Return structured data"]
ReturnData --> End(["End"])
HandleErr --> End
Error --> End
```

**Diagram sources**
- [server/ebay-service.ts](file://server/ebay-service.ts#L42-L62)
- [server/ebay-service.ts](file://server/ebay-service.ts#L386-L430)

**Section sources**
- [server/ebay-service.ts](file://server/ebay-service.ts#L1-L474)

### Notifications and Price Tracking
The notification service manages push tokens, sends push notifications via Expo, and runs periodic price checks to alert users of significant value changes.

```mermaid
sequenceDiagram
participant Cron as "Scheduler"
participant NotifSvc as "notification.ts"
participant DB as "Drizzle ORM"
participant Expo as "Expo Push"
Cron->>NotifSvc : "processPriceChecks()"
NotifSvc->>DB : "SELECT active priceTracking + stashItems"
DB-->>NotifSvc : "Tracking rows"
loop For each tracking row
NotifSvc->>NotifSvc : "Calculate percent change"
alt Change >= threshold
NotifSvc->>Expo : "POST /api/v2/push/send"
Expo-->>NotifSvc : "Accepted"
NotifSvc->>DB : "INSERT notifications"
end
NotifSvc->>DB : "UPDATE tracking timestamps"
end
```

**Diagram sources**
- [server/index.ts](file://server/index.ts#L247-L259)
- [server/services/notification.ts](file://server/services/notification.ts#L332-L413)

**Section sources**
- [server/services/notification.ts](file://server/services/notification.ts#L1-L414)
- [server/index.ts](file://server/index.ts#L227-L261)

## Dependency Analysis
The project leverages modern, complementary technologies:
- React Native + Expo for cross-platform mobile development
- Express.js for a lightweight, scalable backend
- Drizzle ORM with PostgreSQL for robust data modeling
- Supabase for authentication and secure storage
- AI providers via a pluggable factory
- eBay and WooCommerce REST APIs for marketplace publishing
- Expo Push for real-time notifications

```mermaid
graph LR
RN["React Native Client"] --> Supabase["Supabase Auth"]
RN --> ExpoPush["Expo Push"]
RN --> Express["Express API"]
Express --> Drizzle["Drizzle ORM"]
Drizzle --> PG["PostgreSQL"]
Express --> AI["AI Provider Factory"]
AI --> Gemini["Google GenAI"]
Express --> eBay["eBay Service"]
eBay --> eBayAPI["eBay API"]
Express --> WC["WooCommerce REST API"]
```

**Diagram sources**
- [package.json](file://package.json#L24-L76)
- [server/index.ts](file://server/index.ts#L1-L262)
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L344)
- [server/ai-providers.ts](file://server/ai-providers.ts#L224-L248)
- [server/ebay-service.ts](file://server/ebay-service.ts#L42-L62)

**Section sources**
- [package.json](file://package.json#L1-L95)

## Performance Considerations
- AI Analysis
  - Use provider selection and retry logic to improve accuracy and reduce rework
  - Consider caching analysis results per item to avoid repeated calls
- Database
  - Index frequently queried columns (e.g., user_id, stash_item_id)
  - Batch updates for price tracking to minimize round trips
- Network
  - Compress images before upload and enforce reasonable size limits
  - Implement exponential backoff for external API calls
- Offline
  - Persist stash items locally and queue publish actions for later retries
  - Use React Query with optimistic updates for responsive UX

## Troubleshooting Guide
- Authentication
  - Verify Supabase URL and keys are configured; check redirect URL for OAuth
- AI Provider Testing
  - Use the test endpoint to validate provider connectivity and credentials
- eBay Publishing
  - Ensure OAuth refresh token is present and environment matches sandbox/production
  - Confirm business policies are configured in Seller Hub
- Push Notifications
  - Register tokens for the user and confirm Expo push endpoint accessibility
- Database
  - Ensure DATABASE_URL is set and migrations are applied

**Section sources**
- [client/lib/supabase.ts](file://client/lib/supabase.ts#L20-L38)
- [server/routes.ts](file://server/routes.ts#L649-L670)
- [server/ebay-service.ts](file://server/ebay-service.ts#L42-L62)
- [server/services/notification.ts](file://server/services/notification.ts#L31-L58)
- [drizzle.config.ts](file://drizzle.config.ts#L7-L9)

## Conclusion
Hidden-Gem’s architecture balances mobile-first UX with a robust backend, leveraging a Factory pattern for AI providers, Drizzle ORM for data consistency, and Supabase for authentication. The system integrates seamlessly with eBay and WooCommerce, supports real-time notifications, and is designed for scalability and maintainability.