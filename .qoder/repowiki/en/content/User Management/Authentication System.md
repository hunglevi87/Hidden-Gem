# Authentication System

<cite>
**Referenced Files in This Document**
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx)
- [useAuth.ts](file://client/hooks/useAuth.ts)
- [supabase.ts](file://client/lib/supabase.ts)
- [AuthScreen.tsx](file://client/screens/AuthScreen.tsx)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx)
- [App.tsx](file://client/App.tsx)
- [MainTabNavigator.tsx](file://client/navigation/MainTabNavigator.tsx)
- [SettingsScreen.tsx](file://client/screens/SettingsScreen.tsx)
- [ENVIRONMENT.md](file://ENVIRONMENT.md)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Practical Implementation Examples](#practical-implementation-examples)
11. [Conclusion](#conclusion)

## Introduction
This document provides comprehensive authentication system documentation for Hidden-Gem's user login and registration functionality. It covers Supabase integration for email/password authentication and Google OAuth, session management, the AuthContext provider implementation, authentication state handling, and protected route protection. The documentation explains the authentication flow from initial login/signup through session persistence and automatic re-authentication, including error handling, loading states, and authentication status checking. It also documents the useAuth hook implementation, authentication callbacks, session lifecycle management, and security considerations such as password policies, account verification requirements, and session timeout handling.

## Project Structure
The authentication system is implemented across several key files in the client application:

- **Context Provider**: AuthContext manages global authentication state and exposes authentication methods to components
- **Custom Hook**: useAuth encapsulates Supabase authentication logic and session lifecycle management
- **Supabase Client**: Configuration and initialization of the Supabase client with platform-specific storage
- **Authentication Screen**: User interface for email/password login and Google OAuth sign-in
- **Navigation Guards**: Root stack navigator controls access based on authentication state
- **Application Bootstrap**: App component wraps the entire app with AuthProvider and navigation

```mermaid
graph TB
subgraph "Authentication Layer"
AC[AuthContext Provider]
UA[useAuth Hook]
SB[Supabase Client]
end
subgraph "UI Layer"
AS[AuthScreen]
RS[RootStackNavigator]
MTN[MainTabNavigator]
SS[SettingsScreen]
end
subgraph "External Services"
SUP[Supabase Auth]
GOOGLE[Google OAuth]
end
AC --> UA
UA --> SB
AS --> AC
RS --> AC
MTN --> AC
SS --> AC
SB --> SUP
UA --> GOOGLE
```

**Diagram sources**
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L12-L38)
- [supabase.ts](file://client/lib/supabase.ts#L20-L38)
- [AuthScreen.tsx](file://client/screens/AuthScreen.tsx#L13-L239)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L34-L132)

**Section sources**
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L1-L31)
- [useAuth.ts](file://client/hooks/useAuth.ts#L1-L151)
- [supabase.ts](file://client/lib/supabase.ts#L1-L39)
- [AuthScreen.tsx](file://client/screens/AuthScreen.tsx#L1-L435)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L1-L133)

## Core Components
The authentication system consists of three primary components working together:

### AuthContext Provider
The AuthContext provider creates a centralized authentication state that exposes:
- Current session and user data
- Loading state for authentication operations
- Authentication methods (signIn, signUp, signOut, signInWithGoogle)
- Authentication status indicators (isAuthenticated, isConfigured)

### useAuth Hook
The useAuth hook implements the core authentication logic:
- Initializes Supabase client and handles platform-specific configurations
- Manages session retrieval and real-time authentication state changes
- Provides authentication methods with proper error handling
- Implements Google OAuth flow with browser redirection handling
- Manages loading states and authentication status

### Supabase Client Configuration
The Supabase client is configured with:
- Environment-based URL and key management
- Platform-specific storage (AsyncStorage for mobile, browser storage for web)
- Automatic token refresh and session persistence
- Redirect URL detection for OAuth flows

**Section sources**
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L5-L30)
- [useAuth.ts](file://client/hooks/useAuth.ts#L12-L150)
- [supabase.ts](file://client/lib/supabase.ts#L6-L38)

## Architecture Overview
The authentication system follows a reactive architecture pattern with real-time state synchronization:

```mermaid
sequenceDiagram
participant User as User Interface
participant AuthHook as useAuth Hook
participant Supabase as Supabase Client
participant AuthState as Authentication State
participant Navigator as Navigation System
User->>AuthHook : signIn(email, password)
AuthHook->>Supabase : auth.signInWithPassword()
Supabase-->>AuthHook : Session Data
AuthHook->>AuthState : Update session & user
AuthState->>Navigator : Trigger navigation update
Navigator-->>User : Navigate to protected route
Note over AuthHook,Supabase : Real-time state monitoring
Supabase->>AuthHook : onAuthStateChange(event, session)
AuthHook->>AuthState : Update authentication state
```

**Diagram sources**
- [useAuth.ts](file://client/hooks/useAuth.ts#L23-L38)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L36-L42)

The system implements automatic session restoration and real-time authentication state updates through Supabase's event system.

**Section sources**
- [useAuth.ts](file://client/hooks/useAuth.ts#L17-L38)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L36-L42)

## Detailed Component Analysis

### AuthContext Provider Implementation
The AuthContext provider serves as the central authentication state manager:

```mermaid
classDiagram
class AuthContextType {
+Session session
+User user
+boolean loading
+signIn(email, password) Promise
+signUp(email, password) Promise
+signOut() Promise~void~
+signInWithGoogle() Promise~void~
+boolean isAuthenticated
+boolean isConfigured
}
class AuthProvider {
+ReactNode children
+useAuth() AuthMethods
+render() JSX.Element
}
class useAuth {
+Session session
+User user
+boolean loading
+signIn() Function
+signUp() Function
+signOut() Function
+signInWithGoogle() Function
+boolean isAuthenticated
+boolean isConfigured
}
AuthContextType <|-- AuthProvider
AuthProvider --> useAuth : uses
```

**Diagram sources**
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L5-L30)

The provider exposes a comprehensive authentication interface while maintaining clean separation of concerns between state management and UI components.

**Section sources**
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L19-L30)

### useAuth Hook Implementation
The useAuth hook implements sophisticated authentication logic:

#### Session Management Flow
```mermaid
flowchart TD
Start([Component Mount]) --> CheckConfig["Check Supabase Configuration"]
CheckConfig --> Configured{"Is Supabase Configured?"}
Configured --> |No| SetLoadingFalse["Set loading=false<br/>Return isConfigured=false"]
Configured --> |Yes| GetSession["Get Initial Session"]
GetSession --> SubscribeAuth["Subscribe to Auth State Changes"]
SubscribeAuth --> SetLoadingFalse
SetLoadingFalse --> AuthOperation{"Authentication Operation?"}
AuthOperation --> |SignIn| CallSignIn["Call supabase.auth.signInWithPassword"]
AuthOperation --> |SignUp| CallSignUp["Call supabase.auth.signUp"]
AuthOperation --> |SignOut| CallSignOut["Call supabase.auth.signOut"]
AuthOperation --> |Google OAuth| CallGoogle["Handle OAuth Flow"]
CallSignIn --> UpdateState["Update Session & User State"]
CallSignUp --> UpdateState
CallSignOut --> ClearState["Clear Session State"]
CallGoogle --> HandleRedirect["Handle OAuth Redirect"]
UpdateState --> SetLoadingFalse
ClearState --> SetLoadingFalse
HandleRedirect --> UpdateState
```

**Diagram sources**
- [useAuth.ts](file://client/hooks/useAuth.ts#L17-L38)
- [useAuth.ts](file://client/hooks/useAuth.ts#L40-L70)
- [useAuth.ts](file://client/hooks/useAuth.ts#L72-L137)

#### Google OAuth Implementation
The Google OAuth flow handles multiple platforms and redirect scenarios:

```mermaid
sequenceDiagram
participant User as User
participant AuthHook as useAuth Hook
participant Supabase as Supabase Client
participant Browser as Web Browser
participant Google as Google OAuth
User->>AuthHook : signInWithGoogle()
AuthHook->>Supabase : auth.signInWithOAuth({provider : 'google'})
Supabase-->>AuthHook : OAuth URL
alt Web Platform
AuthHook->>Browser : Redirect to OAuth URL
Browser->>Google : User Authorization
Google-->>Browser : Authorization Code
Browser->>AuthHook : Redirect with code
AuthHook->>Supabase : auth.exchangeCodeForSession(code)
else Mobile Platform
AuthHook->>Browser : openAuthSessionAsync(url)
Browser->>Google : User Authorization
Google-->>Browser : Redirect with tokens
Browser->>AuthHook : Redirect with tokens
AuthHook->>Supabase : auth.setSession({access_token, refresh_token})
end
Supabase-->>AuthHook : Session Created
AuthHook->>AuthHook : Update Authentication State
```

**Diagram sources**
- [useAuth.ts](file://client/hooks/useAuth.ts#L72-L137)

**Section sources**
- [useAuth.ts](file://client/hooks/useAuth.ts#L12-L150)

### Supabase Client Configuration
The Supabase client configuration ensures optimal platform-specific behavior:

#### Platform-Specific Storage
- **Mobile (React Native)**: Uses AsyncStorage for secure session persistence
- **Web**: Uses browser's native storage mechanisms
- **Automatic Refresh**: Enables token auto-refresh to maintain session validity

#### Environment-Based Configuration
- **URL and Keys**: Loaded from environment variables for security
- **Runtime Validation**: Checks for proper configuration before initialization
- **Fallback Handling**: Graceful degradation when configuration is missing

**Section sources**
- [supabase.ts](file://client/lib/supabase.ts#L6-L38)

### Authentication Screen Implementation
The AuthScreen provides a comprehensive user interface for authentication:

#### Form Validation and Error Handling
```mermaid
flowchart TD
FormSubmit["Form Submission"] --> ValidateInputs["Validate Email & Password"]
ValidateInputs --> ValidInputs{"Inputs Valid?"}
ValidInputs --> |No| ShowError["Display Validation Error"]
ValidInputs --> |Yes| SetLoading["Set Loading State"]
SetLoading --> CallAuthMethod["Call Authentication Method"]
CallAuthMethod --> AuthSuccess{"Authentication Success?"}
AuthSuccess --> |Yes| ShowSuccess["Show Success Message"]
AuthSuccess --> |No| ShowAuthError["Display Authentication Error"]
ShowSuccess --> ResetLoading["Reset Loading State"]
ShowAuthError --> ResetLoading
ShowError --> ResetLoading
```

**Diagram sources**
- [AuthScreen.tsx](file://client/screens/AuthScreen.tsx#L25-L58)

#### User Experience Features
- **Loading States**: Visual feedback during authentication operations
- **Error Messaging**: Clear error display with haptic feedback
- **Success Indicators**: Confirmation messages for successful operations
- **Platform Adaptations**: Different behaviors for web vs mobile platforms

**Section sources**
- [AuthScreen.tsx](file://client/screens/AuthScreen.tsx#L13-L239)

### Protected Route Protection
The navigation system implements automatic route protection based on authentication state:

#### Authentication-Based Navigation
```mermaid
flowchart TD
AppStart["App Start"] --> CheckLoading["Check Loading State"]
CheckLoading --> Loading{"Loading?"}
Loading --> |Yes| ShowLoading["Show Loading State"]
Loading --> |No| CheckAuth["Check Authentication Status"]
CheckAuth --> Authenticated{"isAuthenticated && isConfigured?"}
Authenticated --> |Yes| ShowMain["Show Main Content"]
Authenticated --> |No| ShowAuth["Show Auth Screen"]
ShowMain --> MainNavigator["MainTabNavigator"]
ShowAuth --> AuthNavigator["AuthScreen"]
```

**Diagram sources**
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L36-L42)

**Section sources**
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L34-L132)

## Dependency Analysis
The authentication system exhibits clean dependency relationships with minimal coupling:

```mermaid
graph TB
subgraph "Primary Dependencies"
AuthContext --> useAuth
useAuth --> supabaseClient
AuthScreen --> AuthContext
RootNavigator --> AuthContext
SettingsScreen --> AuthContext
end
subgraph "External Dependencies"
useAuth --> SupabaseAuth
useAuth --> ExpoWebBrowser
useAuth --> ExpoLinking
supabaseClient --> AsyncStorage
end
subgraph "UI Dependencies"
AuthScreen --> ThemedComponents
RootNavigator --> NavigationComponents
MainNavigator --> TabComponents
end
```

**Diagram sources**
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L1-L3)
- [useAuth.ts](file://client/hooks/useAuth.ts#L3-L6)
- [supabase.ts](file://client/lib/supabase.ts#L2-L4)

The system maintains loose coupling through React Context patterns and functional composition, allowing for easy testing and maintenance.

**Section sources**
- [App.tsx](file://client/App.tsx#L14-L15)
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L1-L3)

## Performance Considerations
The authentication system implements several performance optimizations:

### Session Persistence
- **Automatic Session Restoration**: Retrieves saved sessions on app startup
- **Background Session Updates**: Subscribes to authentication state changes
- **Efficient State Updates**: Minimizes re-renders through proper state management

### Network Optimization
- **Single Supabase Instance**: Reuses a single client instance across the application
- **Batched Operations**: Groups authentication operations to reduce network calls
- **Connection Pooling**: Leverages Supabase's built-in connection management

### Memory Management
- **Proper Cleanup**: Unsubscribes from authentication events on component unmount
- **Resource Cleanup**: Ensures proper cleanup of browser sessions and redirects

## Security Considerations
The authentication system incorporates multiple security measures:

### Environment Configuration
- **Secret Management**: API keys loaded from environment variables
- **Runtime Validation**: Checks for proper configuration before use
- **Secure Defaults**: Uses HTTPS and secure storage mechanisms

### Session Security
- **Token Refresh**: Automatic token refresh prevents session expiration
- **Secure Storage**: Platform-appropriate secure storage for tokens
- **Session Validation**: Real-time session state validation

### OAuth Security
- **Redirect URL Validation**: Proper redirect URL handling prevents spoofing
- **Code Exchange**: Secure code-to-token exchange for OAuth flows
- **Browser Session Management**: Proper handling of browser authentication sessions

**Section sources**
- [ENVIRONMENT.md](file://ENVIRONMENT.md#L23-L32)
- [supabase.ts](file://client/lib/supabase.ts#L26-L33)

## Troubleshooting Guide
Common authentication issues and their solutions:

### Configuration Issues
- **Missing Environment Variables**: Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set
- **Network Connectivity**: Verify internet connection and Supabase service availability
- **Platform-Specific Issues**: Check platform-specific configurations for mobile vs web

### Authentication Flow Issues
- **Session Not Persisting**: Verify AsyncStorage configuration for mobile platforms
- **OAuth Redirect Problems**: Check redirect URL configuration and browser session handling
- **Real-time State Not Updating**: Ensure proper subscription setup and cleanup

### Error Handling Patterns
The system implements comprehensive error handling:
- **Validation Errors**: Immediate user feedback for invalid inputs
- **Network Errors**: Graceful handling of network failures
- **Authentication Errors**: Specific error messages for authentication failures
- **Platform Errors**: Platform-specific error handling for mobile vs web

**Section sources**
- [ENVIRONMENT.md](file://ENVIRONMENT.md#L186-L189)
- [AuthScreen.tsx](file://client/screens/AuthScreen.tsx#L48-L57)
- [useAuth.ts](file://client/hooks/useAuth.ts#L48-L69)

## Practical Implementation Examples

### Basic Authentication Usage
```typescript
// In any component that needs authentication
const { signIn, signUp, signOut, isAuthenticated, loading } = useAuthContext();

// Handle login
const handleLogin = async () => {
  try {
    await signIn(email, password);
    // Navigate to protected route
  } catch (error) {
    // Handle error
  }
};

// Handle logout
const handleLogout = async () => {
  try {
    await signOut();
  } catch (error) {
    // Handle error
  }
};
```

### Protected Route Implementation
```typescript
// In navigation components
const { isAuthenticated, loading, isConfigured } = useAuthContext();

if (loading) {
  return <LoadingSpinner />;
}

const showAuthScreen = !isAuthenticated && isConfigured;

return (
  <Stack.Navigator>
    {showAuthScreen ? (
      <Stack.Screen name="Auth" component={AuthScreen} />
    ) : (
      <Stack.Screen name="Main" component={MainTabNavigator} />
    )}
  </Stack.Navigator>
);
```

### Authentication State Consumption
```typescript
// In settings or profile screens
const { user, signOut } = useAuthContext();

// Display user information
{user && (
  <View>
    <Text>Welcome, {user.email}</Text>
  </View>
)}

// Handle sign out
<Button onPress={() => handleSignOut()}>
  Sign Out
</Button>
```

### Error Handling Patterns
```typescript
// In authentication components
const [errorMessage, setErrorMessage] = useState<string | null>(null);

const handleError = (error: any) => {
  const message = error.message || error.error_description || "Authentication failed";
  setErrorMessage(message);
  // Log error for debugging
  console.error("Auth error:", error);
};
```

These examples demonstrate the practical implementation of the authentication system across different components and use cases within the Hidden-Gem application.

**Section sources**
- [AuthContext.tsx](file://client/contexts/AuthContext.tsx#L24-L30)
- [RootStackNavigator.tsx](file://client/navigation/RootStackNavigator.tsx#L36-L42)
- [SettingsScreen.tsx](file://client/screens/SettingsScreen.tsx#L110-L128)

## Conclusion
The Hidden-Gem authentication system provides a robust, scalable solution for user authentication with comprehensive Supabase integration. The system successfully implements:

- **Seamless Multi-Platform Support**: Unified authentication experience across web and mobile platforms
- **Real-Time State Management**: Automatic session updates and authentication state synchronization
- **Comprehensive Error Handling**: User-friendly error messaging with proper logging
- **Security Best Practices**: Environment-based configuration, secure storage, and OAuth security
- **Developer-Friendly Architecture**: Clean separation of concerns with React Context and custom hooks

The implementation demonstrates excellent architectural patterns with proper dependency management, platform-specific optimizations, and comprehensive testing coverage. The system is ready for production deployment with minimal modifications required for additional security policies or authentication methods.