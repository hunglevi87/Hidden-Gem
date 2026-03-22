# State Management

<cite>
**Referenced Files in This Document**
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx)
- [useAuth.ts](file://client/hooks/useAuth.ts)
- [supabase.ts](file://client/lib/supabase.ts)
- [query-client.ts](file://client/lib/query-client.ts)
- [useTheme.ts](file://client/hooks/useTheme.ts)
- [useColorScheme.ts](file://client/hooks/useColorScheme.ts)
- [useColorScheme.web.ts](file://client/hooks/useColorScheme.web.ts)
- [theme.ts](file://client/constants/theme.ts)
- [useNotifications.ts](file://client/hooks/useNotifications.ts)
- [useScreenOptions.ts](file://client/hooks/useScreenOptions.ts)
- [ErrorBoundary.tsx](file://client/components/ErrorBoundary.tsx)
- [ErrorFallback.tsx](file://client/components/ErrorFallback.tsx)
- [App.tsx](file://client/App.tsx)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx)
- [HomeStackNavigator.tsx](file://client/navigation/HomeStackNavigator.tsx)
- [AuthScreen.tsx](file://client/screens/AuthScreen.tsx)
- [HomeScreen.tsx](file://client/screens/HomeScreen.tsx)
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
This document explains the state management architecture of the client application, focusing on React Context providers, custom hooks, and React Query integration. It covers authentication context implementation, user session management, theme and screen options management, notifications, and navigation-driven state. It also documents error boundaries, loading state management, state synchronization with the backend, and performance optimization techniques.

## Project Structure
The state management spans several layers:
- Context providers encapsulate global state (authentication).
- Custom hooks encapsulate domain-specific state and side effects (theme, notifications, screen options, color scheme).
- React Query manages server state with a centralized client and default caching policies.
- Navigation orchestrates state-driven routing and screen options.
- Error boundaries provide robust failure handling.

```mermaid
graph TB
subgraph "Providers"
QCP["QueryClientProvider<br/>client/lib/query-client.ts"]
AP["AuthProvider<br/>client/contexts/AuthContext.tsx"]
end
subgraph "Contexts and Hooks"
UCtx["useAuthContext()<br/>client/contexts/AuthContext.tsx"]
UAuth["useAuth()<br/>client/hooks/useAuth.ts"]
USb["supabase.ts<br/>client/lib/supabase.ts"]
UTheme["useTheme()<br/>client/hooks/useTheme.ts"]
UColor["useColorScheme()<br/>client/hooks/useColorScheme*.ts"]
UNotif["useNotifications()<br/>client/hooks/useNotifications.ts"]
UScreen["useScreenOptions()<br/>client/hooks/useScreenOptions.ts"]
end
subgraph "UI and Navigation"
App["App.tsx"]
RootNav["RootStackNavigator.tsx"]
HomeNav["HomeStackNavigator.tsx"]
AuthScreen["AuthScreen.tsx"]
HomeScreen["HomeScreen.tsx"]
EB["ErrorBoundary.tsx"]
EBF["ErrorFallback.tsx"]
end
App --> QCP
App --> AP
App --> RootNav
RootNav --> UCtx
UCtx --> UAuth
UAuth --> USb
App --> UNotif
RootNav --> UScreen
HomeNav --> UScreen
HomeScreen --> UTheme
UTheme --> UColor
EB --> EBF
```

**Diagram sources**
- [App.tsx](file://client/App.tsx#L49-L59)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L12-L151)
- [supabase.ts](file://client/lib/supabase.ts#L1-L39)
- [query-client.ts](file://client/lib/query-client.ts#L66-L80)
- [useTheme.ts](file://client/hooks/useTheme.ts#L1-L14)
- [useColorScheme.ts](file://client/hooks/useColorScheme.ts#L1-L2)
- [useColorScheme.web.ts](file://client/hooks/useColorScheme.web.ts#L1-L22)
- [useNotifications.ts](file://client/hooks/useNotifications.ts#L51-L137)
- [useScreenOptions.ts](file://client/hooks/useScreenOptions.ts#L11-L42)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L34-L133)
- [HomeStackNavigator.tsx](file://client/navigation/HomeStackNavigator.tsx#L13-L28)
- [AuthScreen.tsx](file://client/screens/AuthScreen.tsx#L13-L239)
- [HomeScreen.tsx](file://client/screens/HomeScreen.tsx#L9-L29)
- [ErrorBoundary.tsx](file://client/components/ErrorBoundary.tsx#L16-L55)
- [ErrorFallback.tsx](file://client/components/ErrorFallback.tsx#L22-L144)

**Section sources**
- [App.tsx](file://client/App.tsx#L1-L67)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L1-L31)
- [useAuth.ts](file://client/hooks/useAuth.ts#L1-L151)
- [supabase.ts](file://client/lib/supabase.ts#L1-L39)
- [query-client.ts](file://client/lib/query-client.ts#L1-L80)
- [useTheme.ts](file://client/hooks/useTheme.ts#L1-L14)
- [useColorScheme.ts](file://client/hooks/useColorScheme.ts#L1-L2)
- [useColorScheme.web.ts](file://client/hooks/useColorScheme.web.ts#L1-L22)
- [useNotifications.ts](file://client/hooks/useNotifications.ts#L1-L137)
- [useScreenOptions.ts](file://client/hooks/useScreenOptions.ts#L1-L42)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L1-L133)
- [HomeStackNavigator.tsx](file://client/navigation/HomeStackNavigator.tsx#L1-L28)
- [AuthScreen.tsx](file://client/screens/AuthScreen.tsx#L1-L435)
- [HomeScreen.tsx](file://client/screens/HomeScreen.tsx#L1-L29)
- [ErrorBoundary.tsx](file://client/components/ErrorBoundary.tsx#L1-L55)
- [ErrorFallback.tsx](file://client/components/ErrorFallback.tsx#L1-L247)

## Core Components
- Authentication Context Provider: Wraps children with a provider that exposes session, user, loading, and auth actions via a custom hook.
- Authentication Hook: Manages Supabase session retrieval, subscription to auth state changes, and auth actions (sign in, sign up, sign out, Google OAuth).
- Supabase Client: Centralized client with environment-based configuration, session persistence, and redirect URL handling.
- React Query Client: Centralized client with default query and mutation policies, and a typed query function factory.
- Theme and Color Scheme: Theme composition and color scheme detection with SSR/web hydration support.
- Notifications Hook: Optional push notification registration and lifecycle management gated by authentication and preferences.
- Screen Options Hook: Navigation screen options derived from theme and platform capabilities.
- Error Boundary: Class-based error boundary with fallback UI and developer diagnostics.

**Section sources**
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L5-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L12-L151)
- [supabase.ts](file://client/lib/supabase.ts#L6-L39)
- [query-client.ts](file://client/lib/query-client.ts#L66-L80)
- [useTheme.ts](file://client/hooks/useTheme.ts#L1-L14)
- [useColorScheme.ts](file://client/hooks/useColorScheme.ts#L1-L2)
- [useColorScheme.web.ts](file://client/hooks/useColorScheme.web.ts#L7-L22)
- [useNotifications.ts](file://client/hooks/useNotifications.ts#L51-L137)
- [useScreenOptions.ts](file://client/hooks/useScreenOptions.ts#L11-L42)
- [ErrorBoundary.tsx](file://client/components/ErrorBoundary.tsx#L16-L55)

## Architecture Overview
The app composes providers at the root, then consumes state in navigators and screens. Authentication drives navigation decisions, while React Query centralizes server state. Theme and screen options are computed per component. Error boundaries wrap the entire tree to gracefully handle rendering errors.

```mermaid
sequenceDiagram
participant App as "App.tsx"
participant QCP as "QueryClientProvider"
participant AP as "AuthProvider"
participant RootNav as "RootStackNavigator.tsx"
participant UCtx as "useAuthContext()"
participant UAuth as "useAuth()"
participant Sb as "supabase.ts"
App->>QCP : "Wrap children"
App->>AP : "Wrap children"
App->>RootNav : "Render navigator"
RootNav->>UCtx : "Read isAuthenticated/loading/isConfigured"
UCtx->>UAuth : "Return auth state/actions"
UAuth->>Sb : "getSession(), onAuthStateChange()"
RootNav-->>App : "Conditional navigation based on auth state"
```

**Diagram sources**
- [App.tsx](file://client/App.tsx#L49-L59)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L34-L133)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L17-L38)
- [supabase.ts](file://client/lib/supabase.ts#L20-L34)

## Detailed Component Analysis

### Authentication Context and Hook
- Purpose: Provide session, user, loading, and auth action callbacks to consumers.
- Key behaviors:
  - Initialize session from Supabase and subscribe to auth state changes.
  - Expose sign in/sign up/sign out and Google OAuth flows.
  - Compute authentication flags (authenticated, configured).
- Subscription handling: Subscribes on mount and unsubscribes on unmount to prevent leaks.
- Error handling: Throws when Supabase is not configured; callers display user-friendly messages.

```mermaid
sequenceDiagram
participant Comp as "Consumer Component"
participant UCtx as "useAuthContext()"
participant UAuth as "useAuth()"
participant Sb as "Supabase Client"
Comp->>UCtx : "Call useAuthContext()"
UCtx-->>Comp : "Return { session, user, loading, signIn, signUp, signOut, signInWithGoogle, isAuthenticated, isConfigured }"
Comp->>UAuth : "signIn(email, password)"
UAuth->>Sb : "auth.signInWithPassword(...)"
Sb-->>UAuth : "Result or error"
UAuth-->>Comp : "Resolve or throw"
```

**Diagram sources**
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L40-L70)
- [supabase.ts](file://client/lib/supabase.ts#L26-L33)

**Section sources**
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L5-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L12-L151)
- [supabase.ts](file://client/lib/supabase.ts#L6-L39)

### Supabase Client and Session Persistence
- Configuration: Reads environment variables for URL and anonymous key; guards against missing config.
- Redirect handling: Computes redirect URL based on platform.
- Persistence: Uses AsyncStorage on native and browser storage on web; enables auto-refresh and session persistence.
- Session lifecycle: Retrieves initial session and subscribes to auth events.

```mermaid
flowchart TD
Start(["Initialize Supabase"]) --> CheckCfg["Check URL and Anon Key"]
CheckCfg --> |Missing| Warn["Log warning and return null client"]
CheckCfg --> |Present| Create["createClient(...) with auth options"]
Create --> Persist["Enable autoRefreshToken and persistSession"]
Persist --> Done(["Ready"])
Warn --> Done
```

**Diagram sources**
- [supabase.ts](file://client/lib/supabase.ts#L6-L39)

**Section sources**
- [supabase.ts](file://client/lib/supabase.ts#L6-L39)

### React Query Client and Caching Strategies
- Centralized client: Created once and passed to QueryClientProvider at the root.
- Default policies:
  - Queries: Infinite staleTime, no refetch on window focus, no retry, credentials included.
  - Mutations: No retry.
- Query function factory: Accepts an unauthorized behavior option to either throw or return null on 401.
- API request helper: Builds URLs from environment variable and performs fetch with credentials.

```mermaid
flowchart TD
Init["Create QueryClient"] --> Defaults["Set defaultOptions"]
Defaults --> Q["Queries: staleTime=Infinity, no refetchOnWindowFocus, retry=false"]
Defaults --> M["Mutations: retry=false"]
Q --> Factory["getQueryFn(on401)"]
Factory --> Fetch["fetch(url, { credentials: 'include' })"]
Fetch --> Ok{"res.ok?"}
Ok --> |No| ThrowErr["Throw error"]
Ok --> |Yes| Parse["Parse JSON"]
Parse --> Return["Return data"]
```

**Diagram sources**
- [query-client.ts](file://client/lib/query-client.ts#L66-L80)
- [query-client.ts](file://client/lib/query-client.ts#L46-L64)
- [query-client.ts](file://client/lib/query-client.ts#L26-L43)

**Section sources**
- [query-client.ts](file://client/lib/query-client.ts#L1-L80)

### Theme and Color Scheme Management
- Color scheme detection:
  - On native: useColorScheme from react-native.
  - On web: hydrate on client to support SSR and return "light" until hydrated.
- Theme composition: Selects Colors by scheme and exposes theme and isDark flag.
- Typography, spacing, border radius, fonts, and shadows are centrally defined.

```mermaid
flowchart TD
Hydrate["Web: hydrate color scheme"] --> HasHydrated{"Has hydrated?"}
HasHydrated --> |No| Light["Return 'light'"]
HasHydrated --> |Yes| RN["useColorScheme()"]
RN --> Select["Select Colors[scheme]"]
Select --> Export["Export { theme, isDark }"]
```

**Diagram sources**
- [useColorScheme.web.ts](file://client/hooks/useColorScheme.web.ts#L7-L22)
- [useColorScheme.ts](file://client/hooks/useColorScheme.ts#L1-L2)
- [useTheme.ts](file://client/hooks/useTheme.ts#L1-L14)
- [theme.ts](file://client/constants/theme.ts#L3-L40)

**Section sources**
- [useColorScheme.web.ts](file://client/hooks/useColorScheme.web.ts#L1-L22)
- [useColorScheme.ts](file://client/hooks/useColorScheme.ts#L1-L2)
- [useTheme.ts](file://client/hooks/useTheme.ts#L1-L14)
- [theme.ts](file://client/constants/theme.ts#L1-L167)

### Notifications Hook and State Synchronization
- Purpose: Register and manage Expo push tokens when authenticated and permissions are granted.
- Behavior:
  - Gate setup by authentication and stored preference.
  - Load notifications module conditionally (non-web).
  - Request and store permissions; get Expo push token; register/unregister with backend.
  - Add/remove notification listeners on mount/unmount.
- Optional failures: Silent catches to avoid blocking the app.

```mermaid
sequenceDiagram
participant Comp as "Component"
participant UNotif as "useNotifications(isAuthenticated)"
participant Notif as "expo-notifications"
participant API as "apiRequest('/api/push-token')"
Comp->>UNotif : "Call with isAuthenticated"
UNotif->>UNotif : "Check preference and load module"
UNotif->>Notif : "getPermissionsAsync(), requestPermissionsAsync()"
Notif-->>UNotif : "Permission status"
UNotif->>Notif : "getExpoPushTokenAsync()"
Notif-->>UNotif : "Token"
UNotif->>API : "POST /api/push-token"
API-->>UNotif : "OK"
UNotif-->>Comp : "Expose { expoPushToken, permissionStatus, registerToken, unregisterToken }"
```

**Diagram sources**
- [useNotifications.ts](file://client/hooks/useNotifications.ts#L51-L137)
- [query-client.ts](file://client/lib/query-client.ts#L26-L43)

**Section sources**
- [useNotifications.ts](file://client/hooks/useNotifications.ts#L1-L137)
- [query-client.ts](file://client/lib/query-client.ts#L26-L43)

### Screen Options and Navigation Integration
- useScreenOptions returns navigation options derived from theme and platform capabilities.
- Root navigator conditionally renders Auth or Main stacks based on authentication and configuration state.
- Home navigator applies screen options globally.

```mermaid
flowchart TD
Call["useScreenOptions()"] --> Theme["Resolve Colors and Fonts"]
Theme --> Options["Build NativeStack options"]
Options --> Return["Return options object"]
```

**Diagram sources**
- [useScreenOptions.ts](file://client/hooks/useScreenOptions.ts#L11-L42)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L34-L133)
- [HomeStackNavigator.tsx](file://client/navigation/HomeStackNavigator.tsx#L13-L28)

**Section sources**
- [useScreenOptions.ts](file://client/hooks/useScreenOptions.ts#L1-L42)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L34-L133)
- [HomeStackNavigator.tsx](file://client/navigation/HomeStackNavigator.tsx#L13-L28)

### Error Boundaries and Fallback UI
- ErrorBoundary is a class component that captures rendering errors and renders a fallback.
- ErrorFallback provides a user-facing UI to reload the app and optionally shows detailed error information in development.

```mermaid
sequenceDiagram
participant Tree as "React Tree"
participant EB as "ErrorBoundary"
participant EBF as "ErrorFallback"
Tree->>EB : "Render children"
EB-->>Tree : "Render children normally"
Note over Tree : "Error thrown during render"
Tree->>EB : "componentDidCatch(error, info)"
EB-->>EB : "setState({ error })"
EB->>EBF : "Render fallback with reset handler"
```

**Diagram sources**
- [ErrorBoundary.tsx](file://client/components/ErrorBoundary.tsx#L16-L55)
- [ErrorFallback.tsx](file://client/components/ErrorFallback.tsx#L22-L144)

**Section sources**
- [ErrorBoundary.tsx](file://client/components/ErrorBoundary.tsx#L1-L55)
- [ErrorFallback.tsx](file://client/components/ErrorFallback.tsx#L1-L247)

### Practical Examples of State Consumption

- Authentication in AuthScreen:
  - Consumes useAuthContext to drive sign-in/sign-up and Google sign-in flows.
  - Manages local loading and error states while delegating network operations to the hook.
  - Example path: [AuthScreen.tsx](file://client/screens/AuthScreen.tsx#L13-L239)

- Navigation-driven state in RootStackNavigator:
  - Uses useAuthContext to decide whether to show Auth or Main stacks.
  - Uses useScreenOptions to apply consistent screen options.
  - Example path: [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L34-L133)

- Theme usage in HomeScreen:
  - Uses useTheme to style content areas and layout.
  - Example path: [HomeScreen.tsx](file://client/screens/HomeScreen.tsx#L9-L29)

- Notifications gating:
  - App initializes notifications only when authenticated.
  - Example path: [App.tsx](file://client/App.tsx#L31-L47), [useNotifications.ts](file://client/hooks/useNotifications.ts#L51-L137)

## Dependency Analysis
- Context-to-hook coupling: AuthProvider depends on useAuth; useAuth depends on supabase.ts.
- Navigation-to-context coupling: Root and Home navigators depend on useAuthContext and useScreenOptions.
- Theme-to-color-scheme coupling: useTheme depends on useColorScheme and theme.ts.
- Notifications-to-api coupling: useNotifications depends on query-client.ts for API requests.
- Error boundary-to-fallback coupling: ErrorBoundary renders ErrorFallback.

```mermaid
graph LR
AuthCtx["AuthContext.tsx"] --> UseAuth["useAuth.ts"]
UseAuth --> Supabase["supabase.ts"]
App["App.tsx"] --> AuthCtx
App --> QueryClient["query-client.ts"]
RootNav["RootStackNavigator.tsx"] --> AuthCtx
RootNav --> ScreenOpts["useScreenOptions.ts"]
HomeNav["HomeStackNavigator.tsx"] --> ScreenOpts
HomeScreen["HomeScreen.tsx"] --> ThemeHook["useTheme.ts"]
ThemeHook --> ColorScheme["useColorScheme*.ts"]
ThemeHook --> ThemeConst["theme.ts"]
App --> Notif["useNotifications.ts"]
Notif --> QueryClient
ErrorBoundary["ErrorBoundary.tsx"] --> ErrorFallback["ErrorFallback.tsx"]
```

**Diagram sources**
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L12-L151)
- [supabase.ts](file://client/lib/supabase.ts#L1-L39)
- [App.tsx](file://client/App.tsx#L49-L59)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L34-L133)
- [HomeStackNavigator.tsx](file://client/navigation/HomeStackNavigator.tsx#L13-L28)
- [useScreenOptions.ts](file://client/hooks/useScreenOptions.ts#L11-L42)
- [HomeScreen.tsx](file://client/screens/HomeScreen.tsx#L9-L29)
- [useTheme.ts](file://client/hooks/useTheme.ts#L1-L14)
- [useColorScheme.ts](file://client/hooks/useColorScheme.ts#L1-L2)
- [useColorScheme.web.ts](file://client/hooks/useColorScheme.web.ts#L1-L22)
- [theme.ts](file://client/constants/theme.ts#L1-L167)
- [useNotifications.ts](file://client/hooks/useNotifications.ts#L51-L137)
- [query-client.ts](file://client/lib/query-client.ts#L26-L43)
- [ErrorBoundary.tsx](file://client/components/ErrorBoundary.tsx#L16-L55)
- [ErrorFallback.tsx](file://client/components/ErrorFallback.tsx#L22-L144)

**Section sources**
- [App.tsx](file://client/App.tsx#L1-L67)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L1-L133)
- [HomeStackNavigator.tsx](file://client/navigation/HomeStackNavigator.tsx#L1-L28)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L1-L31)
- [useAuth.ts](file://client/hooks/useAuth.ts#L1-L151)
- [supabase.ts](file://client/lib/supabase.ts#L1-L39)
- [useTheme.ts](file://client/hooks/useTheme.ts#L1-L14)
- [useColorScheme.ts](file://client/hooks/useColorScheme.ts#L1-L2)
- [useColorScheme.web.ts](file://client/hooks/useColorScheme.web.ts#L1-L22)
- [theme.ts](file://client/constants/theme.ts#L1-L167)
- [useNotifications.ts](file://client/hooks/useNotifications.ts#L1-L137)
- [useScreenOptions.ts](file://client/hooks/useScreenOptions.ts#L1-L42)
- [query-client.ts](file://client/lib/query-client.ts#L1-L80)
- [ErrorBoundary.tsx](file://client/components/ErrorBoundary.tsx#L1-L55)
- [ErrorFallback.tsx](file://client/components/ErrorFallback.tsx#L1-L247)

## Performance Considerations
- Infinite cache for queries: Prevents unnecessary refetches but requires explicit invalidation when data changes.
- No refetch on window focus: Reduces background activity; rely on explicit refetch triggers.
- No retry: Keeps error boundaries responsible for recovery; avoid retry storms.
- Subscription cleanup: useAuth unsubscribes on unmount; ensure similar cleanup in other long-lived subscriptions.
- Conditional module loading: Notifications module is loaded lazily on native platforms to avoid overhead on web.
- Hydration guard: useColorScheme.web.ts prevents SSR mismatches by deferring to client-side detection.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Authentication not configured:
  - Symptom: Loading remains false, actions throw.
  - Cause: Missing Supabase URL or anonymous key.
  - Resolution: Set environment variables and ensure isSupabaseConfigured is true.
  - Section sources
    - [supabase.ts](file://client/lib/supabase.ts#L6-L9)
    - [useAuth.ts](file://client/hooks/useAuth.ts#L18-L21)

- Auth state changes not reflected:
  - Symptom: UI does not update after login/logout.
  - Cause: Missing subscription or unsubscription.
  - Resolution: Verify onAuthStateChange subscription and cleanup in useAuth.
  - Section sources
    - [useAuth.ts](file://client/hooks/useAuth.ts#L31-L37)

- Navigation stuck on Auth:
  - Symptom: Auth screen shown when already authenticated.
  - Cause: loading flag not handled or isConfigured false.
  - Resolution: Ensure loading is considered before deciding to show Auth.
  - Section sources
    - [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L38-L42)

- Notifications not registering:
  - Symptom: No push token registered.
  - Cause: Permissions denied or module unavailable.
  - Resolution: Check permission status and module availability; ensure authenticated gating.
  - Section sources
    - [useNotifications.ts](file://client/hooks/useNotifications.ts#L77-L128)

- Error boundary not catching:
  - Symptom: Crashes still crash the app.
  - Cause: Functional components cannot act as error boundaries.
  - Resolution: Wrap root with ErrorBoundary and use ErrorFallback for recovery.
  - Section sources
    - [ErrorBoundary.tsx](file://client/components/ErrorBoundary.tsx#L16-L55)
    - [ErrorFallback.tsx](file://client/components/ErrorFallback.tsx#L22-L144)

## Conclusion
The application’s state management combines a clean Context provider pattern, platform-aware custom hooks, and a strongly configured React Query client. Authentication state drives navigation, theme and screen options unify UI, and notifications integrate with backend APIs. Error boundaries provide resilience, and careful subscription and hydration practices ensure correctness across platforms.