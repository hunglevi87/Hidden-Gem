## Plan: Hidden-Gem Feature Verification Audit

Create a lightweight evidence-based audit that compares the stated feature status against the actual code paths. Start from the overview in `replit.md`, then verify each claim across frontend, backend, integrations, and config. For every item, capture direct proof (`implemented`, `partial/stubbed`, or `not found`) so completed vs not-yet-implemented decisions are traceable and repeatable.

### Steps
1. Build the audit matrix from [replit.md](replit.md) `Feature Completion Status` and tag each claim by architecture area.
2. Verify frontend claims in [client/App.tsx](client/App.tsx), [client/navigation/RootStackNavigator.tsx](client/navigation/RootStackNavigator.tsx), [client/navigation/MainTabNavigator.tsx](client/navigation/MainTabNavigator.tsx), and relevant screens (`AuthScreen`, `ScanScreen`, `StashScreen`, `SettingsScreen`, `ItemDetailsScreen`).
3. Verify backend/API support in [server/routes.ts](server/routes.ts), [server/index.ts](server/index.ts), [server/ai-providers.ts](server/ai-providers.ts), and [shared/schema.ts](shared/schema.ts) for matching endpoints, handlers, and persisted fields.
4. Verify integrations in [client/lib/marketplace.ts](client/lib/marketplace.ts), [client/screens/WooCommerceSettingsScreen.tsx](client/screens/WooCommerceSettingsScreen.tsx), [client/screens/EbaySettingsScreen.tsx](client/screens/EbaySettingsScreen.tsx), [client/hooks/useNotifications.ts](client/hooks/useNotifications.ts), and backend notification/marketplace routes.
5. Verify env/config assumptions in [ENVIRONMENT.md](ENVIRONMENT.md), [app.json](app.json), [package.json](package.json), [client/lib/supabase.ts](client/lib/supabase.ts), [server/db.ts](server/db.ts), and [drizzle.config.ts](drizzle.config.ts); then classify each claim with expected evidence rules.

### Further Considerations
1. Confirm source-of-truth scope: audit only [replit.md](replit.md) status, or also compare against [design_guidelines.md](design_guidelines.md) planned UX?
2. Define “implemented” threshold: Option A UI+API wired, Option B code path exists even if partially wired, Option C runtime-proven only.
3. Treat “stubbed/partial” explicitly (e.g., SEO generation and notifications) to avoid binary false positives.
