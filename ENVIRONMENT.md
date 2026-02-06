# Environment Setup Guide - HiddenGem

This guide explains how to set up and run the HiddenGem project for development.

## Prerequisites

- **Node.js**: v18 or higher (check with `node --version`)
- **Expo CLI**: Install globally with `npm install -g expo-cli` or use `npx expo`
- **Git**: For version control
- **Replit Account**: Required for integrated services (PostgreSQL, AI, secrets management)

## Environment Variables

### Required Variables

These variables must be configured for the app to function properly.

#### Database
- **DATABASE_URL**: PostgreSQL connection string
  - Auto-configured on Replit with built-in PostgreSQL
  - Format: `postgresql://user:password@host:port/database`

#### Supabase Authentication
- **EXPO_PUBLIC_SUPABASE_URL**: Supabase project URL
  - Value: `https://lluuaxhmyuuvqldgzwau.supabase.co`
  - Used by frontend for authentication
- **EXPO_PUBLIC_SUPABASE_ANON_KEY**: Supabase anonymous public key
  - Stored as secret for security
  - Used by frontend for unauthenticated requests
- **SUPABASE_ANON_KEY**: Supabase key for server-side use
  - Stored as secret
  - Used by backend services

#### Session Management
- **SESSION_SECRET**: Express session encryption secret
  - Stored as secret
  - Generate a random string for security

### Auto-Configured Variables

These are automatically provided by Replit integrations and do not require manual setup.

#### Replit AI Integrations (Google Gemini)
- **AI_INTEGRATIONS_GEMINI_API_KEY**: Google Gemini API key
- **AI_INTEGRATIONS_GEMINI_BASE_URL**: Gemini API base URL

#### Replit PostgreSQL
- **PGHOST**: Database host
- **PGPORT**: Database port
- **PGUSER**: Database username
- **PGPASSWORD**: Database password
- **PGDATABASE**: Database name

### User-Provided Credentials

These are stored locally on the device using Expo's SecureStore (encrypted storage), not as environment variables.

#### WooCommerce Integration
- **Store URL**: Your WooCommerce store domain
- **Consumer Key**: WooCommerce API key
- **Consumer Secret**: WooCommerce API secret

#### eBay Integration
- **Client ID**: eBay API client ID
- **Client Secret**: eBay API secret
- **Refresh Token**: eBay OAuth refresh token
- **Environment**: Sandbox or Production mode

## Running the Project

### Start Development Servers

The project consists of a backend API and a frontend Expo app. Both must be running simultaneously for development.

#### Backend (Express Server)
```bash
npm run server:dev
```
- Runs on port 5000
- Handles API requests, database operations, and AI integrations
- Hot-reloads on file changes with tsx

#### Frontend (Expo App)
```bash
npm run expo:dev
```
- Dev server runs on port 8081
- Provides QR code for mobile testing
- Hot Module Reloading enabled for fast iteration

### Database Setup

Run database migrations to set up tables and schema:
```bash
npm run db:push
```
- Uses Drizzle ORM
- Applies migrations from `migrations/` directory
- Safe to run multiple times (idempotent)

### Complete Startup

For a fresh development session:
```bash
# Terminal 1: Start the backend
npm run server:dev

# Terminal 2: Start the frontend
npm run expo:dev

# In a third terminal (if needed): Push any pending migrations
npm run db:push
```

## Project Structure

### `/client` - React Native Expo Frontend
- **components/**: Reusable UI components (Button, Card, ThemedText, etc.)
- **screens/**: App screens (HomeScreen, ScanScreen, StashScreen, etc.)
- **navigation/**: React Navigation configuration and navigators
- **hooks/**: Custom React hooks (useAuth, useTheme, etc.)
- **contexts/**: React Context providers (AuthContext)
- **lib/**: Utility libraries (query-client, supabase, marketplace)
- **constants/**: Theme, colors, and configuration
- **App.tsx**: Root application component

### `/server` - Express.js Backend
- **index.ts**: Express server entry point
- **routes.ts**: API route definitions
- **db.ts**: Database connection and schema
- **storage.ts**: Data persistence utilities
- **replit_integrations/**: Replit-specific integrations
  - **chat/**: AI chat functionality
  - **image/**: AI image analysis and generation
  - **batch/**: Batch processing utilities

### `/shared` - Shared Code
- **schema.ts**: Database schema definitions (Drizzle)
- **models/**: TypeScript type definitions used by both frontend and backend

### `/migrations` - Database Migrations
- Drizzle ORM migrations for schema changes
- Run with `npm run db:push`

### `/scripts` - Build and Deployment Scripts
- **build.js**: Static bundle builder for production

## Testing on Mobile

### Using Expo Go (Fastest)

1. Start the frontend with `npm run expo:dev`
2. A QR code will appear in the terminal
3. On your mobile device:
   - **iOS**: Open Camera app and scan the QR code, tap notification
   - **Android**: Open Expo Go app and scan the QR code
4. The app opens in Expo Go on your device with hot reloading

### Using Physical Device (Replit)

1. Open the Replit workspace on your device's browser
2. Click the "Open in Expo Go" button from the URL bar menu
3. Your physical device will receive the manifest and launch the app

### Web Testing

The app can be tested on web (using `w` in the Expo dev server):
- Note: Some features differ from iOS/Android versions
- Native device capabilities (camera, location, etc.) have web fallbacks
- Best tested on mobile-sized browser windows

## Troubleshooting

### Ports Already in Use
- Backend (5000): `lsof -ti:5000 | xargs kill -9`
- Frontend (8081): `lsof -ti:8081 | xargs kill -9`

### Database Connection Issues
- Verify DATABASE_URL environment variable is set
- Check PostgreSQL is running on Replit: `psql $DATABASE_URL -c "SELECT 1"`

### Hot Reload Not Working
- Restart the Expo dev server: Stop and run `npm run expo:dev` again
- Clear cache: `npx expo start --clear`

### Supabase Authentication Fails
- Verify EXPO_PUBLIC_SUPABASE_URL and keys are correctly set
- Check Supabase project is active and API keys are valid
- On Replit, secrets must be set in the Secrets panel

### AI Features Not Working
- Verify AI_INTEGRATIONS_GEMINI_API_KEY is configured via Replit AI Integrations
- Test API connectivity: Check server logs for error messages
- Ensure your Gemini API quota has not been exceeded

## Development Commands

```bash
# Linting and formatting
npm run lint                 # Check code style
npm run lint:fix           # Fix style issues automatically
npm run format             # Format code with Prettier

# Type checking
npm run check:types        # Run TypeScript type checker

# Building for production
npm run expo:static:build  # Build static Expo bundle
npm run server:build       # Build Express server for production
```

## Additional Resources

- **React Navigation**: https://reactnavigation.org/
- **Expo Documentation**: https://docs.expo.dev/
- **Drizzle ORM**: https://orm.drizzle.team/
- **Express.js**: https://expressjs.com/
- **Supabase Auth**: https://supabase.com/docs/guides/auth
