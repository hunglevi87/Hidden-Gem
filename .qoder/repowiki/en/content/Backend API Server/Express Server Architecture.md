# Express Server Architecture

<cite>
**Referenced Files in This Document**
- [server/index.ts](file://server/index.ts)
- [server/routes.ts](file://server/routes.ts)
- [server/db.ts](file://server/db.ts)
- [server/templates/landing-page.html](file://server/templates/landing-page.html)
- [scripts/build.js](file://scripts/build.js)
- [shared/schema.ts](file://shared/schema.ts)
- [package.json](file://package.json)
- [app.json](file://app.json)
- [ENVIRONMENT.md](file://ENVIRONMENT.md)
- [server/replit_integrations/chat/routes.ts](file://server/replit_integrations/chat/routes.ts)
- [server/replit_integrations/image/routes.ts](file://server/replit_integrations/image/routes.ts)
- [server/replit_integrations/batch/utils.ts](file://server/replit_integrations/batch/utils.ts)
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
This document provides comprehensive documentation for the Express.js server architecture powering the HiddenGem project. It covers server initialization, middleware configuration, request handling patterns, CORS setup with dynamic origin handling, body parsing with raw body capture, request logging with performance monitoring, error handling strategies, and Expo integration for mobile app distribution including manifest serving, landing page generation, and static asset serving. It also includes server startup configuration, environment variable handling, and deployment considerations with practical examples of middleware chain execution, custom error handling, and server configuration patterns.

## Project Structure
The server architecture is organized around a modular Express application with dedicated modules for routing, database connectivity, and Expo integration. The build system generates static assets for production deployment, while environment-specific configurations enable seamless development and deployment across platforms.

```mermaid
graph TB
subgraph "Server"
A["server/index.ts<br/>Server entry & middleware"]
B["server/routes.ts<br/>API routes & handlers"]
C["server/db.ts<br/>Database connection"]
D["server/templates/landing-page.html<br/>Landing page template"]
E["server/replit_integrations/<br/>AI integrations"]
F["shared/schema.ts<br/>Database schema"]
end
subgraph "Build & Config"
G["scripts/build.js<br/>Static build & manifest generation"]
H["package.json<br/>Scripts & dependencies"]
I["app.json<br/>Expo configuration"]
J["ENVIRONMENT.md<br/>Environment setup guide"]
end
A --> B
A --> C
A --> D
A --> E
B --> C
B --> F
G --> D
G --> A
H --> A
I --> G
J --> H
```

**Diagram sources**
- [server/index.ts](file://server/index.ts#L1-L247)
- [server/routes.ts](file://server/routes.ts#L1-L493)
- [server/db.ts](file://server/db.ts#L1-L19)
- [server/templates/landing-page.html](file://server/templates/landing-page.html#L1-L466)
- [scripts/build.js](file://scripts/build.js#L1-L562)
- [package.json](file://package.json#L1-L85)
- [app.json](file://app.json#L1-L52)
- [ENVIRONMENT.md](file://ENVIRONMENT.md#L1-L219)

**Section sources**
- [server/index.ts](file://server/index.ts#L1-L247)
- [server/routes.ts](file://server/routes.ts#L1-L493)
- [scripts/build.js](file://scripts/build.js#L1-L562)
- [package.json](file://package.json#L1-L85)
- [app.json](file://app.json#L1-L52)
- [ENVIRONMENT.md](file://ENVIRONMENT.md#L1-L219)

## Core Components
This section outlines the primary building blocks of the server architecture, focusing on middleware configuration, request handling, and integration points.

- Express server initialization and middleware stack
- CORS configuration with dynamic origin handling for development and production
- Body parsing with raw body capture for signature verification
- Request logging middleware with performance monitoring
- Expo integration for manifest serving, landing page generation, and static asset serving
- Error handling middleware with structured responses
- Route registration and API endpoint definitions
- Database connectivity and schema integration

**Section sources**
- [server/index.ts](file://server/index.ts#L1-L247)
- [server/routes.ts](file://server/routes.ts#L1-L493)
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L122)

## Architecture Overview
The server follows a layered architecture with clear separation of concerns:
- Middleware layer handles CORS, body parsing, logging, and Expo routing
- Route layer defines API endpoints and integrates with database operations
- Integration layer manages AI services and batch processing utilities
- Build layer generates static assets and manifests for production deployment

```mermaid
graph TB
Client["Mobile/Web Client"] --> Express["Express Server"]
Express --> Middleware["Middleware Stack"]
Middleware --> Routes["Route Handlers"]
Routes --> DB["Database Layer"]
Routes --> AI["AI Integrations"]
Express --> Static["Static Assets"]
Express --> Expo["Expo Manifest & Landing"]
subgraph "Middleware"
CORS["CORS Handler"]
Body["Body Parser"]
Log["Request Logger"]
ExpoRoute["Expo Routing"]
end
subgraph "Routes"
API["API Endpoints"]
Upload["File Upload"]
Publish["Marketplace Publishing"]
end
subgraph "Integrations"
Gemini["Google Gemini"]
Batch["Batch Processing"]
end
Middleware --> CORS
Middleware --> Body
Middleware --> Log
Middleware --> ExpoRoute
Routes --> API
Routes --> Upload
Routes --> Publish
API --> Gemini
API --> Batch
```

**Diagram sources**
- [server/index.ts](file://server/index.ts#L16-L53)
- [server/index.ts](file://server/index.ts#L55-L65)
- [server/index.ts](file://server/index.ts#L67-L98)
- [server/index.ts](file://server/index.ts#L163-L205)
- [server/routes.ts](file://server/routes.ts#L24-L492)

## Detailed Component Analysis

### Server Initialization and Middleware Chain
The server initializes with a carefully ordered middleware stack that ensures proper request processing and response handling.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Server as "Express Server"
participant CORS as "CORS Middleware"
participant Body as "Body Parser"
participant Log as "Request Logger"
participant Expo as "Expo Router"
participant Routes as "Route Handlers"
Client->>Server : HTTP Request
Server->>CORS : Apply CORS policy
CORS->>Body : Next middleware
Body->>Log : Parse request body
Log->>Expo : Log request metrics
Expo->>Routes : Route to handler
Routes->>Client : HTTP Response
```

**Diagram sources**
- [server/index.ts](file://server/index.ts#L224-L246)
- [server/index.ts](file://server/index.ts#L16-L53)
- [server/index.ts](file://server/index.ts#L55-L65)
- [server/index.ts](file://server/index.ts#L67-L98)
- [server/index.ts](file://server/index.ts#L163-L205)

**Section sources**
- [server/index.ts](file://server/index.ts#L224-L246)

### CORS Configuration with Dynamic Origin Handling
The CORS middleware dynamically configures allowed origins based on environment variables and supports both development and production scenarios.

```mermaid
flowchart TD
Start(["Incoming Request"]) --> CheckEnv["Check Environment Variables"]
CheckEnv --> ExtractOrigin["Extract Origin Header"]
ExtractOrigin --> CheckLocalhost{"Is Localhost?"}
CheckLocalhost --> |Yes| AllowLocal["Allow Localhost Origins"]
CheckLocalhost --> |No| CheckReplit{"Is Replit Domain?"}
CheckReplit --> |Yes| AddReplit["Add Replit Domains"]
CheckReplit --> |No| Skip["Skip Origin Validation"]
AllowLocal --> ValidateOrigin["Validate Origin Against Set"]
AddReplit --> ValidateOrigin
ValidateOrigin --> IsAllowed{"Origin Allowed?"}
IsAllowed --> |Yes| SetHeaders["Set CORS Headers"]
IsAllowed --> |No| Continue["Continue Without CORS"]
SetHeaders --> OptionsCheck{"Method is OPTIONS?"}
Continue --> OptionsCheck
OptionsCheck --> |Yes| Send200["Send 200 OK"]
OptionsCheck --> |No| Next["Call Next Middleware"]
Send200 --> End(["Request Processed"])
Next --> End
```

**Diagram sources**
- [server/index.ts](file://server/index.ts#L16-L53)

**Section sources**
- [server/index.ts](file://server/index.ts#L16-L53)

### Body Parsing Configuration with Raw Body Capture
The body parsing middleware captures raw request bodies for cryptographic signature verification and supports both JSON and URL-encoded content.

```mermaid
classDiagram
class BodyParser {
+express.json(options) RawBodyCapture
+express.urlencoded(options) FormParsing
-captureRawBody(req, res, buf) void
+verifySignature() boolean
}
class Request {
+rawBody unknown
+headers object
+method string
+url string
}
BodyParser --> Request : "attaches rawBody"
```

**Diagram sources**
- [server/index.ts](file://server/index.ts#L55-L65)

**Section sources**
- [server/index.ts](file://server/index.ts#L55-L65)

### Request Logging Middleware with Performance Monitoring
The logging middleware monitors request performance and captures response data for debugging and analytics.

```mermaid
flowchart TD
RequestStart(["Request Received"]) --> StartTimer["Start Performance Timer"]
StartTimer --> HookJSON["Hook res.json()"]
HookJSON --> ProcessRoute["Process Route Handler"]
ProcessRoute --> ResponseFinish["Response Finish Event"]
ResponseFinish --> CheckAPI{"Is API Route?"}
CheckAPI --> |No| SkipLog["Skip Logging"]
CheckAPI --> |Yes| CalcDuration["Calculate Duration"]
CalcDuration --> CaptureResponse["Capture JSON Response"]
CaptureResponse --> TruncateLog["Truncate Long Logs"]
TruncateLog --> ConsoleLog["Console Log"]
SkipLog --> End(["End"])
ConsoleLog --> End
```

**Diagram sources**
- [server/index.ts](file://server/index.ts#L67-L98)

**Section sources**
- [server/index.ts](file://server/index.ts#L67-L98)

### Expo Integration for Mobile App Distribution
The server provides comprehensive Expo integration including manifest serving, landing page generation, and static asset serving.

```mermaid
sequenceDiagram
participant Client as "Mobile Client"
participant Server as "Express Server"
participant ExpoRouter as "Expo Router"
participant Manifest as "Manifest Service"
participant Landing as "Landing Page"
participant Assets as "Static Assets"
Client->>Server : GET /
Server->>ExpoRouter : Check Route
ExpoRouter->>Client : Serve Landing Page
Client->>Server : GET /manifest
Server->>ExpoRouter : Check Route
ExpoRouter->>Manifest : Serve Platform Manifest
Manifest->>Client : Return manifest.json
Client->>Server : GET /assets/*
Server->>Assets : Serve Static Assets
Assets->>Client : Return Asset Files
Client->>Server : GET /static-build/*
Server->>Assets : Serve Built Assets
Assets->>Client : Return Static Build
```

**Diagram sources**
- [server/index.ts](file://server/index.ts#L163-L205)
- [server/index.ts](file://server/index.ts#L111-L131)
- [server/index.ts](file://server/index.ts#L133-L161)
- [server/templates/landing-page.html](file://server/templates/landing-page.html#L1-L466)

**Section sources**
- [server/index.ts](file://server/index.ts#L111-L161)
- [server/index.ts](file://server/index.ts#L163-L205)
- [server/templates/landing-page.html](file://server/templates/landing-page.html#L1-L466)

### API Routes and Request Handling Patterns
The server implements comprehensive API endpoints for articles, stash items, AI analysis, and marketplace publishing.

```mermaid
classDiagram
class APIServer {
+getArticles() Response
+getArticleById(id) Response
+getStashItems() Response
+getStashItemById(id) Response
+createStashItem(data) Response
+deleteStashItem(id) Response
+analyzeItem(files) Response
+publishToWooCommerce(id, credentials) Response
+publishToEbay(id, credentials) Response
}
class DatabaseLayer {
+select(table) QueryBuilder
+insert(table) QueryBuilder
+delete(table) QueryBuilder
+eq(column, value) Condition
+desc(column) Sort
}
class FileUpload {
+memoryStorage() Storage
+fields(config) UploadHandler
+limits(size) UploadHandler
}
APIServer --> DatabaseLayer : "uses"
APIServer --> FileUpload : "uses"
```

**Diagram sources**
- [server/routes.ts](file://server/routes.ts#L24-L492)

**Section sources**
- [server/routes.ts](file://server/routes.ts#L24-L492)

### Error Handling Strategies
The server implements centralized error handling with structured responses and proper error propagation.

```mermaid
flowchart TD
TryBlock["Route Handler"] --> TrySuccess{"Operation Success?"}
TrySuccess --> |Yes| SendResponse["Send Success Response"]
TrySuccess --> |No| CatchError["Catch Error"]
CatchError --> ExtractStatus["Extract Status/Error Info"]
ExtractStatus --> SetResponse["Set HTTP Status"]
SetResponse --> SendError["Send Error Response"]
SendError --> ThrowError["Throw Original Error"]
SendResponse --> End(["End"])
ThrowError --> End
```

**Diagram sources**
- [server/index.ts](file://server/index.ts#L207-L222)

**Section sources**
- [server/index.ts](file://server/index.ts#L207-L222)

### Database Connectivity and Schema Integration
The server connects to PostgreSQL using Drizzle ORM with proper SSL configuration and schema integration.

```mermaid
classDiagram
class DatabaseConnection {
+Pool pool
+drizzle(db) ORM
+sslConfig rejectUnauthorized
}
class Schema {
+users Table
+userSettings Table
+stashItems Table
+articles Table
+conversations Table
+messages Table
}
DatabaseConnection --> Schema : "integrates"
```

**Diagram sources**
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L122)

**Section sources**
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L122)

### AI Integrations and Batch Processing
The server integrates with Google Gemini for AI-powered features and provides batch processing utilities for handling rate limits and retries.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Server as "Express Server"
participant Gemini as "Google Gemini"
participant Batch as "Batch Processor"
Client->>Server : POST /api/analyze
Server->>Gemini : Generate Content
Gemini->>Server : AI Response
Server->>Client : Analysis Results
Client->>Server : POST /api/generate-image
Server->>Gemini : Generate Image
Gemini->>Server : Image Data
Server->>Client : Generated Image
Client->>Server : Batch Process Items
Server->>Batch : Process with Rate Limits
Batch->>Gemini : Parallel Requests
Gemini->>Batch : Responses
Batch->>Server : Aggregated Results
Server->>Client : Batch Results
```

**Diagram sources**
- [server/routes.ts](file://server/routes.ts#L140-L226)
- [server/replit_integrations/chat/routes.ts](file://server/replit_integrations/chat/routes.ts#L71-L123)
- [server/replit_integrations/image/routes.ts](file://server/replit_integrations/image/routes.ts#L5-L39)
- [server/replit_integrations/batch/utils.ts](file://server/replit_integrations/batch/utils.ts#L69-L109)

**Section sources**
- [server/routes.ts](file://server/routes.ts#L140-L226)
- [server/replit_integrations/chat/routes.ts](file://server/replit_integrations/chat/routes.ts#L19-L123)
- [server/replit_integrations/image/routes.ts](file://server/replit_integrations/image/routes.ts#L5-L39)
- [server/replit_integrations/batch/utils.ts](file://server/replit_integrations/batch/utils.ts#L48-L109)

## Dependency Analysis
The server architecture demonstrates clear dependency relationships and modular design patterns.

```mermaid
graph TB
Express["express"] --> Server["server/index.ts"]
Multer["multer"] --> Routes["server/routes.ts"]
Drizzle["@drizzle-orm/postgresql"] --> DB["server/db.ts"]
Zod["zod"] --> Schema["shared/schema.ts"]
Gemini["@google/gemini"] --> AI["AI Integrations"]
PLimit["p-limit"] --> Batch["Batch Utils"]
PRetry["p-retry"] --> Batch
subgraph "Development Dependencies"
TSX["tsx"] --> DevServer["Development Server"]
ESLint["eslint"] --> Linting["Code Quality"]
Prettier["prettier"] --> Formatting["Code Formatting"]
end
```

**Diagram sources**
- [package.json](file://package.json#L19-L82)
- [server/index.ts](file://server/index.ts#L1-L7)
- [server/routes.ts](file://server/routes.ts#L1-L10)

**Section sources**
- [package.json](file://package.json#L19-L82)

## Performance Considerations
The server implements several performance optimization strategies:
- Request logging with minimal overhead using finish event listeners
- Efficient CORS handling with early origin validation
- Memory-efficient file uploads using multer memory storage
- Database connection pooling for optimal resource utilization
- Static asset serving for reduced server load
- Batch processing with configurable concurrency limits

## Troubleshooting Guide
Common issues and their resolutions:

### CORS Configuration Issues
- Verify environment variables REPLIT_DEV_DOMAIN and REPLIT_DOMAINS are properly set
- Check localhost origins are allowed for Expo development
- Ensure origin validation logic matches actual client domains

### Database Connection Problems
- Confirm DATABASE_URL environment variable is set correctly
- Verify PostgreSQL server is accessible and credentials are valid
- Check SSL configuration for production deployments

### Expo Manifest Serving Errors
- Ensure static-build directory exists and contains platform-specific manifests
- Verify manifest.json files are properly generated during build process
- Check file permissions for static asset serving

### API Endpoint Failures
- Review error handling middleware for proper error propagation
- Check database schema consistency with application expectations
- Validate file upload limits and storage configuration

**Section sources**
- [server/index.ts](file://server/index.ts#L16-L53)
- [server/db.ts](file://server/db.ts#L7-L9)
- [ENVIRONMENT.md](file://ENVIRONMENT.md#L172-L195)

## Conclusion
The HiddenGem Express server architecture demonstrates robust design patterns for modern web applications. The modular middleware stack, comprehensive API endpoints, and integrated Expo support create a scalable foundation for mobile app distribution. The implementation balances development flexibility with production readiness through careful environment configuration, performance monitoring, and error handling strategies.

## Appendices

### Server Startup Configuration
The server supports multiple deployment scenarios with flexible configuration options:
- Development mode with hot reloading via tsx
- Production mode with compiled server_dist
- Static build generation for Expo distribution
- Environment-specific CORS and routing configurations

**Section sources**
- [package.json](file://package.json#L5-L17)
- [scripts/build.js](file://scripts/build.js#L497-L553)

### Environment Variable Reference
Key environment variables and their purposes:
- DATABASE_URL: PostgreSQL connection string
- AI_INTEGRATIONS_GEMINI_API_KEY: Gemini API authentication
- AI_INTEGRATIONS_GEMINI_BASE_URL: Gemini API endpoint
- EXPO_PUBLIC_SUPABASE_URL: Supabase project URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY: Supabase public key
- SESSION_SECRET: Express session encryption key
- REPLIT_DEV_DOMAIN: Development domain for CORS
- REPLIT_DOMAINS: Production domains for CORS

**Section sources**
- [ENVIRONMENT.md](file://ENVIRONMENT.md#L12-L68)

### Practical Examples

#### Middleware Chain Execution Example
```typescript
// Order of middleware execution
setupCors(app);
setupBodyParsing(app);
setupRequestLogging(app);
configureExpoAndLanding(app);
registerRoutes(app);
setupErrorHandler(app);
```

#### Custom Error Handling Pattern
```typescript
app.use((err, req, res, next) => {
  const error = err as { status?: number; statusCode?: number; message?: string };
  const status = error.status || error.statusCode || 500;
  const message = error.message || "Internal Server Error";
  res.status(status).json({ message });
  throw err; // Re-throw for logging/tracing
});
```

#### Server Configuration Pattern
```typescript
const port = parseInt(process.env.PORT || "5000", 10);
server.listen({
  port,
  host: "0.0.0.0",
  reusePort: true,
}, () => {
  console.log(`express server serving on port ${port}`);
});
```

**Section sources**
- [server/index.ts](file://server/index.ts#L224-L246)
- [server/index.ts](file://server/index.ts#L207-L222)