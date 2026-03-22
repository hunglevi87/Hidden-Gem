# Price Tracking Alerts

<cite>
**Referenced Files in This Document**
- [server/index.ts](file://server/index.ts)
- [server/services/notification.ts](file://server/services/notification.ts)
- [server/routes.ts](file://server/routes.ts)
- [shared/schema.ts](file://shared/schema.ts)
- [client/hooks/useNotifications.ts](file://client/hooks/useNotifications.ts)
- [client/lib/query-client.ts](file://client/lib/query-client.ts)
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
This document explains Hidden-Gem’s price tracking and alert system. It covers configuration of alert thresholds, enabling/disabling tracking, automated monitoring, database schema, alert notification delivery, and backend processing. It also provides practical examples for enabling tracking, setting thresholds, and understanding how price change alerts are triggered and delivered.

## Project Structure
The price tracking system spans the backend server, database schema, and the mobile client:
- Backend server initializes a scheduler and exposes REST endpoints for price tracking.
- The notification service encapsulates price monitoring, alert calculation, and push notification delivery.
- The database schema defines tracking records, price history fields, and notification history.
- The client registers push tokens and integrates with the backend APIs.

```mermaid
graph TB
subgraph "Client"
UI["Item Details Screen<br/>Registers Push Token"]
Hooks["useNotifications Hook"]
Query["query-client"]
end
subgraph "Server"
Routes["Express Routes<br/>Price Tracking Endpoints"]
Scheduler["Scheduler<br/>processPriceChecks()"]
Service["Notification Service<br/>enable/disable/status,<br/>processPriceChecks,<br/>sendPriceAlert"]
DB[("PostgreSQL via Drizzle")]
end
UI --> Hooks
Hooks --> Query
Query --> Routes
Routes --> Service
Scheduler --> Service
Service --> DB
Routes --> DB
```

**Diagram sources**
- [server/index.ts](file://server/index.ts#L247-L258)
- [server/routes.ts](file://server/routes.ts#L132-L182)
- [server/services/notification.ts](file://server/services/notification.ts#L162-L223)
- [shared/schema.ts](file://shared/schema.ts#L269-L280)
- [client/hooks/useNotifications.ts](file://client/hooks/useNotifications.ts#L51-L128)
- [client/lib/query-client.ts](file://client/lib/query-client.ts#L26-L43)

**Section sources**
- [server/index.ts](file://server/index.ts#L247-L258)
- [server/routes.ts](file://server/routes.ts#L132-L182)
- [server/services/notification.ts](file://server/services/notification.ts#L162-L223)
- [shared/schema.ts](file://shared/schema.ts#L269-L280)
- [client/hooks/useNotifications.ts](file://client/hooks/useNotifications.ts#L51-L128)
- [client/lib/query-client.ts](file://client/lib/query-client.ts#L26-L43)

## Core Components
- Price tracking configuration:
  - Enable tracking with an alert threshold.
  - Disable tracking.
  - Retrieve tracking status (active flag and threshold).
- Automated monitoring:
  - Scheduled job runs every six hours to check tracked items.
  - Calculates percentage change against stored last price.
  - Triggers alerts when change meets or exceeds threshold.
- Notification delivery:
  - Sends push notifications via Expo.
  - Stores notification metadata in the database.
- Database schema:
  - Tracks items, prices, thresholds, and scheduling fields.
  - Stores notification history.

**Section sources**
- [server/services/notification.ts](file://server/services/notification.ts#L162-L223)
- [server/services/notification.ts](file://server/services/notification.ts#L228-L241)
- [server/services/notification.ts](file://server/services/notification.ts#L246-L269)
- [server/services/notification.ts](file://server/services/notification.ts#L332-L413)
- [shared/schema.ts](file://shared/schema.ts#L269-L280)

## Architecture Overview
The system uses a scheduled job to periodically evaluate price tracking records and compare current AI-derived prices against stored baseline values. When a significant change is detected, a push notification is sent to the user’s registered devices.

```mermaid
sequenceDiagram
participant Cron as "Scheduler"
participant API as "Routes.processPriceChecks()"
participant Service as "processPriceChecks()"
participant DB as "Database"
participant Expo as "Expo Push API"
Cron->>API : "Invoke processPriceChecks()"
API->>Service : "Call processPriceChecks()"
Service->>DB : "Select active tracking where nextCheckAt <= now"
DB-->>Service : "Tracking rows joined with stash items"
loop For each tracking item
Service->>DB : "Read current AI price from stash item"
Service->>Service : "Compute percent change vs lastPrice"
alt Change >= threshold
Service->>Expo : "Send push notification"
Service->>DB : "Insert notification record"
end
Service->>DB : "Update lastPrice, lastCheckedAt, nextCheckAt"
end
```

**Diagram sources**
- [server/index.ts](file://server/index.ts#L247-L258)
- [server/routes.ts](file://server/routes.ts#L132-L182)
- [server/services/notification.ts](file://server/services/notification.ts#L332-L413)
- [shared/schema.ts](file://shared/schema.ts#L269-L280)

## Detailed Component Analysis

### Price Tracking Configuration
- Enabling tracking:
  - Endpoint: POST /api/stash/:id/price-tracking
  - Accepts: alertThreshold (optional, defaults to 10)
  - Behavior: Creates a new tracking record with initial lastPrice from AI analysis and schedules the first check for 24 hours later.
- Disabling tracking:
  - Endpoint: DELETE /api/stash/:id/price-tracking
  - Behavior: Sets isActive to false and updates timestamps.
- Retrieving status:
  - Endpoint: GET /api/stash/:id/price-tracking
  - Returns: isActive and alertThreshold.

```mermaid
flowchart TD
Start(["Enable Tracking"]) --> ReadParams["Validate userId and stashItemId"]
ReadParams --> FetchItem["Fetch stash item AI analysis"]
FetchItem --> HasPrice{"Has current price?"}
HasPrice --> |Yes| Create["Insert price_tracking with lastPrice,<br/>nextCheckAt=now+24h"]
HasPrice --> |No| Skip["Skip alert, schedule next check"]
Create --> End(["Done"])
Skip --> End
```

**Diagram sources**
- [server/routes.ts](file://server/routes.ts#L132-L148)
- [server/services/notification.ts](file://server/services/notification.ts#L162-L223)

**Section sources**
- [server/routes.ts](file://server/routes.ts#L132-L148)
- [server/services/notification.ts](file://server/services/notification.ts#L162-L223)

### Automated Price Monitoring
- Scheduling:
  - A Node.js interval triggers processPriceChecks every six hours.
- Evaluation logic:
  - Selects active tracking entries whose nextCheckAt is due.
  - Reads current price from stash item AI analysis.
  - Computes percentage change versus lastPrice.
  - Compares absolute change to alertThreshold.
  - Updates tracking fields after evaluation.

```mermaid
flowchart TD
Entry(["processPriceChecks Entry"]) --> SelectDue["Select active tracking where nextCheckAt <= now"]
SelectDue --> Loop{"More items?"}
Loop --> |No| Exit(["Exit"])
Loop --> |Yes| ReadPrices["Read current AI price and lastPrice"]
ReadPrices --> Valid{"Both prices present?"}
Valid --> |No| UpdateSkip["Update lastCheckedAt + 24h, skip alert"] --> Loop
Valid --> |Yes| Calc["Compute percent change"]
Calc --> Threshold{"|change| >= threshold?"}
Threshold --> |No| Update["Update lastCheckedAt + 24h"] --> Loop
Threshold --> |Yes| Notify["sendPriceAlert()"] --> Update --> Loop
```

**Diagram sources**
- [server/index.ts](file://server/index.ts#L247-L258)
- [server/services/notification.ts](file://server/services/notification.ts#L332-L413)

**Section sources**
- [server/index.ts](file://server/index.ts#L247-L258)
- [server/services/notification.ts](file://server/services/notification.ts#L332-L413)

### Price Alert Notification Delivery
- Detection:
  - Increase vs decrease is determined by sign of price delta.
- Formatting:
  - Title indicates direction (increase/drop).
  - Body includes percent change and new price.
- Delivery:
  - Uses Expo Push API to send to all tokens registered for the user.
  - Persists notification metadata in the notifications table.

```mermaid
sequenceDiagram
participant Service as "processPriceChecks()"
participant DB as "Database"
participant Expo as "Expo Push API"
participant History as "notifications table"
Service->>DB : "Lookup user push tokens"
DB-->>Service : "Token list"
Service->>Expo : "POST push messages"
Expo-->>Service : "Response"
Service->>DB : "Insert notification record"
DB-->>History : "Stored"
```

**Diagram sources**
- [server/services/notification.ts](file://server/services/notification.ts#L134-L157)
- [server/services/notification.ts](file://server/services/notification.ts#L72-L129)
- [shared/schema.ts](file://shared/schema.ts#L283-L293)

**Section sources**
- [server/services/notification.ts](file://server/services/notification.ts#L134-L157)
- [server/services/notification.ts](file://server/services/notification.ts#L72-L129)
- [shared/schema.ts](file://shared/schema.ts#L283-L293)

### Price Tracking Database Schema
The schema supports:
- Tracking records with scheduling and thresholds.
- Notification history with read state.
- Push tokens for multi-device delivery.

```mermaid
erDiagram
USERS {
varchar id PK
string username UK
string password
}
STASH_ITEMS {
int id PK
varchar user_id FK
string title
jsonb ai_analysis
}
PUSH_TOKENS {
int id PK
varchar user_id FK
text token
text platform
}
PRICE_TRACKING {
int id PK
int stash_item_id FK
varchar user_id FK
boolean is_active
int last_price
timestamp last_checked_at
timestamp next_check_at
int alert_threshold
}
NOTIFICATIONS {
int id PK
varchar user_id FK
int stash_item_id FK
text type
text title
text body
jsonb data
boolean is_read
timestamp sent_at
}
USERS ||--o{ PUSH_TOKENS : "owns"
USERS ||--o{ PRICE_TRACKING : "owns"
STASH_ITEMS ||--o{ PRICE_TRACKING : "tracked"
USERS ||--o{ NOTIFICATIONS : "receives"
STASH_ITEMS ||--o{ NOTIFICATIONS : "referenced"
```

**Diagram sources**
- [shared/schema.ts](file://shared/schema.ts#L6-L12)
- [shared/schema.ts](file://shared/schema.ts#L29-L50)
- [shared/schema.ts](file://shared/schema.ts#L259-L266)
- [shared/schema.ts](file://shared/schema.ts#L269-L280)
- [shared/schema.ts](file://shared/schema.ts#L283-L293)

**Section sources**
- [shared/schema.ts](file://shared/schema.ts#L259-L280)
- [shared/schema.ts](file://shared/schema.ts#L283-L293)

### Client Integration and User Preferences
- Push token registration:
  - The client requests permission and registers tokens with the backend.
  - Tokens are associated with the user and platform.
- Notification preferences:
  - The hook respects a user preference to enable or disable notifications.

```mermaid
sequenceDiagram
participant Client as "Client App"
participant Hook as "useNotifications"
participant API as "POST /api/push-token"
participant DB as "push_tokens table"
Client->>Hook : "Initialize"
Hook->>Hook : "Request permissions"
Hook->>API : "POST {userId, token, platform}"
API->>DB : "Upsert token"
DB-->>API : "Success"
API-->>Hook : "OK"
```

**Diagram sources**
- [client/hooks/useNotifications.ts](file://client/hooks/useNotifications.ts#L51-L128)
- [server/routes.ts](file://server/routes.ts#L46-L58)
- [shared/schema.ts](file://shared/schema.ts#L259-L266)

**Section sources**
- [client/hooks/useNotifications.ts](file://client/hooks/useNotifications.ts#L51-L128)
- [server/routes.ts](file://server/routes.ts#L46-L58)
- [shared/schema.ts](file://shared/schema.ts#L259-L266)

## Dependency Analysis
- Backend dependencies:
  - Drizzle ORM for database operations.
  - PostgreSQL for persistence.
  - Expo Push API for cross-platform notifications.
- Client dependencies:
  - Expo Notifications for device permissions and token retrieval.
  - React Query for API communication.

```mermaid
graph LR
Routes["server/routes.ts"] --> Service["server/services/notification.ts"]
Service --> DB[("shared/schema.ts")]
Service --> Expo["Expo Push API"]
ClientHooks["client/hooks/useNotifications.ts"] --> API["client/lib/query-client.ts"]
API --> Routes
```

**Diagram sources**
- [server/routes.ts](file://server/routes.ts#L132-L182)
- [server/services/notification.ts](file://server/services/notification.ts#L162-L223)
- [shared/schema.ts](file://shared/schema.ts#L269-L280)
- [client/hooks/useNotifications.ts](file://client/hooks/useNotifications.ts#L51-L128)
- [client/lib/query-client.ts](file://client/lib/query-client.ts#L26-L43)

**Section sources**
- [server/routes.ts](file://server/routes.ts#L132-L182)
- [server/services/notification.ts](file://server/services/notification.ts#L162-L223)
- [shared/schema.ts](file://shared/schema.ts#L269-L280)
- [client/hooks/useNotifications.ts](file://client/hooks/useNotifications.ts#L51-L128)
- [client/lib/query-client.ts](file://client/lib/query-client.ts#L26-L43)

## Performance Considerations
- Batch evaluation:
  - The scheduler evaluates all due tracking entries in a single pass; ensure indexes on isActive, nextCheckAt, and foreign keys are maintained.
- Network efficiency:
  - Use minimal payload sizes for push notifications and avoid redundant token lookups.
- Retry and resilience:
  - The service logs errors during price checks; consider adding retry logic or dead-letter handling for transient failures.
- Scalability:
  - Consider moving to a dedicated job queue (e.g., BullMQ) for precise scheduling and concurrency control.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- No alerts despite price changes:
  - Verify tracking is active and threshold is set appropriately.
  - Confirm nextCheckAt is due and the scheduler is running.
  - Check that current and last prices are present in stash item AI analysis.
- Notifications not received:
  - Ensure push tokens are registered and permissions are granted.
  - Validate the Expo Push API response and error logs.
- API errors:
  - Review server logs for 5xx responses and malformed requests.

**Section sources**
- [server/services/notification.ts](file://server/services/notification.ts#L332-L413)
- [server/routes.ts](file://server/routes.ts#L132-L182)
- [client/hooks/useNotifications.ts](file://client/hooks/useNotifications.ts#L51-L128)

## Conclusion
Hidden-Gem’s price tracking system combines scheduled monitoring, configurable thresholds, and reliable push notifications to keep users informed of significant price movements. The modular design separates concerns between the scheduler, service logic, and persistence, while the client handles token registration and user preferences. Extending the system can involve adjusting scheduling cadence, refining alert thresholds, and integrating richer analytics from AI analysis.