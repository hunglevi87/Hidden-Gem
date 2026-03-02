# Route Registration System

<cite>
**Referenced Files in This Document**
- [server/index.ts](file://server/index.ts)
- [server/routes.ts](file://server/routes.ts)
- [server/db.ts](file://server/db.ts)
- [server/storage.ts](file://server/storage.ts)
- [shared/schema.ts](file://shared/schema.ts)
- [server/replit_integrations/chat/routes.ts](file://server/replit_integrations/chat/routes.ts)
- [server/replit_integrations/image/routes.ts](file://server/replit_integrations/image/routes.ts)
- [server/replit_integrations/chat/index.ts](file://server/replit_integrations/chat/index.ts)
- [server/replit_integrations/image/index.ts](file://server/replit_integrations/image/index.ts)
- [server/replit_integrations/batch/utils.ts](file://server/replit_integrations/batch/utils.ts)
- [client/lib/marketplace.ts](file://client/lib/marketplace.ts)
- [client/lib/supabase.ts](file://client/lib/supabase.ts)
- [client/contexts/AuthContext.tsx](file://client/contexts/AuthContext.tsx)
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
This document describes the modular route registration system powering the backend APIs. It explains how routes are dynamically registered using a factory-like pattern, how functionality is grouped into cohesive modules, and how middleware is applied consistently. The system organizes routes around core domains: content management (articles), personal collection management (stash), AI-powered analysis, marketplace publishing (WooCommerce and eBay), and chat-based AI interactions. The document also covers parameter validation, request/response handling, error propagation, and response formatting standards used across the application.

## Project Structure
The server initializes middleware and delegates route registration to a dedicated factory-style function. Route groups are organized under a single module per domain, enabling clear separation of concerns and maintainability.

```mermaid
graph TB
A["server/index.ts<br/>Server bootstrap"] --> B["server/routes.ts<br/>Core routes (articles, stash, analysis, marketplace)"]
A --> C["server/replit_integrations/chat/routes.ts<br/>Chat routes"]
A --> D["server/replit_integrations/image/routes.ts<br/>Image generation routes"]
B --> E["server/db.ts<br/>Database connection"]
B --> F["shared/schema.ts<br/>Database schema"]
C --> G["server/replit_integrations/chat/storage.ts<br/>Chat storage"]
D --> H["server/replit_integrations/image/client.ts<br/>AI client"]
I["client/lib/marketplace.ts<br/>Client marketplace integration"] --> B
J["client/lib/supabase.ts<br/>Client auth"] --> A
```

**Diagram sources**
- [server/index.ts](file://server/index.ts#L224-L246)
- [server/routes.ts](file://server/routes.ts#L24-L492)
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L122)
- [server/replit_integrations/chat/routes.ts](file://server/replit_integrations/chat/routes.ts#L1-L126)
- [server/replit_integrations/image/routes.ts](file://server/replit_integrations/image/routes.ts#L1-L41)
- [client/lib/marketplace.ts](file://client/lib/marketplace.ts#L1-L129)
- [client/lib/supabase.ts](file://client/lib/supabase.ts#L1-L39)

**Section sources**
- [server/index.ts](file://server/index.ts#L1-L247)
- [server/routes.ts](file://server/routes.ts#L1-L493)
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L122)

## Core Components
- Route registration factory: The server delegates route registration to a function that returns an HTTP server instance after mounting all routes. This enables centralized initialization and consistent middleware application.
- Middleware stack: CORS, body parsing, request logging, Expo manifest and landing page handling, and global error handling are applied before route registration.
- Modular route groups: Routes are grouped by domain (articles, stash, marketplace, chat, image generation) to improve maintainability and scalability.
- Data access: Drizzle ORM connects to PostgreSQL via a managed pool, with typed schemas from shared definitions.
- Storage abstractions: In-memory storage interface and implementation demonstrate a factory-like abstraction for persistence.

**Section sources**
- [server/index.ts](file://server/index.ts#L224-L246)
- [server/routes.ts](file://server/routes.ts#L24-L492)
- [server/db.ts](file://server/db.ts#L1-L19)
- [server/storage.ts](file://server/storage.ts#L1-L39)
- [shared/schema.ts](file://shared/schema.ts#L1-L122)

## Architecture Overview
The system follows a layered architecture:
- Presentation layer: Express server with middleware and route handlers.
- Domain layer: Route modules encapsulate business logic for articles, stash, marketplace publishing, and AI integrations.
- Persistence layer: Drizzle ORM with PostgreSQL and shared schema definitions.
- Client integration: Marketplace publishing utilities and Supabase-based authentication.

```mermaid
sequenceDiagram
participant Client as "Client App"
participant Server as "Express Server"
participant Routes as "Route Modules"
participant DB as "Drizzle ORM"
participant PG as "PostgreSQL"
Client->>Server : HTTP Request
Server->>Server : Apply middleware (CORS, body parsing, logging)
Server->>Routes : Dispatch to matched route
Routes->>DB : Query/Insert/Delete
DB->>PG : SQL operations
PG-->>DB : Results
DB-->>Routes : Typed rows
Routes-->>Server : JSON response
Server-->>Client : HTTP Response
```

**Diagram sources**
- [server/index.ts](file://server/index.ts#L224-L246)
- [server/routes.ts](file://server/routes.ts#L24-L492)
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L122)

## Detailed Component Analysis

### Route Registration Factory Pattern
The server initializes middleware and delegates route registration to a factory-style function that mounts endpoints and returns the HTTP server. This pattern centralizes startup logic and allows easy extension with new route groups.

```mermaid
flowchart TD
Start(["Server Startup"]) --> Setup["Setup Middleware<br/>CORS, Body Parsing, Logging"]
Setup --> Expo["Configure Expo/Landing Pages"]
Expo --> Register["registerRoutes(app)"]
Register --> Routes["Mount Domain Routes<br/>Articles, Stash, Analysis, Marketplace, Chat, Image"]
Routes --> Error["Global Error Handler"]
Error --> Listen(["Listen on Port"])
```

**Diagram sources**
- [server/index.ts](file://server/index.ts#L224-L246)
- [server/routes.ts](file://server/routes.ts#L24-L492)

**Section sources**
- [server/index.ts](file://server/index.ts#L224-L246)

### Articles Management Routes
Endpoints provide listing and retrieval of articles, with robust error handling and consistent JSON responses.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Server as "Express"
participant Routes as "Articles Routes"
participant DB as "Drizzle ORM"
participant PG as "PostgreSQL"
Client->>Server : GET /api/articles
Server->>Routes : Match route
Routes->>DB : SELECT articles ORDER BY createdAt DESC
DB->>PG : Execute query
PG-->>DB : Rows
DB-->>Routes : Articles[]
Routes-->>Server : 200 OK JSON
Server-->>Client : Articles[]
```

**Diagram sources**
- [server/routes.ts](file://server/routes.ts#L25-L36)
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L52-L62)

**Section sources**
- [server/routes.ts](file://server/routes.ts#L25-L55)
- [shared/schema.ts](file://shared/schema.ts#L52-L62)

### Stash Management Routes
Endpoints support listing, retrieving, creating, and deleting stash items, with validation and consistent error responses.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Server as "Express"
participant Routes as "Stash Routes"
participant DB as "Drizzle ORM"
participant PG as "PostgreSQL"
Client->>Server : POST /api/stash
Server->>Routes : Match route
Routes->>DB : INSERT stashItems
DB->>PG : Execute insert
PG-->>DB : New row
DB-->>Routes : New item
Routes-->>Server : 201 JSON
Server-->>Client : New item
```

**Diagram sources**
- [server/routes.ts](file://server/routes.ts#L99-L127)
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L29-L50)

**Section sources**
- [server/routes.ts](file://server/routes.ts#L57-L138)
- [shared/schema.ts](file://shared/schema.ts#L29-L50)

### AI-Powered Analysis Route
The analysis endpoint accepts multipart images, constructs a structured prompt, and returns AI-generated insights with fallback handling.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Server as "Express"
participant Routes as "Analysis Route"
participant AI as "Gemini API"
Client->>Server : POST /api/analyze (multipart)
Server->>Routes : Match route
Routes->>AI : generateContent(prompt + images)
AI-->>Routes : JSON response
Routes-->>Server : 200 JSON (parsed or fallback)
Server-->>Client : Analysis results
```

**Diagram sources**
- [server/routes.ts](file://server/routes.ts#L140-L226)

**Section sources**
- [server/routes.ts](file://server/routes.ts#L140-L226)

### Marketplace Publishing Routes
Two marketplace publishing endpoints demonstrate standardized validation, external API integration, and consistent response formatting.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Server as "Express"
participant Routes as "Marketplace Routes"
participant WC as "WooCommerce API"
participant EB as "eBay API"
participant DB as "Drizzle ORM"
Client->>Server : POST /api/stash/ : id/publish/woocommerce
Server->>Routes : Match route
Routes->>WC : POST /wc/v3/products
WC-->>Routes : Product created
Routes->>DB : UPDATE stashItems.publishedToWoocommerce
Routes-->>Server : 200 JSON { success, productId, productUrl }
Server-->>Client : Response
Client->>Server : POST /api/stash/ : id/publish/ebay
Server->>Routes : Match route
Routes->>EB : OAuth token exchange
Routes->>EB : PUT inventory + POST offer + optional publish
EB-->>Routes : Listing created
Routes->>DB : UPDATE stashItems.publishedToEbay
Routes-->>Server : 200 JSON { success, listingId, listingUrl }
Server-->>Client : Response
```

**Diagram sources**
- [server/routes.ts](file://server/routes.ts#L228-L488)
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L29-L50)

**Section sources**
- [server/routes.ts](file://server/routes.ts#L228-L488)

### Chat AI Routes (Streaming)
The chat routes implement conversation lifecycle management and streaming AI responses using Server-Sent Events.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Server as "Express"
participant Routes as "Chat Routes"
participant AI as "Gemini API"
participant Store as "Chat Storage"
Client->>Server : POST /api/conversations/ : id/messages
Server->>Routes : Match route
Routes->>Store : Save user message
Routes->>AI : generateContentStream(context)
AI-->>Routes : Stream chunks
Routes-->>Server : SSE data chunks
Routes->>Store : Save assistant message
Routes-->>Server : SSE done
Server-->>Client : Streaming response
```

**Diagram sources**
- [server/replit_integrations/chat/routes.ts](file://server/replit_integrations/chat/routes.ts#L71-L123)

**Section sources**
- [server/replit_integrations/chat/routes.ts](file://server/replit_integrations/chat/routes.ts#L1-L126)

### Image Generation Route
The image generation route validates input, calls the AI model, and returns base64-encoded image data with MIME type.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Server as "Express"
participant Routes as "Image Routes"
participant AI as "Gemini API"
Client->>Server : POST /api/generate-image
Server->>Routes : Match route
Routes->>AI : generateContent(prompt, TEXT+IMAGE)
AI-->>Routes : Candidate with inlineData
Routes-->>Server : 200 JSON { b64_json, mimeType }
Server-->>Client : Image data
```

**Diagram sources**
- [server/replit_integrations/image/routes.ts](file://server/replit_integrations/image/routes.ts#L6-L38)

**Section sources**
- [server/replit_integrations/image/routes.ts](file://server/replit_integrations/image/routes.ts#L1-L41)

### Middleware Application Patterns
- CORS: Dynamic origin allowlist with localhost support for development.
- Body parsing: JSON and URL-encoded bodies with rawBody capture for signature verification.
- Request logging: Intercepts response JSON to log structured logs for API paths.
- Expo/Landing pages: Serves manifests and landing page HTML based on headers and paths.
- Global error handler: Normalizes thrown errors to JSON responses with appropriate status codes.

```mermaid
flowchart TD
A["Incoming Request"] --> B["CORS & Preflight"]
B --> C["Body Parsing (rawBody capture)"]
C --> D["Request Logging (intercept res.json)"]
D --> E{"Path matches /api?"}
E -- Yes --> F["Route Handler"]
E -- No --> G["Expo/Landing Page Routing"]
F --> H["Response"]
G --> H
H --> I["Global Error Handler"]
```

**Diagram sources**
- [server/index.ts](file://server/index.ts#L16-L98)
- [server/index.ts](file://server/index.ts#L163-L205)
- [server/index.ts](file://server/index.ts#L207-L222)

**Section sources**
- [server/index.ts](file://server/index.ts#L16-L98)
- [server/index.ts](file://server/index.ts#L163-L205)
- [server/index.ts](file://server/index.ts#L207-L222)

### Parameter Validation and Request/Response Handling
- Path parameters: Integer parsing with 404 handling for missing resources.
- Request bodies: Structured validation via schema-driven insert schemas; marketplace routes validate credentials presence.
- Responses: Consistent JSON envelopes with either data payload or error object; status codes reflect intent (200, 201, 204, 400, 404, 500).
- Streaming: SSE for chat responses; fallback to JSON for non-streaming routes.

**Section sources**
- [server/routes.ts](file://server/routes.ts#L38-L55)
- [server/routes.ts](file://server/routes.ts#L228-L296)
- [server/routes.ts](file://server/routes.ts#L298-L488)
- [server/replit_integrations/chat/routes.ts](file://server/replit_integrations/chat/routes.ts#L71-L123)

### Authentication Guards and Client Integration
- Client-side authentication: Supabase client configuration with platform-aware storage and redirect URL handling.
- Marketplace integration: Client utilities fetch stored credentials and invoke marketplace endpoints with standardized error handling.
- Context provider: React context exposes session and auth actions for UI components.

```mermaid
sequenceDiagram
participant UI as "React UI"
participant AuthCtx as "AuthContext"
participant Supabase as "Supabase Client"
participant Market as "Marketplace Client"
participant Server as "Express Server"
UI->>AuthCtx : useAuthContext()
AuthCtx-->>UI : session, user, actions
UI->>Supabase : signIn/signUp/signOut
UI->>Market : publishToWooCommerce/publishToEbay
Market->>Server : POST /api/stash/ : id/publish/*
Server-->>Market : JSON { success, ... }
Market-->>UI : { success, error? }
```

**Diagram sources**
- [client/lib/supabase.ts](file://client/lib/supabase.ts#L1-L39)
- [client/contexts/AuthContext.tsx](file://client/contexts/AuthContext.tsx#L1-L31)
- [client/lib/marketplace.ts](file://client/lib/marketplace.ts#L81-L129)
- [server/routes.ts](file://server/routes.ts#L228-L488)

**Section sources**
- [client/lib/supabase.ts](file://client/lib/supabase.ts#L1-L39)
- [client/contexts/AuthContext.tsx](file://client/contexts/AuthContext.tsx#L1-L31)
- [client/lib/marketplace.ts](file://client/lib/marketplace.ts#L1-L129)

### Storage Abstractions (Factory Pattern Example)
The storage module defines an interface and an in-memory implementation, demonstrating a factory-like abstraction suitable for swapping persistence backends.

```mermaid
classDiagram
class IStorage {
+getUser(id) Promise~User~
+getUserByUsername(username) Promise~User~
+createUser(insertUser) Promise~User~
}
class MemStorage {
-users Map~string, User~
+getUser(id) Promise~User~
+getUserByUsername(username) Promise~User~
+createUser(insertUser) Promise~User~
}
class storage {
<<singleton>>
}
IStorage <|.. MemStorage : "implements"
storage --> MemStorage : "instantiates"
```

**Diagram sources**
- [server/storage.ts](file://server/storage.ts#L7-L39)

**Section sources**
- [server/storage.ts](file://server/storage.ts#L1-L39)

### Batch Processing Utilities
The batch utilities module provides concurrency control and retry logic for AI workloads, supporting both promise-based and SSE streaming modes.

```mermaid
flowchart TD
Start(["Start Batch"]) --> Limit["pLimit(concurrency)"]
Limit --> Retry["pRetry(retries, backoff)"]
Retry --> Process["processor(item)"]
Process --> Progress["onProgress(completed, total, item)"]
Progress --> Done(["Complete"])
```

**Diagram sources**
- [server/replit_integrations/batch/utils.ts](file://server/replit_integrations/batch/utils.ts#L69-L109)

**Section sources**
- [server/replit_integrations/batch/utils.ts](file://server/replit_integrations/batch/utils.ts#L1-L161)

## Dependency Analysis
The route modules depend on shared schemas and database access, while client-side modules integrate with server endpoints and authentication providers.

```mermaid
graph TB
subgraph "Server"
R["server/routes.ts"]
RC["server/replit_integrations/chat/routes.ts"]
RI["server/replit_integrations/image/routes.ts"]
DB["server/db.ts"]
SCH["shared/schema.ts"]
end
subgraph "Client"
MP["client/lib/marketplace.ts"]
SB["client/lib/supabase.ts"]
AC["client/contexts/AuthContext.tsx"]
end
R --> DB
R --> SCH
RC --> SCH
RI --> SCH
MP --> R
AC --> SB
```

**Diagram sources**
- [server/routes.ts](file://server/routes.ts#L1-L493)
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L122)
- [server/replit_integrations/chat/routes.ts](file://server/replit_integrations/chat/routes.ts#L1-L126)
- [server/replit_integrations/image/routes.ts](file://server/replit_integrations/image/routes.ts#L1-L41)
- [client/lib/marketplace.ts](file://client/lib/marketplace.ts#L1-L129)
- [client/lib/supabase.ts](file://client/lib/supabase.ts#L1-L39)
- [client/contexts/AuthContext.tsx](file://client/contexts/AuthContext.tsx#L1-L31)

**Section sources**
- [server/routes.ts](file://server/routes.ts#L1-L493)
- [shared/schema.ts](file://shared/schema.ts#L1-L122)
- [client/lib/marketplace.ts](file://client/lib/marketplace.ts#L1-L129)

## Performance Considerations
- Concurrency control: Use the batch utilities to limit concurrent AI requests and apply exponential backoff for rate-limited scenarios.
- Request size limits: Multer configuration restricts uploaded file sizes; adjust as needed for image-heavy workflows.
- Database pooling: Drizzle uses a managed pool; ensure DATABASE_URL is configured for production scaling.
- Streaming responses: Prefer SSE for long-running AI tasks to reduce latency and improve UX.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- CORS issues: Verify origin allowlist and localhost allowances for development.
- Body parsing errors: Ensure Content-Type headers match expected formats; rawBody capture supports signature verification.
- Database connectivity: Confirm DATABASE_URL environment variable and SSL settings.
- Marketplace publishing failures: Validate credentials and account setup on target platforms; inspect returned error messages for actionable details.
- Global error handling: Errors are normalized to JSON with status codes; review logs for stack traces.

**Section sources**
- [server/index.ts](file://server/index.ts#L16-L53)
- [server/index.ts](file://server/index.ts#L55-L65)
- [server/db.ts](file://server/db.ts#L7-L9)
- [server/routes.ts](file://server/routes.ts#L228-L296)
- [server/index.ts](file://server/index.ts#L207-L222)

## Conclusion
The modular route registration system leverages a factory pattern to centralize route mounting and middleware application. Functionality is cleanly grouped into domain-specific modules, with consistent validation, error handling, and response formatting. The integration with Supabase and marketplace APIs demonstrates practical patterns for authentication and third-party publishing. The batch utilities provide scalable patterns for AI workloads, while the storage abstraction supports flexible persistence strategies.