# eBay Integration

<cite>
**Referenced Files in This Document**
- [ENVIRONMENT.md](file://ENVIRONMENT.md)
- [marketplace.ts](file://client/lib/marketplace.ts)
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx)
- [ItemDetailsScreen.tsx](file://client/screens/ItemDetailsScreen.tsx)
- [query-client.ts](file://client/lib/query-client.ts)
- [routes.ts](file://server/routes.ts)
- [schema.ts](file://shared/schema.ts)
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
This document explains the eBay marketplace integration in the project, focusing on:
- eBay Developer Portal setup and credential management
- OAuth authentication flow and environment configuration (sandbox vs production)
- API client configuration and secure storage
- Multi-step listing process: inventory item creation, offer creation, and publishing
- eBay API endpoints used, request/response formats, and error handling
- Practical examples, credential validation, and troubleshooting common authentication and policy errors
- Condition mapping, SKU generation, and listing URL construction
- eBay-specific requirements such as business policies and merchant location keys

## Project Structure
The eBay integration spans three layers:
- Frontend (React Native) settings screen and helpers for secure credential storage and API requests
- Backend (Express) routes implementing the eBay publishing pipeline
- Shared schema modeling persisted listing state

```mermaid
graph TB
subgraph "Frontend"
UI["EbaySettingsScreen.tsx<br/>Settings UI and validation"]
MP["marketplace.ts<br/>Credential retrieval and publish helpers"]
QC["query-client.ts<br/>API client and error handling"]
end
subgraph "Backend"
RT["routes.ts<br/>POST /api/stash/:id/publish/ebay"]
end
subgraph "Shared"
DB["schema.ts<br/>stashItems: publishedToEbay, ebayListingId"]
end
UI --> MP
MP --> QC
QC --> RT
RT --> DB
```

**Diagram sources**
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L1-L370)
- [marketplace.ts](file://client/lib/marketplace.ts#L1-L129)
- [query-client.ts](file://client/lib/query-client.ts#L1-L80)
- [routes.ts](file://server/routes.ts#L298-L488)
- [schema.ts](file://shared/schema.ts#L29-L50)

**Section sources**
- [ENVIRONMENT.md](file://ENVIRONMENT.md#L63-L67)
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L1-L370)
- [marketplace.ts](file://client/lib/marketplace.ts#L1-L129)
- [query-client.ts](file://client/lib/query-client.ts#L1-L80)
- [routes.ts](file://server/routes.ts#L298-L488)
- [schema.ts](file://shared/schema.ts#L29-L50)

## Core Components
- Credential storage and retrieval:
  - Frontend stores Client ID, Client Secret, optional Refresh Token, and environment selection in secure storage (device-specific) and AsyncStorage for web fallback.
  - Backend validates presence of credentials and refresh token before attempting eBay API calls.
- Publishing workflow:
  - Frontend triggers a publish action that calls the backend endpoint with eBay credentials and environment.
  - Backend performs OAuth token exchange, creates inventory item, posts offer, publishes listing, updates database, and returns listing URL.

Key responsibilities:
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L40-L110) loads and saves credentials and environment
- [marketplace.ts](file://client/lib/marketplace.ts#L46-L79) retrieves stored credentials
- [marketplace.ts](file://client/lib/marketplace.ts#L105-L128) invokes backend publish endpoint
- [query-client.ts](file://client/lib/query-client.ts#L26-L43) wraps API requests with error handling
- [routes.ts](file://server/routes.ts#L298-L488) implements the eBay publishing pipeline
- [schema.ts](file://shared/schema.ts#L29-L50) persists listing state

**Section sources**
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L40-L110)
- [marketplace.ts](file://client/lib/marketplace.ts#L46-L79)
- [marketplace.ts](file://client/lib/marketplace.ts#L105-L128)
- [query-client.ts](file://client/lib/query-client.ts#L26-L43)
- [routes.ts](file://server/routes.ts#L298-L488)
- [schema.ts](file://shared/schema.ts#L29-L50)

## Architecture Overview
End-to-end eBay publishing flow from UI to eBay APIs:

```mermaid
sequenceDiagram
participant User as "User"
participant UI as "ItemDetailsScreen.tsx"
participant MP as "marketplace.ts"
participant QC as "query-client.ts"
participant BE as "routes.ts"
participant EB as "eBay API"
User->>UI : Tap "Publish to eBay"
UI->>MP : publishToEbay(itemId, settings)
MP->>QC : apiRequest(..., body : {clientId, clientSecret, refreshToken, environment})
QC->>BE : POST /api/stash/ : id/publish/ebay
BE->>EB : POST /identity/v1/oauth2/token (refresh_token)
EB-->>BE : {access_token}
BE->>EB : PUT /sell/inventory/v1/inventory_item/{sku}
EB-->>BE : 204 or error
BE->>EB : POST /sell/inventory/v1/offer
EB-->>BE : {offerId}
BE->>EB : POST /sell/inventory/v1/offer/{offerId}/publish
EB-->>BE : {listingId}
BE->>BE : Update stashItems (publishedToEbay, ebayListingId)
BE-->>QC : {success, listingId, listingUrl, message}
QC-->>MP : Response
MP-->>UI : {success, listingUrl}
UI-->>User : Success alert with listing URL
```

**Diagram sources**
- [ItemDetailsScreen.tsx](file://client/screens/ItemDetailsScreen.tsx#L170-L197)
- [marketplace.ts](file://client/lib/marketplace.ts#L105-L128)
- [query-client.ts](file://client/lib/query-client.ts#L26-L43)
- [routes.ts](file://server/routes.ts#L298-L488)

## Detailed Component Analysis

### eBay Settings Screen (Frontend)
- Purpose: Collect and validate eBay credentials, environment, and optional refresh token; test connection against eBay identity endpoint.
- Secure storage:
  - Stores Client ID, Client Secret, optional Refresh Token, environment, and connection status in platform-specific secure storage or AsyncStorage for web.
- Validation and UX:
  - Tests OAuth client credentials against the appropriate eBay API base URL (sandbox or production).
  - Alerts on success, invalid credentials (401), or other errors.

```mermaid
flowchart TD
Start(["Open Settings"]) --> Load["Load stored credentials and environment"]
Load --> Edit{"Edit fields?"}
Edit --> |Yes| Save["Save to secure storage"]
Edit --> |No| Test{"Test connection?"}
Save --> Test
Test --> |Yes| CallAPI["Fetch /identity/v1/oauth2/token<br/>grant_type=client_credentials"]
CallAPI --> Resp{"HTTP 200 OK?"}
Resp --> |Yes| Success["Alert 'Connected'"]
Resp --> |No| Error["Alert error details"]
Test --> |No| Disconnect{"Disconnect?"}
Disconnect --> Clear["Remove stored keys and status"]
```

**Diagram sources**
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L40-L110)
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L118-L150)

**Section sources**
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L40-L110)
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L118-L150)

### Credential Retrieval and Publish Helpers (Frontend)
- Retrieves stored eBay settings (environment, credentials) and invokes backend publish endpoint.
- Returns structured results with success flag, optional listing URL, and error message.

```mermaid
flowchart TD
Get(["getEbaySettings()"]) --> CheckEnv["Check environment and status"]
CheckEnv --> HasCreds{"Has Client ID + Secret?"}
HasCreds --> |No| Null["Return null"]
HasCreds --> |Yes| Return["Return {clientId, clientSecret, refreshToken, environment}"]
Publish(["publishToEbay(itemId, settings)"]) --> CallAPI["apiRequest('/api/stash/:id/publish/ebay', settings)"]
CallAPI --> Resp{"Response has error?"}
Resp --> |Yes| Fail["Return {success: false, error}"]
Resp --> |No| Ok["Return {success: true, listingUrl}"]
```

**Diagram sources**
- [marketplace.ts](file://client/lib/marketplace.ts#L46-L79)
- [marketplace.ts](file://client/lib/marketplace.ts#L105-L128)
- [query-client.ts](file://client/lib/query-client.ts#L26-L43)

**Section sources**
- [marketplace.ts](file://client/lib/marketplace.ts#L46-L79)
- [marketplace.ts](file://client/lib/marketplace.ts#L105-L128)
- [query-client.ts](file://client/lib/query-client.ts#L26-L43)

### eBay Publishing Pipeline (Backend)
- Validates credentials and refresh token; prevents duplicate listings.
- Exchanges refresh token for access token using eBay identity endpoint.
- Creates inventory item with mapped condition and product metadata.
- Posts offer with pricing, policies placeholders, and merchant location key.
- Publishes offer and records listing ID; constructs listing URL based on environment.

```mermaid
flowchart TD
Start(["POST /api/stash/:id/publish/ebay"]) --> Validate["Validate clientId, clientSecret, refreshToken"]
Validate --> FetchItem["Fetch stash item by id"]
FetchItem --> Exists{"Item exists and not published?"}
Exists --> |No| Err400["Return 400/404"]
Exists --> |Yes| Token["POST /identity/v1/oauth2/token (refresh_token)"]
Token --> TokOK{"Token OK?"}
TokOK --> |No| TokErr["Return error with description"]
TokOK --> |Yes| AccessToken["Use access_token"]
AccessToken --> Inv["PUT /sell/inventory/v1/inventory_item/{sku}"]
Inv --> InvOK{"204 or OK?"}
InvOK --> |No| InvErr["Return inventory error"]
InvOK --> Offer["POST /sell/inventory/v1/offer"]
Offer --> OfferResp{"Offer OK or 201?"}
OfferResp --> |No| OfferErr["Parse errors; detect policy requirement"]
OfferErr --> |Policy required| PolicyErr["Return policy setup message"]
OfferErr --> |Other| OfferErr2["Return offer error"]
OfferResp --> |Yes| OfferId["Extract offerId"]
OfferId --> Pub["POST /sell/inventory/v1/offer/{offerId}/publish"]
Pub --> PubOK{"Publish OK?"}
PubOK --> |Yes| ListingId["Extract listingId"]
PubOK --> |No| SkipPub["Continue without listingId"]
ListingId --> Update["Update stashItems: publishedToEbay=true, ebayListingId"]
SkipPub --> Update
Update --> Url["Build listing URL (prod/sandbox)"]
Url --> Done["Return {success, listingId, listingUrl, message}"]
```

**Diagram sources**
- [routes.ts](file://server/routes.ts#L298-L488)

**Section sources**
- [routes.ts](file://server/routes.ts#L298-L488)

### Data Model and State Persistence
- The stash items table tracks whether an item has been published to eBay and stores the eBay listing identifier.

```mermaid
erDiagram
STASH_ITEMS {
int id PK
string user_id FK
string title
string description
string category
string estimated_value
string condition
string[] tags
string full_image_url
string label_image_url
jsonb ai_analysis
string seo_title
string seo_description
string[] seo_keywords
boolean published_to_woocommerce
boolean published_to_ebay
string woocommerce_product_id
string ebay_listing_id
timestamp created_at
timestamp updated_at
}
```

**Diagram sources**
- [schema.ts](file://shared/schema.ts#L29-L50)

**Section sources**
- [schema.ts](file://shared/schema.ts#L29-L50)

## Dependency Analysis
- Frontend depends on:
  - Secure storage for credentials
  - API client for backend communication
  - eBay identity and inventory endpoints
- Backend depends on:
  - eBay identity and inventory endpoints
  - Database to persist listing state
- Environment configuration:
  - Sandbox vs production base URLs selected by environment setting

```mermaid
graph LR
UI["EbaySettingsScreen.tsx"] --> SEC["SecureStore/AsyncStorage"]
UI --> MP["marketplace.ts"]
MP --> QC["query-client.ts"]
QC --> BE["routes.ts"]
BE --> EB["eBay API"]
BE --> DB["stashItems (schema.ts)"]
```

**Diagram sources**
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L1-L370)
- [marketplace.ts](file://client/lib/marketplace.ts#L1-L129)
- [query-client.ts](file://client/lib/query-client.ts#L1-L80)
- [routes.ts](file://server/routes.ts#L298-L488)
- [schema.ts](file://shared/schema.ts#L29-L50)

**Section sources**
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L1-L370)
- [marketplace.ts](file://client/lib/marketplace.ts#L1-L129)
- [query-client.ts](file://client/lib/query-client.ts#L1-L80)
- [routes.ts](file://server/routes.ts#L298-L488)
- [schema.ts](file://shared/schema.ts#L29-L50)

## Performance Considerations
- Network retries: The API client disables retries by default; handle transient failures gracefully in UI.
- Token reuse: Access tokens are requested per publish operation; avoid unnecessary repeated calls.
- Image handling: Ensure images are optimized to reduce payload sizes for inventory item creation.
- Environment selection: Prefer sandbox during development to minimize API usage and risk.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide

Common authentication errors:
- Missing credentials: Ensure Client ID and Client Secret are present before testing or publishing.
- Invalid credentials: The identity endpoint returns 401 when Client ID/Secret are wrong; verify in the eBay Developer Portal.
- Refresh token required: Publishing requires a user OAuth refresh token; without it, the backend returns a clear error instructing to generate one.

Business policies configuration:
- If the offer creation fails with policy-related errors, configure shipping, payment, and return policies in your eBay Seller Hub before listing.

Environment configuration:
- Toggle between sandbox and production in the settings screen; the base URLs change accordingly.

Credential validation tips:
- Use the “Test Connection” button to validate Client ID and Client Secret against the selected environment.
- On web, credentials are stored in AsyncStorage; for best security, use the mobile app.

Error handling in code:
- Frontend helpers return structured error messages; display them to the user.
- Backend routes return descriptive errors for token failures, inventory errors, offer errors, and policy requirements.

Practical checks:
- Confirm the item exists and has not already been published.
- Verify eBay listing conditions and pricing derived from item metadata.
- Ensure the merchant location key is set appropriately if required by your account configuration.

**Section sources**
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L118-L150)
- [routes.ts](file://server/routes.ts#L303-L311)
- [routes.ts](file://server/routes.ts#L449-L462)
- [routes.ts](file://server/routes.ts#L453-L457)
- [ItemDetailsScreen.tsx](file://client/screens/ItemDetailsScreen.tsx#L189-L191)

## Conclusion
The eBay integration provides a secure, end-to-end publishing pipeline:
- Credentials are stored securely and validated before use.
- The backend orchestrates OAuth, inventory creation, offer posting, and publishing.
- The UI surfaces environment selection, credential management, and publishing feedback.
- Robust error handling and environment-aware endpoints support both development and production workflows.

[No sources needed since this section summarizes without analyzing specific files]