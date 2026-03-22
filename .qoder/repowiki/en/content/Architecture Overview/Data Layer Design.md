# Data Layer Design

<cite>
**Referenced Files in This Document**
- [drizzle.config.ts](file://drizzle.config.ts)
- [shared/schema.ts](file://shared/schema.ts)
- [server/db.ts](file://server/db.ts)
- [migrations/0000_sticky_night_thrasher.sql](file://migrations/0000_sticky_night_thrasher.sql)
- [migrations/0001_flipagent_tables.sql](file://migrations/0001_flipagent_tables.sql)
- [migrations/0002_rls_policies.sql](file://migrations/0002_rls_policies.sql)
- [scripts/run-migration.js](file://scripts/run-migration.js)
- [server/routes.ts](file://server/routes.ts)
- [shared/models/chat.ts](file://shared/models/chat.ts)
- [shared/types.ts](file://shared/types.ts)
- [package.json](file://package.json)
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
This document describes the data layer architecture for Hidden-Gem’s PostgreSQL-backed backend. It covers Drizzle ORM configuration and integration, the shared schema design and entity relationships, the migration strategy and deployment automation, the repository pattern for database operations, and operational considerations such as data integrity, indexing, transactions, and separation of concerns between shared models and database-specific implementations.

## Project Structure
The data layer is organized around a shared schema module consumed by the server runtime and managed via Drizzle migrations. The server exposes REST endpoints that operate on the schema-defined tables through Drizzle ORM.

```mermaid
graph TB
subgraph "Shared Layer"
SHARED_SCHEMA["shared/schema.ts"]
SHARED_MODELS_CHAT["shared/models/chat.ts"]
SHARED_TYPES["shared/types.ts"]
end
subgraph "Server Runtime"
SERVER_DB["server/db.ts"]
SERVER_ROUTES["server/routes.ts"]
end
subgraph "Tooling"
DRIZZLE_CONFIG["drizzle.config.ts"]
MIGRATION_0000["migrations/0000_sticky_night_thrasher.sql"]
MIGRATION_0001["migrations/0001_flipagent_tables.sql"]
MIGRATION_0002["migrations/0002_rls_policies.sql"]
RUN_MIGRATION["scripts/run-migration.js"]
PACKAGE_JSON["package.json"]
end
SHARED_SCHEMA --> SERVER_DB
SHARED_SCHEMA --> SERVER_ROUTES
SHARED_MODELS_CHAT --> SERVER_ROUTES
SHARED_TYPES --> SERVER_ROUTES
DRIZZLE_CONFIG --> MIGRATION_0001
DRIZZLE_CONFIG --> MIGRATION_0002
DRIZZLE_CONFIG --> MIGRATION_0000
PACKAGE_JSON --> DRIZZLE_CONFIG
PACKAGE_JSON --> RUN_MIGRATION
SERVER_DB --> SERVER_ROUTES
```

**Diagram sources**
- [drizzle.config.ts](file://drizzle.config.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L344)
- [shared/models/chat.ts](file://shared/models/chat.ts#L1-L35)
- [shared/types.ts](file://shared/types.ts#L1-L116)
- [server/db.ts](file://server/db.ts#L1-L19)
- [server/routes.ts](file://server/routes.ts#L1-L400)
- [migrations/0000_sticky_night_thrasher.sql](file://migrations/0000_sticky_night_thrasher.sql#L1-L82)
- [migrations/0001_flipagent_tables.sql](file://migrations/0001_flipagent_tables.sql#L1-L117)
- [migrations/0002_rls_policies.sql](file://migrations/0002_rls_policies.sql#L1-L66)
- [scripts/run-migration.js](file://scripts/run-migration.js#L1-L34)
- [package.json](file://package.json#L1-L95)

**Section sources**
- [drizzle.config.ts](file://drizzle.config.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L344)
- [server/db.ts](file://server/db.ts#L1-L19)
- [migrations/0000_sticky_night_thrasher.sql](file://migrations/0000_sticky_night_thrasher.sql#L1-L82)
- [migrations/0001_flipagent_tables.sql](file://migrations/0001_flipagent_tables.sql#L1-L117)
- [migrations/0002_rls_policies.sql](file://migrations/0002_rls_policies.sql#L1-L66)
- [scripts/run-migration.js](file://scripts/run-migration.js#L1-L34)
- [package.json](file://package.json#L1-L95)

## Core Components
- Drizzle ORM configuration: Defines schema location, output directory for migrations, and database credentials.
- Shared schema: Centralized table definitions, constraints, indexes, and Zod insert schemas for validation.
- Server database client: Drizzle client configured with a PostgreSQL connection pool and schema namespace.
- Migration system: SQL-based migrations with Drizzle Kit and a manual runner script for targeted steps.
- Routes: Application endpoints that perform CRUD operations using Drizzle.

**Section sources**
- [drizzle.config.ts](file://drizzle.config.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L344)
- [server/db.ts](file://server/db.ts#L1-L19)
- [migrations/0001_flipagent_tables.sql](file://migrations/0001_flipagent_tables.sql#L1-L117)
- [migrations/0002_rls_policies.sql](file://migrations/0002_rls_policies.sql#L1-L66)
- [server/routes.ts](file://server/routes.ts#L216-L297)

## Architecture Overview
The data layer follows a layered approach:
- Shared schema defines entities and constraints.
- Drizzle ORM connects to PostgreSQL and exposes typed operations.
- Server routes orchestrate business logic and delegate persistence to Drizzle.
- Migrations evolve the schema while preserving data integrity.

```mermaid
graph TB
ROUTES["server/routes.ts<br/>REST endpoints"]
DB_CLIENT["server/db.ts<br/>Drizzle client"]
SCHEMA["shared/schema.ts<br/>Tables + Zod schemas"]
MIGRATIONS["migrations/*.sql<br/>Schema evolution"]
DRIZZLE_KIT["drizzle.config.ts<br/>Migration config"]
PG["PostgreSQL"]
ROUTES --> DB_CLIENT
DB_CLIENT --> SCHEMA
DRIZZLE_KIT --> MIGRATIONS
MIGRATIONS --> PG
SCHEMA --> PG
DB_CLIENT --> PG
```

**Diagram sources**
- [server/routes.ts](file://server/routes.ts#L1-L400)
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L344)
- [drizzle.config.ts](file://drizzle.config.ts#L1-L19)
- [migrations/0001_flipagent_tables.sql](file://migrations/0001_flipagent_tables.sql#L1-L117)

## Detailed Component Analysis

### Drizzle ORM Configuration and Integration
- Drizzle Kit configuration specifies the migrations output directory and the schema module path. It reads DATABASE_URL from environment variables and sets the PostgreSQL dialect.
- The server database client initializes a PostgreSQL connection pool and wraps it with Drizzle, passing the shared schema to enable type-safe queries.
- Package scripts expose a command to push schema changes using Drizzle Kit.

```mermaid
sequenceDiagram
participant Dev as "Developer"
participant Kit as "Drizzle Kit"
participant Config as "drizzle.config.ts"
participant Schema as "shared/schema.ts"
participant Migs as "migrations/"
participant DB as "PostgreSQL"
Dev->>Kit : Run migration command
Kit->>Config : Read config (out, schema, dialect)
Config-->>Kit : Paths and credentials
Kit->>Schema : Load schema
Kit->>Migs : Generate SQL migrations
Migs->>DB : Apply SQL migrations
```

**Diagram sources**
- [drizzle.config.ts](file://drizzle.config.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L344)
- [migrations/0001_flipagent_tables.sql](file://migrations/0001_flipagent_tables.sql#L1-L117)
- [migrations/0002_rls_policies.sql](file://migrations/0002_rls_policies.sql#L1-L66)

**Section sources**
- [drizzle.config.ts](file://drizzle.config.ts#L1-L19)
- [server/db.ts](file://server/db.ts#L1-L19)
- [package.json](file://package.json#L14-L14)

### Shared Schema Design and Entity Relationships
- Core entities include users, user settings, stash items, articles, conversations, and messages.
- FlipAgent domain extends the schema with sellers, products, listings, integrations, AI generations, and a sync queue.
- Constraints and indexes:
  - Primary keys and foreign keys enforce referential integrity.
  - Unique indexes on (seller_id, sku) and (seller_id, service) prevent duplicates.
  - Indexes on frequently filtered/sorted columns improve query performance.
- JSONB fields store semi-structured data for flexibility.
- Zod insert schemas derived from tables provide runtime validation for inserts.

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
text_array tags
text full_image_url
text label_image_url
jsonb ai_analysis
text seo_title
text seo_description
text_array seo_keywords
boolean published_to_woocommerce
boolean published_to_ebay
text woocommerce_product_id
text ebay_listing_id
timestamp created_at
timestamp updated_at
}
ARTICLES {
serial id PK
text title
text content
text excerpt
text category
text image_url
int reading_time
boolean featured
timestamp created_at
}
CONVERSATIONS {
serial id PK
text title
timestamp created_at
}
MESSAGES {
serial id PK
int conversation_id FK
text role
text content
timestamp created_at
}
SELLERS {
uuid id PK
varchar user_id UK
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
text_array tags
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
text_array seo_tags
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
AI_GENERATIONS {
uuid id PK
uuid seller_id FK
uuid product_id FK
text input_image_url
text input_text
text model_used
jsonb output_listing
int tokens_used
decimal cost
decimal quality_score
text user_feedback
timestamp created_at
}
SYNC_QUEUE {
uuid id PK
uuid seller_id FK
uuid product_id FK
text marketplace
text action
jsonb payload
text status
text error_message
int retry_count
int max_retries
timestamp created_at
timestamp scheduled_at
timestamp completed_at
}
PUSH_TOKENS {
serial id PK
varchar user_id FK
text token
text platform
timestamp created_at
timestamp updated_at
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
USERS ||--o{ USER_SETTINGS : "has"
USERS ||--o{ STASH_ITEMS : "owns"
CONVERSATIONS ||--o{ MESSAGES : "contains"
USERS ||--o{ SELLERS : "owns"
SELLERS ||--o{ PRODUCTS : "owns"
SELLERS ||--o{ LISTINGS : "owns"
SELLERS ||--o{ INTEGRATIONS : "has"
SELLERS ||--o{ AI_GENERATIONS : "generates"
SELLERS ||--o{ SYNC_QUEUE : "queues"
PRODUCTS ||--o{ LISTINGS : "listed_on"
USERS ||--o{ PUSH_TOKENS : "has"
USERS ||--o{ PRICE_TRACKING : "tracks"
STASH_ITEMS ||--o{ PRICE_TRACKING : "tracked_by"
USERS ||--o{ NOTIFICATIONS : "receives"
STASH_ITEMS ||--o{ NOTIFICATIONS : "related_to"
```

**Diagram sources**
- [shared/schema.ts](file://shared/schema.ts#L6-L344)

**Section sources**
- [shared/schema.ts](file://shared/schema.ts#L1-L344)

### Migration Strategy and Deployment Automation
- Drizzle Kit generates SQL migrations from the shared schema. The configuration points to the schema module and output directory.
- Manual runner script applies a specific migration file and verifies created tables. This enables targeted deployments during development or CI steps.
- Row-Level Security policies are applied in a dedicated migration to constrain access to seller-owned rows.

```mermaid
flowchart TD
Start(["Start"]) --> LoadEnv["Load DATABASE_URL"]
LoadEnv --> GenerateSQL["Generate SQL from schema"]
GenerateSQL --> WriteMigrations["Write to migrations/"]
WriteMigrations --> ApplyManual["Run migration script"]
ApplyManual --> VerifyTables["Verify created tables"]
VerifyTables --> ApplyRLS["Apply RLS policies"]
ApplyRLS --> End(["Done"])
```

**Diagram sources**
- [drizzle.config.ts](file://drizzle.config.ts#L1-L19)
- [scripts/run-migration.js](file://scripts/run-migration.js#L1-L34)
- [migrations/0001_flipagent_tables.sql](file://migrations/0001_flipagent_tables.sql#L1-L117)
- [migrations/0002_rls_policies.sql](file://migrations/0002_rls_policies.sql#L1-L66)

**Section sources**
- [drizzle.config.ts](file://drizzle.config.ts#L1-L19)
- [scripts/run-migration.js](file://scripts/run-migration.js#L1-L34)
- [migrations/0001_flipagent_tables.sql](file://migrations/0001_flipagent_tables.sql#L1-L117)
- [migrations/0002_rls_policies.sql](file://migrations/0002_rls_policies.sql#L1-L66)

### Repository Pattern and CRUD Operations
- The server routes encapsulate CRUD operations using Drizzle. They select, insert, update, and delete records across tables.
- Validation leverages Zod insert schemas derived from the shared schema to ensure data conforms to table definitions before persistence.
- Transactions are not explicitly used in the examined routes; however, Drizzle supports transaction blocks via the client for multi-statement atomicity.

```mermaid
sequenceDiagram
participant Client as "HTTP Client"
participant Routes as "server/routes.ts"
participant DB as "server/db.ts"
participant Schema as "shared/schema.ts"
Client->>Routes : POST /api/stash
Routes->>Schema : Validate with insert schema
Routes->>DB : Insert into stash_items
DB-->>Routes : New record
Routes-->>Client : 201 Created
```

**Diagram sources**
- [server/routes.ts](file://server/routes.ts#L258-L286)
- [shared/schema.ts](file://shared/schema.ts#L89-L93)
- [server/db.ts](file://server/db.ts#L1-L19)

**Section sources**
- [server/routes.ts](file://server/routes.ts#L216-L297)
- [shared/schema.ts](file://shared/schema.ts#L78-L108)

### Data Integrity Constraints, Indexing, and Performance
- Integrity:
  - Foreign keys cascade deletes to maintain referential integrity.
  - Unique indexes prevent duplicate combinations for seller+SKU and seller+service.
- Indexing:
  - Indexes on seller_id, (seller_id, sku), (seller_id, marketplace), status + scheduled_at, and (seller_id, created_at DESC) optimize common filters and sorts.
- JSONB fields:
  - Used for flexible attributes, listings, and metadata; consider selective parsing and validation in application logic.
- Row-Level Security:
  - Policies restrict visibility and modification to rows owned by the authenticated user, enforced at the database level.

**Section sources**
- [shared/schema.ts](file://shared/schema.ts#L149-L151)
- [shared/schema.ts](file://shared/schema.ts#L218-L220)
- [migrations/0001_flipagent_tables.sql](file://migrations/0001_flipagent_tables.sql#L110-L117)
- [migrations/0002_rls_policies.sql](file://migrations/0002_rls_policies.sql#L1-L66)

### Separation of Concerns: Shared Models vs Database Implementations
- Shared schema and types:
  - Define canonical entity shapes and database constraints.
  - Provide Zod insert schemas for validation.
- Database-specific implementations:
  - Drizzle table definitions and indexes live in the shared schema.
  - Server routes and the database client consume the shared schema to perform operations.
- Chat domain reuse:
  - A separate chat model file demonstrates how shared schema can be extended for domain-specific needs while keeping the core consistent.

**Section sources**
- [shared/schema.ts](file://shared/schema.ts#L1-L344)
- [shared/models/chat.ts](file://shared/models/chat.ts#L1-L35)
- [shared/types.ts](file://shared/types.ts#L1-L116)

## Dependency Analysis
- Drizzle ORM and drizzle-orm/node-postgres power the database client.
- Drizzle Kit generates migrations from the shared schema.
- Express routes depend on the database client and shared schema.
- Zod and drizzle-zod provide schema-driven validation.

```mermaid
graph LR
PKG["package.json"]
DRIZZLE_OM["drizzle-orm"]
DRIZZLE_KIT["drizzle-kit"]
PG["pg"]
ZOD["zod"]
DRIZZLE_ZOD["drizzle-zod"]
SCHEMA["shared/schema.ts"]
DBCLIENT["server/db.ts"]
ROUTES["server/routes.ts"]
PKG --> DRIZZLE_OM
PKG --> DRIZZLE_KIT
PKG --> PG
PKG --> ZOD
PKG --> DRIZZLE_ZOD
DRIZZLE_OM --> DBCLIENT
PG --> DBCLIENT
DRIZZLE_ZOD --> SCHEMA
SCHEMA --> DBCLIENT
DBCLIENT --> ROUTES
```

**Diagram sources**
- [package.json](file://package.json#L24-L76)
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L344)
- [server/routes.ts](file://server/routes.ts#L1-L400)

**Section sources**
- [package.json](file://package.json#L24-L76)
- [server/db.ts](file://server/db.ts#L1-L19)
- [shared/schema.ts](file://shared/schema.ts#L1-L344)

## Performance Considerations
- Prefer indexed columns for joins and filters (e.g., seller_id, (seller_id, sku)).
- Use RETURNING clauses to minimize round-trips when inserting/updating.
- Avoid N+1 selects by batching queries or using joins where appropriate.
- Consider partitioning or materialized views for high-cardinality analytics workloads.
- Monitor slow queries and add targeted indexes based on query patterns.

## Troubleshooting Guide
- Missing DATABASE_URL:
  - Drizzle Kit and the server client both validate the presence of DATABASE_URL and throw errors if missing.
- Migration failures:
  - Use the manual runner script to apply specific migrations and verify created tables.
- Validation errors:
  - Ensure payloads conform to Zod insert schemas derived from the shared schema.
- Access control:
  - RLS policies restrict rows to owners; confirm authentication and policy enforcement.

**Section sources**
- [drizzle.config.ts](file://drizzle.config.ts#L7-L9)
- [server/db.ts](file://server/db.ts#L7-L9)
- [scripts/run-migration.js](file://scripts/run-migration.js#L5-L28)
- [shared/schema.ts](file://shared/schema.ts#L78-L108)
- [migrations/0002_rls_policies.sql](file://migrations/0002_rls_policies.sql#L1-L66)

## Conclusion
Hidden-Gem’s data layer centers on a shared schema that drives both application logic and migrations. Drizzle ORM provides a type-safe, efficient abstraction over PostgreSQL, while migrations and RLS policies ensure schema evolution and data isolation. The server routes demonstrate a clear repository-like pattern for CRUD operations, with validation grounded in shared Zod schemas. The architecture balances separation of concerns, performance, and operational safety.

## Appendices
- Environment variables:
  - DATABASE_URL is required for both Drizzle Kit and the server database client.
- Commands:
  - Use the package script to push schema changes to the database.

**Section sources**
- [drizzle.config.ts](file://drizzle.config.ts#L7-L9)
- [server/db.ts](file://server/db.ts#L7-L9)
- [package.json](file://package.json#L14-L14)