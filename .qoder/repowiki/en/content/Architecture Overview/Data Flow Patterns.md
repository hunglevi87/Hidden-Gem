# Data Flow Patterns

<cite>
**Referenced Files in This Document**
- [App.tsx](file://client/App.tsx)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx)
- [ScanScreen.tsx](file://client/screens/ScanScreen.tsx)
- [AnalysisScreen.tsx](file://client/screens/AnalysisScreen.tsx)
- [StashScreen.tsx](file://client/screens/StashScreen.tsx)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx)
- [useAuth.ts](file://client/hooks/useAuth.ts)
- [supabase.ts](file://client/lib/supabase.ts)
- [query-client.ts](file://client/lib/query-client.ts)
- [marketplace.ts](file://client/lib/marketplace.ts)
- [index.ts](file://server/index.ts)
- [routes.ts](file://server/routes.ts)
- [db.ts](file://server/db.ts)
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
This document explains the end-to-end data flow in Hidden-Gem, from mobile camera capture through image processing and AI analysis, to database storage and marketplace publishing. It also covers request-response patterns, authentication and session management, API key handling, data validation, React Query state management, error propagation, loading states, offline-first strategies, and synchronization mechanisms.

## Project Structure
The application follows a clear separation of concerns:
- Client (React Native) handles UI, navigation, authentication, local caching via React Query, and marketplace integrations.
- Server (Express) exposes REST endpoints for articles, stash items, AI analysis, and marketplace publishing.
- Shared schema defines database models used by both client and server.
- Supabase manages authentication and session persistence.

```mermaid
graph TB
subgraph "Client"
A_App["App.tsx"]
A_Nav["RootStackNavigator.tsx"]
A_Scan["ScanScreen.tsx"]
A_Analysis["AnalysisScreen.tsx"]
A_Stash["StashScreen.tsx"]
A_AuthCtx["AuthContext.tsx"]
A_UseAuth["useAuth.ts"]
A_Supa["supabase.ts"]
A_Query["query-client.ts"]
A_Mkt["marketplace.ts"]
end
subgraph "Server"
S_Index["index.ts"]
S_Routes["routes.ts"]
S_DB["db.ts"]
end
subgraph "Shared"
X_Schema["schema.ts"]
end
A_App --> A_Nav
A_Nav --> A_Scan
A_Scan --> A_Analysis
A_Analysis --> A_Query
A_Analysis --> A_Mkt
A_Stash --> A_Query
A_AuthCtx --> A_UseAuth
A_UseAuth --> A_Supa
A_Query --> S_Index
A_Mkt --> S_Index
S_Index --> S_Routes
S_Routes --> S_DB
S_DB --> X_Schema
```

**Diagram sources**
- [App.tsx](file://client/App.tsx#L30-L49)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L32-L122)
- [ScanScreen.tsx](file://client/screens/ScanScreen.tsx#L17-L217)
- [AnalysisScreen.tsx](file://client/screens/AnalysisScreen.tsx#L29-L261)
- [StashScreen.tsx](file://client/screens/StashScreen.tsx#L93-L162)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L12-L150)
- [supabase.ts](file://client/lib/supabase.ts#L20-L38)
- [query-client.ts](file://client/lib/query-client.ts#L7-L79)
- [marketplace.ts](file://client/lib/marketplace.ts#L81-L128)
- [index.ts](file://server/index.ts#L224-L246)
- [routes.ts](file://server/routes.ts#L24-L492)
- [db.ts](file://server/db.ts#L1-L19)
- [schema.ts](file://shared/schema.ts#L1-L122)

**Section sources**
- [App.tsx](file://client/App.tsx#L30-L49)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L32-L122)
- [index.ts](file://server/index.ts#L224-L246)

## Core Components
- Authentication and session management via Supabase with persistent sessions and OAuth support.
- React Query for caching, synchronization, and optimistic updates.
- Marketplace integrations for WooCommerce and eBay using secure local storage for credentials.
- Server-side AI analysis powered by Gemini and marketplace APIs for publishing.

Key responsibilities:
- Client initialization and theme wiring.
- Navigation and conditional auth gating.
- Camera capture and image selection.
- AI-powered analysis and saving results to stash.
- Listing publication to marketplaces.
- Database access via Drizzle ORM.

**Section sources**
- [supabase.ts](file://client/lib/supabase.ts#L20-L38)
- [useAuth.ts](file://client/hooks/useAuth.ts#L12-L150)
- [query-client.ts](file://client/lib/query-client.ts#L66-L79)
- [marketplace.ts](file://client/lib/marketplace.ts#L19-L79)
- [routes.ts](file://server/routes.ts#L11-L17)

## Architecture Overview
The system uses a client-server architecture with a React Native client and an Express server. The client authenticates users, captures images, sends them to the server for AI analysis, persists results to the database, and publishes listings to external marketplaces.

```mermaid
sequenceDiagram
participant U as "User"
participant RN as "React Native Client"
participant NAV as "Navigation"
participant SCAN as "ScanScreen"
participant AN as "AnalysisScreen"
participant Q as "React Query"
participant SRV as "Express Server"
participant AI as "Gemini AI"
participant DB as "PostgreSQL"
U->>NAV : Open app
NAV->>RN : Render stack
RN->>SCAN : Navigate to Scan
SCAN->>U : Capture full item + label images
SCAN->>AN : Navigate with image URIs
AN->>SRV : POST /api/analyze (multipart/form-data)
SRV->>AI : Generate content (JSON response)
AI-->>SRV : JSON analysis
SRV-->>AN : Analysis result
AN->>Q : Mutation to POST /api/stash
Q->>SRV : POST /api/stash
SRV->>DB : INSERT stash item
DB-->>SRV : New item
SRV-->>Q : 201 + item
Q-->>AN : Invalidate stash queries
AN-->>U : Show saved confirmation
```

**Diagram sources**
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L49-L83)
- [ScanScreen.tsx](file://client/screens/ScanScreen.tsx#L26-L62)
- [AnalysisScreen.tsx](file://client/screens/AnalysisScreen.tsx#L62-L112)
- [routes.ts](file://server/routes.ts#L140-L226)
- [db.ts](file://server/db.ts#L1-L19)

## Detailed Component Analysis

### Authentication and Session Management
- Supabase client is initialized with environment variables and platform-specific storage.
- Persistent sessions are enabled; OAuth flows support browser redirects and token exchange.
- Auth context exposes session, user, loading state, and sign-in/sign-out helpers.

```mermaid
sequenceDiagram
participant RN as "Client"
participant AUTH as "useAuth.ts"
participant SB as "supabase.ts"
participant SUPA as "Supabase Auth"
participant STORE as "AsyncStorage/SecureStore"
RN->>AUTH : Initialize
AUTH->>SB : Get redirect URL and config
AUTH->>SUPA : getSession()
SUPA-->>AUTH : Session
AUTH->>STORE : Persist session (autoRefreshToken=true)
AUTH-->>RN : { session, user, loading=false }
RN->>AUTH : signIn/signUp/signOut
AUTH->>SUPA : Auth operations
SUPA-->>AUTH : Results/errors
AUTH-->>RN : Updated session state
```

**Diagram sources**
- [useAuth.ts](file://client/hooks/useAuth.ts#L17-L38)
- [supabase.ts](file://client/lib/supabase.ts#L20-L38)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)

**Section sources**
- [supabase.ts](file://client/lib/supabase.ts#L20-L38)
- [useAuth.ts](file://client/hooks/useAuth.ts#L12-L150)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)

### Camera Capture and Image Selection
- Uses camera permissions and device camera/image picker.
- Two-step capture: full item image followed by label close-up.
- Navigates to Analysis screen with both URIs.

```mermaid
flowchart TD
Start(["Open ScanScreen"]) --> CheckPerm["Check camera permission"]
CheckPerm --> |Denied| Prompt["Prompt to enable camera"]
CheckPerm --> |Granted| Preview["Show camera preview"]
Preview --> TakeFull{"Step == 'full'?"}
TakeFull --> |Yes| SaveFull["Save full image URI<br/>Switch to label step"]
TakeFull --> |No| Navigate["Navigate to Analysis with URIs"]
SaveFull --> Preview
Navigate --> End(["AnalysisScreen"])
```

**Diagram sources**
- [ScanScreen.tsx](file://client/screens/ScanScreen.tsx#L26-L93)

**Section sources**
- [ScanScreen.tsx](file://client/screens/ScanScreen.tsx#L17-L217)

### AI Analysis Pipeline
- Sends both images as multipart/form-data to /api/analyze.
- Server constructs a Gemini prompt with both images and expects structured JSON.
- On success, displays analysis results; on failure, shows retry option.
- Saves the analyzed item to stash via a mutation that invalidates related queries.

```mermaid
sequenceDiagram
participant AN as "AnalysisScreen"
participant API as "query-client.ts"
participant SRV as "Express Server"
participant AI as "Gemini"
participant DB as "PostgreSQL"
AN->>API : POST /api/analyze (FormData)
API->>SRV : Fetch with credentials
SRV->>AI : generateContent(prompt + images)
AI-->>SRV : JSON result
SRV-->>API : JSON result
API-->>AN : Analysis result
AN->>API : Mutation POST /api/stash
API->>SRV : POST /api/stash
SRV->>DB : INSERT stash item
DB-->>SRV : New item
SRV-->>API : 201 + item
API-->>AN : Invalidate queries [/api/stash, /api/stash/count]
```

**Diagram sources**
- [AnalysisScreen.tsx](file://client/screens/AnalysisScreen.tsx#L62-L122)
- [query-client.ts](file://client/lib/query-client.ts#L26-L43)
- [routes.ts](file://server/routes.ts#L140-L226)
- [db.ts](file://server/db.ts#L1-L19)

**Section sources**
- [AnalysisScreen.tsx](file://client/screens/AnalysisScreen.tsx#L29-L261)
- [routes.ts](file://server/routes.ts#L140-L226)

### Stash Data Management with React Query
- Queries stash items and count using query keys aligned with server routes.
- Uses a custom query function that attaches cookies for authenticated requests.
- Provides pull-to-refresh and loading states; empty-state rendering.

```mermaid
flowchart TD
Enter(["StashScreen"]) --> Query["useQuery ['/api/stash']"]
Query --> Loading{"Loading?"}
Loading --> |Yes| ShowSpinner["Show ActivityIndicator"]
Loading --> |No| HasData{"Has items?"}
HasData --> |No| Empty["Render EmptyState"]
HasData --> |Yes| List["Render FlatList grid"]
List --> Pull["Pull to refresh triggers refetch"]
```

**Diagram sources**
- [StashScreen.tsx](file://client/screens/StashScreen.tsx#L98-L162)
- [query-client.ts](file://client/lib/query-client.ts#L46-L64)

**Section sources**
- [StashScreen.tsx](file://client/screens/StashScreen.tsx#L93-L162)
- [query-client.ts](file://client/lib/query-client.ts#L46-L79)

### Marketplace Publishing
- Retrieves marketplace credentials from secure storage (per platform).
- Publishes to WooCommerce and eBay via dedicated endpoints.
- Handles errors and returns user-friendly messages.

```mermaid
sequenceDiagram
participant UI as "Marketplace UI"
participant MKT as "marketplace.ts"
participant API as "query-client.ts"
participant SRV as "Express Server"
UI->>MKT : getWooCommerceSettings()/getEbaySettings()
MKT-->>UI : Credentials (SecureStore/AsyncStorage)
UI->>MKT : publishToWooCommerce()/publishToEbay()
MKT->>API : apiRequest('/api/stash/ : id/publish/...')
API->>SRV : POST with credentials
SRV-->>API : Result (success/error)
API-->>MKT : Response
MKT-->>UI : { success, urls or error }
```

**Diagram sources**
- [marketplace.ts](file://client/lib/marketplace.ts#L19-L128)
- [query-client.ts](file://client/lib/query-client.ts#L26-L43)
- [routes.ts](file://server/routes.ts#L228-L488)

**Section sources**
- [marketplace.ts](file://client/lib/marketplace.ts#L19-L128)
- [routes.ts](file://server/routes.ts#L228-L488)

### Server Routing and Data Persistence
- Registers routes for articles, stash CRUD, AI analysis, and marketplace publishing.
- Uses Drizzle ORM with PostgreSQL; enforces strict schemas.
- Implements CORS, logging, and error handling middleware.

```mermaid
graph LR
R["routes.ts"] --> ART["/api/articles"]
R --> STASH["/api/stash (+ CRUD)"]
R --> ANALYZE["/api/analyze (multipart)"]
R --> WOO["/api/stash/:id/publish/woocommerce"]
R --> EBAY["/api/stash/:id/publish/ebay"]
R --> DB["db.ts -> schema.ts"]
```

**Diagram sources**
- [routes.ts](file://server/routes.ts#L24-L492)
- [db.ts](file://server/db.ts#L1-L19)
- [schema.ts](file://shared/schema.ts#L29-L50)

**Section sources**
- [routes.ts](file://server/routes.ts#L24-L492)
- [db.ts](file://server/db.ts#L1-L19)
- [schema.ts](file://shared/schema.ts#L29-L50)

## Dependency Analysis
- Client depends on Supabase for auth, React Query for caching, and marketplace utilities for secure credential retrieval.
- Server depends on Drizzle ORM, PostgreSQL, and external marketplace APIs.
- Routes depend on schema definitions for data modeling.

```mermaid
graph TB
C_Query["client/lib/query-client.ts"] --> S_Index["server/index.ts"]
C_Market["client/lib/marketplace.ts"] --> S_Routes["server/routes.ts"]
C_Auth["client/hooks/useAuth.ts"] --> C_Supa["client/lib/supabase.ts"]
S_Routes --> S_DB["server/db.ts"]
S_DB --> Shared["shared/schema.ts"]
```

**Diagram sources**
- [query-client.ts](file://client/lib/query-client.ts#L7-L17)
- [marketplace.ts](file://client/lib/marketplace.ts#L81-L128)
- [routes.ts](file://server/routes.ts#L24-L492)
- [db.ts](file://server/db.ts#L1-L19)
- [schema.ts](file://shared/schema.ts#L1-L122)

**Section sources**
- [query-client.ts](file://client/lib/query-client.ts#L7-L17)
- [routes.ts](file://server/routes.ts#L24-L492)
- [db.ts](file://server/db.ts#L1-L19)
- [schema.ts](file://shared/schema.ts#L1-L122)

## Performance Considerations
- React Query defaults disable automatic refetch on focus and retries, reducing network overhead.
- Stale-time is set to Infinity for queries, minimizing redundant fetches.
- API requests include credentials for authenticated endpoints.
- Image uploads use FormData with memory-based storage; consider streaming for very large files.
- Server-side rate-limiting and prompt validation reduce unnecessary AI calls.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Supabase credentials missing: Ensure environment variables are set; client warns when not configured.
- Authentication failures: Verify OAuth redirect URLs and session persistence settings.
- API domain not set: EXPO_PUBLIC_DOMAIN must be defined for client API requests.
- AI analysis errors: Server falls back to default structured response if parsing fails.
- Marketplace publishing errors: Server validates credentials and returns detailed error messages.

**Section sources**
- [supabase.ts](file://client/lib/supabase.ts#L20-L24)
- [query-client.ts](file://client/lib/query-client.ts#L7-L17)
- [routes.ts](file://server/routes.ts#L206-L226)
- [routes.ts](file://server/routes.ts#L228-L488)

## Conclusion
Hidden-Gem implements a robust data flow from device capture to AI analysis and marketplace publishing. Authentication is handled securely with Supabase, state is managed efficiently with React Query, and server routes provide clear endpoints for all operations. The design supports offline-first principles via cached queries and secure local storage for marketplace credentials, while maintaining strong error handling and user feedback.