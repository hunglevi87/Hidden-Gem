# HiddenGem E2E Tests (Maestro)

End-to-end test flows for the HiddenGem mobile app using Maestro.

## Prerequisites

- Maestro CLI installed: `curl -Ls "https://get.maestro.mobile.dev" | bash`
- A development build of the app (Maestro does not work with Expo Go)
- iOS Simulator or Android Emulator running

## Building for Testing

```bash
# Generate native projects
npx expo prebuild

# Build for iOS Simulator
npx expo run:ios

# Build for Android Emulator
npx expo run:android
```

## Running Tests

```bash
# Run a single test flow
maestro test .maestro/auth_flow.yml

# Run all test flows
maestro test .maestro/

# Run tests by tag
maestro test --tags critical .maestro/

# Record test execution as video
maestro record .maestro/auth_flow.yml

# Output JUnit results for CI
maestro test --format junit --output results.xml .maestro/
```

## Test Flows

| File | Description | Tags |
|------|-------------|------|
| auth_flow.yml | Sign in/sign up, form validation | auth, critical |
| settings_flow.yml | Settings navigation, sub-screens | settings |
| scan_flow.yml | Camera tab, capture controls | scan, camera |
| stash_flow.yml | Inventory grid, empty state | stash, inventory |
| discover_flow.yml | Articles tab, content loading | discover, articles |
| woocommerce_settings_flow.yml | WooCommerce credential entry | woocommerce, marketplace |
| ebay_settings_flow.yml | eBay credential entry | ebay, marketplace |

## Test IDs Convention

Interactive elements use `testID` props with the pattern:
- Buttons: `button-{action}` (e.g., `button-sign-out`, `button-capture`)
- Inputs: `input-{field}` (e.g., `input-email`, `input-woo-url`)
- Cards: `card-{type}-{id}` (e.g., `card-item-1`, `card-article-3`)
- Messages: `error-message`, `success-message`

## Notes

- Tests assume the app starts at the Auth screen (unauthenticated state) or the Discover tab (authenticated state).
- Camera tests may require granting camera permissions on first run.
- Marketplace credential tests use dummy values and do not make real API calls.
- For CI/CD integration with EAS, see the Expo E2E testing documentation.
