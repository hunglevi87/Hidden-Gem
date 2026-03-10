# Multi-Platform Publishing

<cite>
**Referenced Files in This Document**
- [marketplace.ts](file://client/lib/marketplace.ts)
- [routes.ts](file://server/routes.ts)
- [ebay-service.ts](file://server/ebay-service.ts)
- [ItemDetailsScreen.tsx](file://client/screens/ItemDetailsScreen.tsx)
- [StashScreen.tsx](file://client/screens/StashScreen.tsx)
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx)
- [WooCommerceSettingsScreen.tsx](file://client/screens/WooCommerceSettingsScreen.tsx)
- [schema.ts](file://shared/schema.ts)
- [MainTabNavigator.tsx](file://client/navigation/MainTabNavigator.tsx)
- [ebay_settings_flow.yml](file://.maestro/ebay_settings_flow.yml)
- [woocommerce_settings_flow.yml](file://.maestro/woocommerce_settings_flow.yml)
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
10. [Appendices](#appendices)

## Introduction
This document explains the multi-platform marketplace publishing capabilities of the application, focusing on the unified marketplace interface that enables simultaneous publishing to eBay and WooCommerce. It covers the publishing workflow orchestration, platform selection, data transformation for each platform, settings management for multiple marketplace accounts, the publishing queue system, error handling, conflict resolution strategies, platform-specific data mapping requirements, and the user interface components for managing multi-platform listings, bulk operations, and cross-platform analytics. Best practices for coordinating listings across platforms, avoiding duplicate content issues, and maintaining consistent pricing and inventory levels are also included.

## Project Structure
The multi-platform publishing feature spans three primary layers:
- Client-side UI and orchestration: handles user interactions, settings retrieval, and publishing initiation.
- Server-side API and platform adapters: validates credentials, transforms data, and invokes external marketplace APIs.
- Shared data models: define persisted stash items and marketplace-specific flags.

```mermaid
graph TB
subgraph "Client"
UI_Item["ItemDetailsScreen.tsx"]
UI_Stash["StashScreen.tsx"]
UI_Ebay["EbaySettingsScreen.tsx"]
UI_Woo["WooCommerceSettingsScreen.tsx"]
Lib_Market["marketplace.ts"]
Nav["MainTabNavigator.tsx"]
end
subgraph "Server"
Routes["routes.ts"]
EbaySvc["ebay-service.ts"]
Schema["schema.ts"]
end
UI_Item --> Lib_Market
UI_Stash --> UI_Item
UI_Ebay --> Lib_Market
UI_Woo --> Lib_Market
Lib_Market --> Routes
Routes --> EbaySvc
Routes --> Schema
```

**Diagram sources**
- [ItemDetailsScreen.tsx](file://client/screens/ItemDetailsScreen.tsx#L148-L240)
- [StashScreen.tsx](file://client/screens/StashScreen.tsx#L93-L163)
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L27-L370)
- [WooCommerceSettingsScreen.tsx](file://client/screens/WooCommerceSettingsScreen.tsx#L26-L340)
- [marketplace.ts](file://client/lib/marketplace.ts#L81-L128)
- [routes.ts](file://server/routes.ts#L387-L647)
- [ebay-service.ts](file://server/ebay-service.ts#L1-L474)
- [schema.ts](file://shared/schema.ts#L29-L50)

**Section sources**
- [marketplace.ts](file://client/lib/marketplace.ts#L1-L129)
- [routes.ts](file://server/routes.ts#L387-L647)
- [ebay-service.ts](file://server/ebay-service.ts#L1-L474)
- [schema.ts](file://shared/schema.ts#L29-L50)

## Core Components
- Unified marketplace library: Provides typed settings retrieval and platform publishing functions for both eBay and WooCommerce.
- Server routes: Expose endpoints to publish stash items to each marketplace, validating credentials and transforming data.
- eBay service module: Encapsulates eBay API access, token refresh, and listing operations.
- Client screens: Settings screens for secure credential storage and UI for publishing and listing management.
- Shared schema: Defines stash items and marketplace publication flags.

Key responsibilities:
- Settings management: Store and retrieve credentials per platform using secure storage on native platforms and AsyncStorage on web.
- Publishing orchestration: Client triggers server endpoints with transformed data; server validates and calls platform APIs.
- Conflict prevention: Prevents duplicate publications by checking flags on stash items.
- Error handling: Returns structured errors from platform APIs and surfaces actionable messages to users.

**Section sources**
- [marketplace.ts](file://client/lib/marketplace.ts#L19-L79)
- [routes.ts](file://server/routes.ts#L387-L647)
- [ebay-service.ts](file://server/ebay-service.ts#L42-L62)
- [schema.ts](file://shared/schema.ts#L29-L50)

## Architecture Overview
The publishing workflow follows a client-initiated, server-mediated pattern:
- Client detects platform connections and item publication flags.
- Client calls server endpoints with platform credentials.
- Server validates credentials, transforms stash item data, and invokes platform APIs.
- Server updates stash item flags and returns success or error responses.

```mermaid
sequenceDiagram
participant User as "User"
participant UI as "ItemDetailsScreen.tsx"
participant Client as "marketplace.ts"
participant API as "routes.ts"
participant eBay as "ebay-service.ts"
participant DB as "schema.ts"
User->>UI : Tap "Publish to eBay"
UI->>Client : getEbaySettings()
Client-->>UI : {clientId, clientSecret, refreshToken, environment}
UI->>Client : publishToEbay(itemId, settings)
Client->>API : POST /api/stash/{itemId}/publish/ebay
API->>DB : Load stash item
API->>eBay : Exchange refresh token for access token
eBay-->>API : Access token
API->>eBay : Create inventory item + offer + publish
eBay-->>API : Listing identifiers
API->>DB : Update flags and identifiers
API-->>Client : {success, listingUrl}
Client-->>UI : Show success/error
```

**Diagram sources**
- [ItemDetailsScreen.tsx](file://client/screens/ItemDetailsScreen.tsx#L195-L240)
- [marketplace.ts](file://client/lib/marketplace.ts#L105-L128)
- [routes.ts](file://server/routes.ts#L457-L647)
- [ebay-service.ts](file://server/ebay-service.ts#L42-L62)
- [schema.ts](file://shared/schema.ts#L29-L50)

## Detailed Component Analysis

### Unified Marketplace Library
The client-side library centralizes platform credentials retrieval and publishing operations:
- Retrieves platform settings from secure storage and AsyncStorage.
- Publishes to platforms via API requests with transformed data.
- Returns structured results with success flags and optional URLs.

```mermaid
flowchart TD
Start(["Call publishToWooCommerce"]) --> GetCreds["Get WooCommerce settings"]
GetCreds --> Validate{"Settings valid?"}
Validate --> |No| ReturnErr["Return error"]
Validate --> |Yes| CallAPI["POST /api/stash/{id}/publish/woocommerce"]
CallAPI --> Resp{"Response has error?"}
Resp --> |Yes| ReturnErr
Resp --> |No| ReturnOk["Return success with productUrl"]
```

**Diagram sources**
- [marketplace.ts](file://client/lib/marketplace.ts#L81-L103)

**Section sources**
- [marketplace.ts](file://client/lib/marketplace.ts#L19-L79)
- [marketplace.ts](file://client/lib/marketplace.ts#L81-L128)

### eBay Publishing Workflow
The server orchestrates eBay publishing with token exchange and listing creation:
- Validates credentials and refresh token presence.
- Exchanges refresh token for access token.
- Creates inventory item, then offer, and publishes the listing.
- Updates stash item with listing identifiers and flags.

```mermaid
sequenceDiagram
participant API as "routes.ts"
participant eBay as "ebay-service.ts"
participant DB as "schema.ts"
API->>DB : Load stash item
API->>eBay : getAccessToken(refreshToken)
eBay-->>API : access_token
API->>eBay : PUT inventory_item/{sku}
eBay-->>API : inventory created
API->>eBay : POST offer
eBay-->>API : offerId
API->>eBay : POST offer/{offerId}/publish
eBay-->>API : listingId
API->>DB : Update flags and identifiers
API-->>Caller : {success, listingUrl}
```

**Diagram sources**
- [routes.ts](file://server/routes.ts#L457-L647)
- [ebay-service.ts](file://server/ebay-service.ts#L42-L62)
- [schema.ts](file://shared/schema.ts#L29-L50)

**Section sources**
- [routes.ts](file://server/routes.ts#L457-L647)
- [ebay-service.ts](file://server/ebay-service.ts#L42-L62)

### Settings Management
Settings are stored per platform with environment toggles and optional refresh tokens:
- eBay: Client ID, Client Secret, optional Refresh Token, environment (sandbox/production).
- WooCommerce: Store URL, Consumer Key, Consumer Secret.
- Secure storage: Uses platform-specific secure storage on native; falls back to AsyncStorage on web.

```mermaid
classDiagram
class EbaySettings {
+string clientId
+string clientSecret
+string refreshToken
+string environment
}
class WooCommerceSettings {
+string storeUrl
+string consumerKey
+string consumerSecret
}
class EbaySettingsScreen {
+loadSettings()
+saveSettings()
+testConnection()
+clearSettings()
}
class WooCommerceSettingsScreen {
+loadSettings()
+saveSettings()
+testConnection()
+clearSettings()
}
EbaySettingsScreen --> EbaySettings : "loads/saves"
WooCommerceSettingsScreen --> WooCommerceSettings : "loads/saves"
```

**Diagram sources**
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L20-L187)
- [WooCommerceSettingsScreen.tsx](file://client/screens/WooCommerceSettingsScreen.tsx#L20-L184)
- [marketplace.ts](file://client/lib/marketplace.ts#L6-L17)

**Section sources**
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L40-L110)
- [WooCommerceSettingsScreen.tsx](file://client/screens/WooCommerceSettingsScreen.tsx#L43-L106)
- [marketplace.ts](file://client/lib/marketplace.ts#L19-L79)

### UI Orchestration for Publishing
The item details screen coordinates platform publishing:
- Detects platform connection status and item publication flags.
- Initiates platform-specific publishing flows with user feedback.
- Invalidates queries to reflect updated publication state.

```mermaid
flowchart TD
OpenItem["Open ItemDetails"] --> CheckConn["Check platform connections"]
CheckConn --> PublishWoo{"WooCommerce connected<br/>and not published?"}
CheckConn --> PublishEbay{"eBay connected<br/>and not published?"}
PublishWoo --> |Yes| WooFlow["Load settings -> publish -> show result"]
PublishEbay --> |Yes| EbayFlow["Load settings -> publish -> show result"]
PublishWoo --> |No| DisabledWoo["Disable button or show message"]
PublishEbay --> |No| DisabledEbay["Disable button or show message"]
```

**Diagram sources**
- [ItemDetailsScreen.tsx](file://client/screens/ItemDetailsScreen.tsx#L98-L107)
- [ItemDetailsScreen.tsx](file://client/screens/ItemDetailsScreen.tsx#L148-L193)
- [ItemDetailsScreen.tsx](file://client/screens/ItemDetailsScreen.tsx#L195-L240)

**Section sources**
- [ItemDetailsScreen.tsx](file://client/screens/ItemDetailsScreen.tsx#L98-L107)
- [ItemDetailsScreen.tsx](file://client/screens/ItemDetailsScreen.tsx#L148-L193)
- [ItemDetailsScreen.tsx](file://client/screens/ItemDetailsScreen.tsx#L195-L240)

### Data Transformation and Mapping
Platform-specific transformations and mappings:
- eBay:
  - Token exchange using refresh token.
  - Inventory item creation with product metadata and images.
  - Offer creation with pricing, quantity, and marketplace settings.
  - Category mapping via internal map for normalized categories.
- WooCommerce:
  - REST API call with Basic auth using consumer key/secret.
  - Product creation with transformed pricing and SEO-friendly descriptions.

```mermaid
flowchart TD
LoadItem["Load stash item"] --> TransformWoo["Extract price, title, description,<br/>images, status"]
TransformWoo --> CallWoo["POST /wc/v3/products"]
CallWoo --> UpdateFlagsWoo["Update flags and identifiers"]
LoadItem --> TokenEx["Exchange refresh token"]
TokenEx --> CreateInv["PUT inventory_item/{sku}"]
CreateInv --> CreateOffer["POST offer"]
CreateOffer --> Publish["POST offer/{id}/publish"]
Publish --> UpdateFlagsEbay["Update flags and identifiers"]
```

**Diagram sources**
- [routes.ts](file://server/routes.ts#L409-L450)
- [routes.ts](file://server/routes.ts#L520-L642)
- [ebay-service.ts](file://server/ebay-service.ts#L274-L313)

**Section sources**
- [routes.ts](file://server/routes.ts#L409-L450)
- [routes.ts](file://server/routes.ts#L520-L642)
- [ebay-service.ts](file://server/ebay-service.ts#L274-L313)

### Cross-Platform Analytics and Listing Visibility
- Stash items track publication flags and identifiers for both platforms.
- UI surfaces publication badges and counts to guide bulk operations.
- Navigation integrates with tab-based browsing for scanning and listing management.

```mermaid
graph LR
Stash["Stash items (schema.ts)"] -- "publishedToWoocommerce" --> FlagsWoo["WooCommerce flag"]
Stash -- "publishedToEbay" --> FlagsEbay["eBay flag"]
Stash -- "woocommerceProductId / ebayListingId" --> Identifiers["Platform identifiers"]
UI["StashScreen.tsx"] --> FlagsWoo
UI --> FlagsEbay
```

**Diagram sources**
- [schema.ts](file://shared/schema.ts#L29-L50)
- [StashScreen.tsx](file://client/screens/StashScreen.tsx#L18-L26)

**Section sources**
- [schema.ts](file://shared/schema.ts#L29-L50)
- [StashScreen.tsx](file://client/screens/StashScreen.tsx#L18-L26)

## Dependency Analysis
The system exhibits clear separation of concerns:
- Client depends on marketplace library and UI screens.
- Marketplace library depends on secure storage and API client.
- Server routes depend on platform services and database schema.
- eBay service encapsulates platform-specific logic.

```mermaid
graph TB
Client["client/lib/marketplace.ts"] --> API["server/routes.ts"]
UI["client/screens/ItemDetailsScreen.tsx"] --> Client
API --> EbaySvc["server/ebay-service.ts"]
API --> DB["shared/schema.ts"]
UI_Settings_E["client/screens/EbaySettingsScreen.tsx"] --> Client
UI_Settings_W["client/screens/WooCommerceSettingsScreen.tsx"] --> Client
```

**Diagram sources**
- [marketplace.ts](file://client/lib/marketplace.ts#L1-L129)
- [routes.ts](file://server/routes.ts#L387-L647)
- [ebay-service.ts](file://server/ebay-service.ts#L1-L474)
- [schema.ts](file://shared/schema.ts#L29-L50)
- [ItemDetailsScreen.tsx](file://client/screens/ItemDetailsScreen.tsx#L148-L240)
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L27-L370)
- [WooCommerceSettingsScreen.tsx](file://client/screens/WooCommerceSettingsScreen.tsx#L26-L340)

**Section sources**
- [marketplace.ts](file://client/lib/marketplace.ts#L1-L129)
- [routes.ts](file://server/routes.ts#L387-L647)
- [ebay-service.ts](file://server/ebay-service.ts#L1-L474)
- [schema.ts](file://shared/schema.ts#L29-L50)

## Performance Considerations
- Minimize redundant network calls: cache platform connection status and avoid repeated settings retrieval.
- Batch operations: leverage server endpoints for bulk publishing where available.
- Asynchronous UI updates: invalidate queries after successful publishes to reduce polling overhead.
- Token caching: reuse access tokens until expiration to reduce token exchange frequency.

## Troubleshooting Guide
Common issues and resolutions:
- Missing credentials:
  - Ensure both Client ID/Secret and Refresh Token are present for eBay; Store URL, Consumer Key, and Consumer Secret for WooCommerce.
- Authentication failures:
  - Test connections from settings screens to validate credentials and environment configuration.
- Duplicate publication:
  - Server prevents re-publishing by checking publication flags; UI disables buttons accordingly.
- eBay policy requirements:
  - Business policies (shipping, payment, return) must be configured in the seller hub before listing creation.
- Network errors:
  - Inspect returned error messages from platform APIs and surface actionable alerts to users.

**Section sources**
- [routes.ts](file://server/routes.ts#L466-L470)
- [routes.ts](file://server/routes.ts#L608-L621)
- [ItemDetailsScreen.tsx](file://client/screens/ItemDetailsScreen.tsx#L151-L161)
- [ItemDetailsScreen.tsx](file://client/screens/ItemDetailsScreen.tsx#L198-L208)

## Conclusion
The multi-platform publishing system provides a unified interface for simultaneously listing items on eBay and WooCommerce. It enforces secure credential management, performs robust data transformation, and prevents conflicts through publication flags. The modular architecture supports maintainability and extensibility, while the UI ensures intuitive user control over publishing operations.

## Appendices

### Best Practices for Cross-Platform Coordination
- Avoid duplicate content:
  - Use platform-specific descriptions and titles where necessary; maintain canonical content on one platform.
- Pricing consistency:
  - Derive prices from standardized estimates and apply platform-specific rounding rules.
- Inventory synchronization:
  - Use platform identifiers to reconcile stock levels and prevent overselling.
- Conflict resolution:
  - Prefer manual override for conflicting listings; implement quarantine workflows for duplicates.
- Audit trails:
  - Track publication attempts, errors, and timestamps for diagnostics.

### Testing Automation
Automated flows validate settings entry and connection testing for both platforms.

```mermaid
sequenceDiagram
participant Maestro as ".maestro/*_settings_flow.yml"
participant UI as "Settings Screens"
participant Storage as "Secure/AsyncStorage"
Maestro->>UI : Launch app and navigate to settings
Maestro->>UI : Fill credentials and save
UI->>Storage : Persist securely
Maestro->>UI : Trigger test connection
UI-->>Maestro : Assert visibility of test/save buttons
```

**Diagram sources**
- [.maestro/ebay_settings_flow.yml](file://.maestro/ebay_settings_flow.yml#L10-L45)
- [.maestro/woocommerce_settings_flow.yml](file://.maestro/woocommerce_settings_flow.yml#L10-L45)