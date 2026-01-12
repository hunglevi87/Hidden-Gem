# HiddenGem Design Guidelines
**By The Relic Shop**

## Brand Identity

**Purpose**: HiddenGem is a professional inventory management tool for resellers, empowering them to scan collectibles, leverage AI for instant appraisals, and generate SEO-optimized listings for WooCommerce and eBay.

**Aesthetic Direction**: **Luxurious/Refined** — Premium materials, sophisticated elegance, and restrained details. The app feels like a curator's tool, not a consumer shopping app. Think art gallery meets professional tool: dark backgrounds, gold accents, generous whitespace, and typographic hierarchy that commands respect.

**Memorable Element**: The two-photo scanning ritual (full item + label close-up) creates a deliberate, professional workflow that makes users feel like expert appraisers.

## Navigation Architecture

**Root Navigation**: Tab Bar (4 tabs)
- **Discover** (Must-Reads icon) - Curated articles and authentication guides
- **Scan** (Camera icon, gold accent) - Core action for item scanning
- **Stash** (Grid icon) - User's inventory management
- **Settings** (Gear icon) - API keys, account, preferences

**Authentication Required**: Yes
- Supabase Auth with email/password and social sign-in
- API key management requires authenticated account for secure storage

## Screen-by-Screen Specifications

### 1. Onboarding/Welcome (Stack-only, pre-auth)
**Purpose**: Introduce the app's value and professional capabilities
- **Header**: None
- **Layout**: Full-screen with centered content
  - Hero illustration showing scanning workflow
  - Headline (Cormorant Garamond, 36px): "Discover. Scan. Sell."
  - Subtext (Jost, 16px): Professional inventory management
  - CTA button: "Get Started" (gold background, dark text)
- **Insets**: Top: insets.top + 60, Bottom: insets.bottom + 24

### 2. Sign In / Sign Up (Stack, pre-auth)
**Purpose**: Authenticate users for secure inventory storage
- **Header**: Transparent, back button (left)
- **Layout**: Scrollable form
  - Logo (sparkle icon in gold) centered at top
  - Email/password fields with dark borders
  - "Sign in with Google" and "Sign in with Apple" buttons
  - Privacy policy and terms links (Jost, 12px, gold)
- **Insets**: Top: headerHeight + 24, Bottom: insets.bottom + 24

### 3. Discover Tab (Must-Reads)
**Purpose**: Display curated articles for reseller education
- **Header**: Transparent, title: "Must-Reads" (Cormorant Garamond, 28px)
- **Layout**: Scrollable list
  - Featured article card at top (large image, gradient overlay, title in Cormorant Garamond)
  - Article list items: thumbnail (left), title + category badge (Jost), reading time
  - Categories: Authentication, Market Trends, Tips & Tricks
- **Insets**: Top: headerHeight + 16, Bottom: tabBarHeight + 24
- **Empty State**: "No articles yet" with book illustration

### 4. Scan Tab (Camera)
**Purpose**: Two-photo capture workflow for item scanning
- **Header**: None (full-screen camera view)
- **Layout**: Camera view with overlay
  - Step indicator: "1 of 2: Full Item Photo" (Jost, white text, semi-transparent dark background)
  - Capture button: Large circle (gold ring, white fill)
  - Cancel button (top-left): X icon in white
  - After first photo: "2 of 2: Label Close-Up"
  - After second photo: Navigate to AI Analysis screen
- **Insets**: Custom overlay positioning, respect camera safe areas

### 5. AI Analysis Screen (Modal stack)
**Purpose**: Show AI processing and results
- **Header**: Standard, title: "Analyzing..." (changes to "Results")
- **Layout**: Scrollable
  - Loading animation (gold sparkle) while processing
  - Results view:
    - Item photos (2 thumbnails side-by-side)
    - Identified item name (Cormorant Garamond, 24px)
    - Estimated value (gold, Jost Bold, 20px)
    - AI-generated listing preview (expandable)
  - Action buttons: "Save to Stash" (primary, gold), "Rescan" (secondary, outlined)
- **Insets**: Top: 16, Bottom: insets.bottom + 24

### 6. Stash Tab (Inventory)
**Purpose**: Manage scanned items and listings
- **Header**: Transparent, title: "Stash", search icon (right)
- **Layout**: Grid (2 columns)
  - Item cards: Photo, title (Jost, 14px), value (gold, 12px)
  - Tap to view/edit details
  - Empty state: "Your stash is empty" with treasure chest illustration
- **Floating Button**: "Scan Item" (bottom-right, gold circle with camera icon)
  - shadowOffset: {width: 0, height: 2}
  - shadowOpacity: 0.10
  - shadowRadius: 2
- **Insets**: Top: headerHeight + 16, Bottom: tabBarHeight + 80 (accounts for floating button)

### 7. Item Details Screen (Stack)
**Purpose**: View/edit listing and publish to platforms
- **Header**: Standard, title: Item name, edit icon (right)
- **Layout**: Scrollable form
  - Photo carousel (2 photos)
  - Fields: Title, Description, Price, Category, Tags
  - AI-generated content indicator (gold badge)
  - Publish section: WooCommerce toggle, eBay toggle (disabled if not configured)
  - Delete button (red, at bottom)
- **Insets**: Top: 16, Bottom: insets.bottom + 24

### 8. Settings Tab
**Purpose**: API key management, account settings, preferences
- **Header**: Transparent, title: "Settings"
- **Layout**: Scrollable list (grouped sections)
  - **AI Configuration**:
    - Google Gemini API Key (masked input, eye icon to reveal)
    - Model selection dropdown
    - HuggingFace API Key (masked)
    - Test Connection button
  - **Integrations**: WooCommerce, eBay (setup buttons)
  - **Account**: Email, subscription status, log out, delete account (nested)
  - **App Preferences**: Theme (dark/light), notifications
- **Insets**: Top: headerHeight + 16, Bottom: tabBarHeight + 24

## Color Palette

**Primary**: #D4AF37 (Gold) - Call-to-action buttons, accents, value indicators
**Background**: #111827 (Dark charcoal) - Main background for dark theme
**Surface**: #1F2937 (Lighter charcoal) - Cards, input fields
**Text Primary**: #F9FAFB (Off-white) - Headings, body text
**Text Secondary**: #9CA3AF (Light gray) - Subtitles, metadata
**Border**: #374151 (Medium gray) - Dividers, outlines
**Success**: #10B981 (Green) - Published status
**Error**: #EF4444 (Red) - Warnings, delete actions

## Typography

**Heading Font**: Cormorant Garamond (serif, elegant)
- H1: 36px, Bold
- H2: 28px, Bold
- H3: 24px, SemiBold

**Body Font**: Jost (sans-serif, modern)
- Large: 20px, Regular
- Body: 16px, Regular
- Small: 14px, Regular
- Caption: 12px, Regular
- Button: 16px, SemiBold

## Visual Design

- **Icons**: Feather icons from @expo/vector-icons in gold (#D4AF37) for active state, light gray (#9CA3AF) for inactive
- **Touchable Feedback**: Reduce opacity to 0.7 on press for all buttons and cards
- **Floating Button Shadow** (Scan in Stash):
  - shadowOffset: {width: 0, height: 2}
  - shadowOpacity: 0.10
  - shadowRadius: 2
  - elevation: 3 (Android)
- **Cards**: Dark surface (#1F2937), 12px border radius, no heavy shadows
- **Input Fields**: Dark background, 8px border radius, 1px border (#374151), focus state: gold border

## Assets to Generate

**App Icon** (icon.png) - Gold sparkle on dark background
**Splash Icon** (splash-icon.png) - Simple gold sparkle, used during launch

**Empty States**:
- empty-stash.png - Minimal treasure chest illustration (gold accent) - USED: Stash tab when no items
- empty-articles.png - Simple book/scroll illustration - USED: Discover tab when no articles

**Onboarding**:
- onboarding-scan.png - Two-panel illustration showing phone camera capturing item and label - USED: Welcome screen
- success-scan.png - Checkmark with subtle gold glow - USED: AI Analysis success state

**Profile Avatar**:
- default-avatar.png - Simple gold circle with "RS" initials (The Relic Shop) - USED: Settings/account screen

All illustrations should use the gold (#D4AF37) as the primary accent on dark backgrounds, with clean minimal lines and generous negative space.