# Profile Management

<cite>
**Referenced Files in This Document**
- [ProfileScreen.tsx](file://client/screens/ProfileScreen.tsx)
- [SettingsScreen.tsx](file://client/screens/SettingsScreen.tsx)
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx)
- [WooCommerceSettingsScreen.tsx](file://client/screens/WooCommerceSettingsScreen.tsx)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx)
- [useAuth.ts](file://client/hooks/useAuth.ts)
- [supabase.ts](file://client/lib/supabase.ts)
- [types.ts](file://shared/types.ts)
- [schema.ts](file://shared/schema.ts)
- [db.ts](file://server/db.ts)
- [drizzle.config.ts](file://drizzle.config.ts)
- [0001_flipagent_tables.sql](file://migrations/0001_flipagent_tables.sql)
- [0002_rls_policies.sql](file://migrations/0002_rls_policies.sql)
- [ProfileStackNavigator.tsx](file://client/navigation/ProfileStackNavigator.tsx)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx)
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
This document describes profile management and personal settings in Hidden-Gem. It covers:
- The profile and settings surfaces
- Authentication integration with Supabase
- Marketplace integrations (WooCommerce and eBay)
- Profile data structures and database relationships
- Real-time behavior and RLS policies
- Validation, form handling, and error management
- Privacy and data lifecycle topics (export/deletion)

Where relevant, we map UI flows to actual source files and highlight how Supabase-backed user sessions and server-side RLS protect data.

## Project Structure
Profile and settings functionality spans client screens, navigation, authentication, and shared data models. The server uses Drizzle ORM with PostgreSQL and applies row-level security policies.

```mermaid
graph TB
subgraph "Client"
Nav["Navigation<br/>Root & Profile stacks"]
AuthC["AuthContext"]
Hooks["useAuth hook"]
SupabaseLib["Supabase client"]
Screens["Screens<br/>Profile, Settings,<br/>WooCommerce, eBay"]
end
subgraph "Shared"
Types["Types & Interfaces"]
Schema["Drizzle Schema"]
end
subgraph "Server"
DB["Drizzle DB"]
Migs["Migrations"]
end
Nav --> Screens
Screens --> AuthC
AuthC --> Hooks
Hooks --> SupabaseLib
Screens --> Types
Types --> Schema
Schema --> DB
DB --> Migs
```

**Diagram sources**
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L34-L131)
- [ProfileStackNavigator.tsx](file://client/navigation/ProfileStackNavigator.tsx#L13-L26)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L12-L38)
- [supabase.ts](file://client/lib/supabase.ts#L20-L38)
- [SettingsScreen.tsx](file://client/screens/SettingsScreen.tsx#L76-L189)
- [WooCommerceSettingsScreen.tsx](file://client/screens/WooCommerceSettingsScreen.tsx#L26-L339)
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L27-L369)
- [types.ts](file://shared/types.ts#L75-L100)
- [schema.ts](file://shared/schema.ts#L14-L27)
- [db.ts](file://server/db.ts#L1-L19)
- [drizzle.config.ts](file://drizzle.config.ts#L11-L18)
- [0001_flipagent_tables.sql](file://migrations/0001_flipagent_tables.sql#L5-L77)
- [0002_rls_policies.sql](file://migrations/0002_rls_policies.sql#L6-L65)

**Section sources**
- [ProfileScreen.tsx](file://client/screens/ProfileScreen.tsx#L9-L26)
- [SettingsScreen.tsx](file://client/screens/SettingsScreen.tsx#L76-L189)
- [WooCommerceSettingsScreen.tsx](file://client/screens/WooCommerceSettingsScreen.tsx#L26-L339)
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L27-L369)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L12-L38)
- [supabase.ts](file://client/lib/supabase.ts#L20-L38)
- [types.ts](file://shared/types.ts#L75-L100)
- [schema.ts](file://shared/schema.ts#L14-L27)
- [db.ts](file://server/db.ts#L1-L19)
- [drizzle.config.ts](file://drizzle.config.ts#L11-L18)
- [0001_flipagent_tables.sql](file://migrations/0001_flipagent_tables.sql#L5-L77)
- [0002_rls_policies.sql](file://migrations/0002_rls_policies.sql#L6-L65)

## Core Components
- Profile screen: renders a scrollable container and theme-aware layout.
- Settings screen: displays account header, marketplace connections, and app info.
- Marketplace settings screens: manage credentials and connection status for WooCommerce and eBay.
- Authentication: Supabase-based session management with OAuth and local persistence.
- Shared types and schema: define user settings and marketplace integration records.

Key responsibilities:
- ProfileScreen: UI scaffold for profile content.
- SettingsScreen: aggregates account actions and marketplace status.
- useAuth + AuthContext: provide session and sign-out.
- Supabase client: handles auth state and redirects.
- Marketplace screens: validate inputs, persist securely, test connectivity, and clear settings.

**Section sources**
- [ProfileScreen.tsx](file://client/screens/ProfileScreen.tsx#L9-L26)
- [SettingsScreen.tsx](file://client/screens/SettingsScreen.tsx#L76-L189)
- [WooCommerceSettingsScreen.tsx](file://client/screens/WooCommerceSettingsScreen.tsx#L68-L106)
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L75-L110)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L40-L70)
- [supabase.ts](file://client/lib/supabase.ts#L20-L38)

## Architecture Overview
The profile and settings architecture integrates client-side navigation and screens with Supabase authentication and server-side data via Drizzle.

```mermaid
sequenceDiagram
participant User as "User"
participant Nav as "Root Navigator"
participant ProfileNav as "Profile Stack"
participant Profile as "Profile Screen"
participant Settings as "Settings Screen"
participant Auth as "AuthContext/useAuth"
participant Supabase as "Supabase Client"
participant DB as "Server DB"
User->>Nav : Open app
Nav->>Auth : Initialize session
Auth->>Supabase : getSession()
Supabase-->>Auth : Session/User
Auth-->>Nav : isAuthenticated=true/false
Nav->>ProfileNav : Render stack
ProfileNav->>Profile : Show Profile
User->>Settings : Open Settings
Settings->>Auth : signOut()
Auth->>Supabase : auth.signOut()
Supabase-->>Auth : Success/Error
Auth-->>Settings : Updated session state
Settings-->>DB : Read/Write user settings (RLS)
```

**Diagram sources**
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L34-L131)
- [ProfileStackNavigator.tsx](file://client/navigation/ProfileStackNavigator.tsx#L13-L26)
- [ProfileScreen.tsx](file://client/screens/ProfileScreen.tsx#L9-L26)
- [SettingsScreen.tsx](file://client/screens/SettingsScreen.tsx#L110-L128)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L64-L70)
- [supabase.ts](file://client/lib/supabase.ts#L20-L38)
- [schema.ts](file://shared/schema.ts#L14-L27)
- [0002_rls_policies.sql](file://migrations/0002_rls_policies.sql#L13-L47)

## Detailed Component Analysis

### Profile Screen
- Purpose: Provides a themed scroll container for profile content.
- Behavior: Uses safe area insets, header height, and tab bar height to compute content insets. Applies theme background and spacing.

```mermaid
flowchart TD
Start(["Render ProfileScreen"]) --> Insets["Compute Safe Area Insets"]
Insets --> Header["Get Header Height"]
Header --> TabBar["Get Bottom Tab Bar Height"]
TabBar --> Theme["Resolve Theme"]
Theme --> Layout["Configure ScrollView Style"]
Layout --> End(["Render Content Container"])
```

**Diagram sources**
- [ProfileScreen.tsx](file://client/screens/ProfileScreen.tsx#L9-L26)

**Section sources**
- [ProfileScreen.tsx](file://client/screens/ProfileScreen.tsx#L9-L26)

### Settings Screen
- Purpose: Central hub for account actions and marketplace integrations.
- Features:
  - Account header with avatar and email.
  - Sign-out with confirmation.
  - Marketplace integration rows with connection status badges.
- Navigation: Links to AI providers, terms, privacy, and marketplace settings screens.

```mermaid
sequenceDiagram
participant User as "User"
participant Settings as "SettingsScreen"
participant Auth as "AuthContext/useAuth"
participant Supabase as "Supabase Client"
User->>Settings : Tap "Sign Out"
Settings->>Settings : Show confirmation dialog
alt Confirmed
Settings->>Auth : signOut()
Auth->>Supabase : auth.signOut()
Supabase-->>Auth : Result
Auth-->>Settings : Update state
Settings-->>User : Signed out
else Cancelled
Settings-->>User : No action
end
```

**Diagram sources**
- [SettingsScreen.tsx](file://client/screens/SettingsScreen.tsx#L110-L128)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L64-L70)

**Section sources**
- [SettingsScreen.tsx](file://client/screens/SettingsScreen.tsx#L76-L189)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L64-L70)

### Supabase Authentication Integration
- Client initialization: Creates a Supabase client with platform-specific storage and auto-refresh.
- Auth state: Subscribes to auth state changes and exposes sign-in/sign-up/sign-out.
- Redirect handling: Configures redirect URLs for web and native platforms.

```mermaid
sequenceDiagram
participant App as "App"
participant Supabase as "Supabase Client"
participant Storage as "AsyncStorage/Web"
participant Browser as "WebBrowser/Native"
App->>Supabase : createClient(url, key, { auth options })
Supabase->>Storage : Setup persistence (native)
App->>Supabase : auth.getSession()
Supabase-->>App : Session
App->>Supabase : auth.onAuthStateChange(subscribe)
App->>Supabase : signInWithOAuth / signInWithPassword
alt Web
Supabase-->>App : Redirect to provider
else Native
Supabase-->>App : OAuth URL
App->>Browser : Open Auth Session
Browser-->>App : Callback with code/access tokens
App->>Supabase : exchangeCodeForSession or setSession
end
```

**Diagram sources**
- [supabase.ts](file://client/lib/supabase.ts#L20-L38)
- [useAuth.ts](file://client/hooks/useAuth.ts#L72-L137)

**Section sources**
- [supabase.ts](file://client/lib/supabase.ts#L20-L38)
- [useAuth.ts](file://client/hooks/useAuth.ts#L12-L38)
- [useAuth.ts](file://client/hooks/useAuth.ts#L40-L70)
- [useAuth.ts](file://client/hooks/useAuth.ts#L72-L137)

### Marketplace Settings: WooCommerce
- Purpose: Store and validate WooCommerce credentials and store URL.
- Inputs: Store URL, Consumer Key, Consumer Secret.
- Persistence: Securely stores credentials depending on platform; tests connectivity via REST API.
- Actions: Save, Test Connection, Disconnect.

```mermaid
flowchart TD
Load["Load Settings"] --> ValidateInputs["Validate Required Fields"]
ValidateInputs --> |Missing| Prompt["Alert: Fill required fields"]
ValidateInputs --> |OK| Save["Save to AsyncStorage/SecureStore"]
Save --> Test["Test Connection via REST API"]
Test --> Result{"Response OK?"}
Result --> |Yes| Success["Alert: Success"]
Result --> |No| Failure["Alert: Error details"]
Save --> Clear["Clear Settings (optional)"]
```

**Diagram sources**
- [WooCommerceSettingsScreen.tsx](file://client/screens/WooCommerceSettingsScreen.tsx#L43-L106)
- [WooCommerceSettingsScreen.tsx](file://client/screens/WooCommerceSettingsScreen.tsx#L108-L146)
- [WooCommerceSettingsScreen.tsx](file://client/screens/WooCommerceSettingsScreen.tsx#L148-L180)

**Section sources**
- [WooCommerceSettingsScreen.tsx](file://client/screens/WooCommerceSettingsScreen.tsx#L26-L339)

### Marketplace Settings: eBay
- Purpose: Store and validate eBay credentials and environment.
- Inputs: Client ID, Client Secret, optional Refresh Token; environment toggle (sandbox/production).
- Persistence: Securely stores credentials depending on platform; tests connectivity via OAuth token endpoint.
- Actions: Save, Test Connection, Disconnect.

```mermaid
flowchart TD
Init["Initialize Form"] --> Load["Load Settings from Storage"]
Load --> Env["Set Environment"]
Env --> Inputs["Collect Credentials"]
Inputs --> Save["Save to AsyncStorage/SecureStore"]
Save --> Test["POST OAuth Token Endpoint"]
Test --> Status{"HTTP 200?"}
Status --> |Yes| Connected["Alert: Connected to eBay"]
Status --> |No| Error["Alert: Authentication or Connection Failed"]
Save --> Clear["Clear Settings (optional)"]
```

**Diagram sources**
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L40-L73)
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L112-L150)
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L152-L187)

**Section sources**
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L27-L369)

### Profile Data Model and Database Relationships
- User settings table: Stores per-user preferences and marketplace tokens.
- Integrations table: Stores marketplace access tokens and credentials.
- RLS policies: Enforce row-level access based on the authenticated user’s session.

```mermaid
erDiagram
USERS {
varchar id PK
text username UK
text password
}
USER_SETTINGS {
int id PK
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
INTEGRATIONS {
uuid id PK
uuid seller_id FK
text service
text access_token
text refresh_token
timestamp token_expires_at
jsonb credentials
boolean is_active
timestamp last_synced_at
int sync_count
timestamp created_at
timestamp updated_at
}
SELLERS {
uuid id PK
varchar user_id FK
text shop_name
text shop_description
text avatar_url
text stripe_customer_id
text subscription_tier
timestamp subscription_expires_at
timestamp created_at
timestamp updated_at
}
PRODUCTS {
uuid id PK
uuid seller_id FK
text sku
text title
text description
text brand
text style_name
text category
text condition
decimal price
decimal cost
decimal estimated_profit
jsonb images
jsonb attributes
text[] tags
jsonb listings
jsonb sync_status
timestamp sync_last_at
timestamp created_at
timestamp updated_at
}
LISTINGS {
uuid id PK
uuid seller_id FK
uuid product_id FK
text marketplace
text marketplace_id
text title
text description
text[] seo_tags
text category_id
text sku
decimal price
int quantity
text status
timestamp published_at
text sync_error
jsonb raw_api_response
timestamp created_at
timestamp updated_at
}
USERS ||--o| USER_SETTINGS : "has"
USERS ||--o| SELLERS : "owns"
SELLERS ||--o{ PRODUCTS : "owns"
SELLERS ||--o{ LISTINGS : "publishes"
INTEGRATIONS }o--|| SELLERS : "belongs_to"
```

**Diagram sources**
- [schema.ts](file://shared/schema.ts#L6-L12)
- [schema.ts](file://shared/schema.ts#L14-L27)
- [schema.ts](file://shared/schema.ts#L115-L126)
- [schema.ts](file://shared/schema.ts#L128-L151)
- [schema.ts](file://shared/schema.ts#L153-L172)
- [schema.ts](file://shared/schema.ts#L205-L220)

**Section sources**
- [schema.ts](file://shared/schema.ts#L14-L27)
- [schema.ts](file://shared/schema.ts#L115-L126)
- [schema.ts](file://shared/schema.ts#L128-L151)
- [schema.ts](file://shared/schema.ts#L153-L172)
- [schema.ts](file://shared/schema.ts#L205-L220)
- [types.ts](file://shared/types.ts#L75-L100)

### Real-Time Updates and RLS
- Real-time behavior: Supabase auth state subscriptions propagate session changes to the UI.
- RLS enforcement: Policies restrict access to seller-owned rows, ensuring isolation between users.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Supabase as "Supabase"
participant Policy as "RLS Policies"
participant DB as "PostgreSQL"
Client->>Supabase : auth.onAuthStateChange()
Supabase-->>Client : Session events
Client->>DB : Query tables (e.g., user_settings)
DB->>Policy : Enforce policies using auth.uid()
Policy-->>DB : Filter rows by ownership
DB-->>Client : Results
```

**Diagram sources**
- [useAuth.ts](file://client/hooks/useAuth.ts#L31-L35)
- [0002_rls_policies.sql](file://migrations/0002_rls_policies.sql#L13-L47)

**Section sources**
- [useAuth.ts](file://client/hooks/useAuth.ts#L31-L35)
- [0002_rls_policies.sql](file://migrations/0002_rls_policies.sql#L13-L47)

## Dependency Analysis
- Client navigation depends on AuthContext to decide whether to show Auth or Main stacks.
- SettingsScreen depends on AuthContext for sign-out and on AsyncStorage to reflect marketplace statuses.
- Marketplace screens depend on platform-specific secure storage and AsyncStorage for persistence.
- Server-side data access relies on Drizzle ORM and RLS policies enforced by the database.

```mermaid
graph LR
Root["RootStackNavigator"] --> AuthCtx["AuthContext"]
Root --> Settings["SettingsScreen"]
Settings --> AuthCtx
Settings --> WC["WooCommerceSettingsScreen"]
Settings --> EB["EbaySettingsScreen"]
WC --> SecureStore["SecureStore/AsyncStorage"]
EB --> SecureStore
AuthCtx --> UseAuth["useAuth"]
UseAuth --> Supabase["Supabase Client"]
Supabase --> DB["Drizzle DB"]
DB --> Schema["Schema & Migrations"]
```

**Diagram sources**
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L34-L131)
- [SettingsScreen.tsx](file://client/screens/SettingsScreen.tsx#L76-L189)
- [WooCommerceSettingsScreen.tsx](file://client/screens/WooCommerceSettingsScreen.tsx#L26-L339)
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L27-L369)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L12-L38)
- [supabase.ts](file://client/lib/supabase.ts#L20-L38)
- [db.ts](file://server/db.ts#L1-L19)
- [schema.ts](file://shared/schema.ts#L14-L27)

**Section sources**
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L34-L131)
- [SettingsScreen.tsx](file://client/screens/SettingsScreen.tsx#L76-L189)
- [WooCommerceSettingsScreen.tsx](file://client/screens/WooCommerceSettingsScreen.tsx#L26-L339)
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L27-L369)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L12-L38)
- [supabase.ts](file://client/lib/supabase.ts#L20-L38)
- [db.ts](file://server/db.ts#L1-L19)
- [schema.ts](file://shared/schema.ts#L14-L27)

## Performance Considerations
- Minimize unnecessary re-renders by using memoized callbacks and stable references in settings screens.
- Defer heavy operations (e.g., network requests to marketplace APIs) to background threads and avoid blocking the UI.
- Use optimistic updates for quick feedback when saving settings, with rollback on failure.
- Keep stored secrets encrypted at rest using platform-specific secure storage on native platforms.

## Troubleshooting Guide
Common issues and resolutions:
- Supabase not configured: Ensure environment variables for Supabase URL and anon key are present. The client warns when missing.
- OAuth failures: Verify redirect URLs and browser session handling on native platforms.
- Marketplace connectivity errors:
  - Confirm required fields are filled before testing.
  - Check that REST API endpoints are reachable and credentials are correct.
  - For eBay, verify environment selection and token endpoint response.
- Sign-out errors: Catch and surface errors from Supabase sign-out; confirm auth state updates.

**Section sources**
- [supabase.ts](file://client/lib/supabase.ts#L20-L38)
- [useAuth.ts](file://client/hooks/useAuth.ts#L72-L137)
- [WooCommerceSettingsScreen.tsx](file://client/screens/WooCommerceSettingsScreen.tsx#L108-L146)
- [EbaySettingsScreen.tsx](file://client/screens/EbaySettingsScreen.tsx#L112-L150)
- [SettingsScreen.tsx](file://client/screens/SettingsScreen.tsx#L110-L128)

## Conclusion
Hidden-Gem’s profile and settings system integrates Supabase authentication with marketplace configuration screens. User settings and marketplace tokens are persisted securely, while server-side RLS ensures data isolation. The architecture supports real-time auth state changes and provides robust validation and error handling for profile and marketplace operations.

## Appendices

### Profile Data Structures
- User settings record: includes AI provider preferences and marketplace tokens.
- Integration record: stores access tokens and credentials for marketplace services.

**Section sources**
- [schema.ts](file://shared/schema.ts#L14-L27)
- [schema.ts](file://shared/schema.ts#L205-L220)
- [types.ts](file://shared/types.ts#L75-L100)

### Example Operations and Queries
- Read user settings: select from user_settings by user_id.
- Upsert user settings: insert/update user_settings with userId foreign key.
- List integrations: select from integrations by seller_id.
- Create integration: insert into integrations with service and tokens.

Note: These describe typical operations; consult the schema and server-side code for exact column names and constraints.

**Section sources**
- [schema.ts](file://shared/schema.ts#L14-L27)
- [schema.ts](file://shared/schema.ts#L205-L220)
- [0001_flipagent_tables.sql](file://migrations/0001_flipagent_tables.sql#L63-L77)
- [0002_rls_policies.sql](file://migrations/0002_rls_policies.sql#L13-L47)

### Privacy, Export, and Deletion
- Privacy settings: RLS policies restrict access to user-owned rows. Consider adding explicit privacy toggles in user_settings if needed.
- Data export: Implement server endpoints to export user_settings and related marketplace data for supported services.
- Deletion: Cascading deletes on user_settings and integrations ensure cleanup when a user account is removed.

**Section sources**
- [0002_rls_policies.sql](file://migrations/0002_rls_policies.sql#L13-L47)
- [schema.ts](file://shared/schema.ts#L14-L27)
- [schema.ts](file://shared/schema.ts#L205-L220)