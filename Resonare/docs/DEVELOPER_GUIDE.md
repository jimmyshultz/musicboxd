# Developer Guide

Welcome to the Resonare development guide! This document will help you get started with development, understand the architecture, and contribute to the project.

**Status**: ✅ **In Production** - App is live on Apple App Store

---

## Quick Start

### Prerequisites
- Node.js >= 18
- npm or yarn
- **iOS Development**: macOS with Xcode and CocoaPods
- **Android Development**: Android Studio and Android SDK
- Git

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/jimmyshultz/musicboxd.git
   cd musicboxd/Resonare
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **iOS Setup** (if developing for iOS)
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Configure environment**
   ```bash
   cp .env.development.example .env.development
   # Edit .env.development with your credentials
   ```

5. **Run the app**
   ```bash
   # iOS
   ENVFILE=.env.development npm run ios
   
   # Android
   ENVFILE=.env.development npm run android
   ```

For detailed setup instructions, see the main [`README.md`](../README.md).

---

## Project Structure

```
Resonare/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── BannerAd.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── HalfStarRating.tsx
│   │   └── ...
│   ├── screens/             # Screen components
│   │   ├── Album/           # Album-related screens
│   │   ├── Artist/          # Artist-related screens
│   │   ├── Auth/            # Authentication screens
│   │   ├── Home/            # Home page screens
│   │   ├── Profile/         # Profile and user screens
│   │   └── Search/          # Search screen
│   ├── navigation/          # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── services/            # API services and business logic
│   │   ├── albumService.ts
│   │   ├── artistService.ts
│   │   ├── authService.ts
│   │   ├── spotifyService.ts
│   │   └── ...
│   ├── store/              # Redux store and slices
│   │   ├── index.ts
│   │   └── slices/
│   │       ├── albumSlice.ts
│   │       ├── authSlice.ts
│   │       └── ...
│   ├── types/               # TypeScript type definitions
│   │   ├── database.ts
│   │   ├── index.ts
│   │   └── spotify.ts
│   ├── utils/               # Utility functions
│   │   ├── theme.ts
│   │   └── ...
│   ├── config/              # Configuration
│   │   ├── environment.ts
│   │   └── spotify.ts
│   └── providers/           # React context providers
│       └── AuthProvider.tsx
├── database/
│   └── migrations/          # Database migration scripts
├── docs/                    # Documentation
│   ├── features/            # Feature documentation
│   ├── decisions/           # Technical decisions
│   └── archive/             # Historical documentation
├── supabase/
│   └── functions/           # Supabase Edge Functions
├── ios/                     # iOS native code
├── android/                 # Android native code
└── App.tsx                  # App entry point
```

---

## Architecture Overview

### Technology Stack

**Frontend**
- React Native 0.80.1
- TypeScript
- Redux Toolkit (state management)
- React Navigation 7 (navigation)
- React Native Paper (UI components)

**Backend**
- Supabase (PostgreSQL, Auth, Storage)
- Spotify Web API
- Firebase Crashlytics
- Google AdMob

### State Management

The app uses **Redux Toolkit** for centralized state management:

- `authSlice` - User authentication and profile data
- `albumSlice` - Album data and user interactions
- `artistSlice` - Artist data and discographies
- `searchSlice` - Search functionality
- `userSlice` - Social features and user data
- `diarySlice` - Diary entries
- `userAlbumsSlice` - User album tracking

### Navigation Structure

```
AppNavigator
├── Auth Stack (if not authenticated)
│   ├── AuthScreen
│   └── ProfileSetupScreen
├── TermsAcceptanceScreen (if terms not accepted)
└── Main Tab Navigator (if authenticated)
    ├── Home Stack
    │   ├── HomeScreen
    │   ├── PopularThisWeekScreen
    │   ├── NewFromFriendsScreen
    │   ├── PopularWithFriendsScreen
    │   ├── AlbumDetailsScreen
    │   ├── ArtistDetailsScreen
    │   └── UserProfileScreen
    ├── Search Stack
    │   ├── SearchScreen
    │   └── (same detail screens as Home)
    └── Profile Stack
        ├── ProfileScreen
        ├── SettingsScreen
        ├── EditProfileScreen
        ├── FollowRequestsScreen
        ├── BlockedUsersScreen
        └── (same detail screens as Home)
```

### Service Layer

Services handle API calls and business logic:

- **Album Services**: `albumService.ts`, `albumRatingsService.ts`, `albumListensService.ts`
- **Artist Services**: `artistService.ts`
- **User Services**: `userService.ts`, `userStatsService.ts`, `userStatsServiceV2.ts`
- **Social Services**: `blockService.ts`, `reportService.ts`
- **Content Services**: `contentModerationService.ts`, `diaryService.ts`, `diaryEntriesService.ts`
- **External APIs**: `spotifyService.ts`, `adMobService.ts`, `crashAnalytics.ts`
- **Storage**: `storageService.ts`, `supabase.ts`

---

## Key Files and Their Purposes

### Entry Point
- **`App.tsx`** - Main app component, initializes services (AdMob, Crashlytics), sets up providers

### Configuration
- **`src/config/environment.ts`** - Environment management (dev/staging/production)
- **`src/config/spotify.ts`** - Spotify API configuration

### Navigation
- **`src/navigation/AppNavigator.tsx`** - Main navigation configuration, handles auth state

### State Management
- **`src/store/index.ts`** - Redux store configuration
- **`src/store/slices/*.ts`** - Redux slices for different domains

### Services
- **`src/services/supabase.ts`** - Supabase client initialization
- **`src/services/spotifyService.ts`** - Spotify API integration
- **`src/services/authService.ts`** - Authentication logic
- **`src/services/crashAnalytics.ts`** - Crash reporting
- **`src/services/adMobService.ts`** - AdMob monetization

### Components
- **`src/components/ErrorBoundary.tsx`** - Global error boundary
- **`src/components/BannerAd.tsx`** - Banner ad component
- **`src/components/HalfStarRating.tsx`** - Rating component

---

## Development Workflow

### Environment Management

The app supports three environments:
- **Development** - Local development with full logging
- **Staging** - Pre-production testing
- **Production** - Live App Store version

Switch environments using:
```bash
ENVFILE=.env.development npm run ios
ENVFILE=.env.staging npm run ios
ENVFILE=.env.production npm run ios
```

### Running the App

```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run with specific environment
ENVFILE=.env.development npm run ios
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch
```

### Linting

```bash
# Check for linting errors
npm run lint
```

---

## Database

### Schema

The app uses Supabase (PostgreSQL) with the following key tables:

- `user_profiles` - User accounts
- `albums` - Album metadata
- `artists` - Artist information
- `album_listens` - Listening history
- `album_ratings` - Ratings and reviews
- `diary_entries` - Diary entries
- `user_follows` - Following relationships
- `follow_requests` - Follow requests for private profiles
- `content_reports` - User reports
- `blocked_users` - Blocked users

See [`../database/README.md`](../database/README.md) for complete database documentation.

### Migrations

Database migrations are in `database/migrations/`. Apply migrations via Supabase Dashboard SQL Editor or Supabase CLI.

---

## Environment Variables

Required environment variables (see `.env.development.example`):

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Spotify
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Environment
ENVIRONMENT=development  # or staging, production
```

---

## Common Development Tasks

### Adding a New Screen

1. Create screen component in `src/screens/`
2. Add route to appropriate navigator in `src/navigation/AppNavigator.tsx`
3. Add navigation types to `src/types/index.ts`
4. Update navigation params if needed

### Adding a New Service

1. Create service file in `src/services/`
2. Import and use Supabase client from `src/services/supabase.ts`
3. Add error handling and logging
4. Export service functions

### Adding a New Redux Slice

1. Create slice file in `src/store/slices/`
2. Define state, reducers, and actions
3. Export slice and add to store in `src/store/index.ts`
4. Use in components via `useSelector` and `useDispatch`

### Adding Content Moderation

Content moderation is handled by `contentModerationService.ts`. To add validation:

1. Use `contentModerationService.checkContent(text)` for validation
2. Use `contentModerationService.filterProfanity(text)` for filtering
3. Use specific validators: `validateUsername`, `validateBio`, `validateReview`, `validateDiaryNotes`

---

## Code Style

- **TypeScript**: Full type safety, no `any` types
- **Components**: Functional components with hooks
- **Naming**: PascalCase for components, camelCase for functions/variables
- **File Structure**: One component per file, co-locate related files
- **Imports**: Group imports (React, third-party, local)

---

## Debugging

### React Native Debugger
- Enable remote debugging in Metro bundler
- Use React DevTools for component inspection
- Use Redux DevTools for state inspection

### Crash Analytics
- Check Firebase Console for crash reports
- Use `crashAnalytics.recordError()` for manual error logging
- Check environment-specific logging in `src/config/environment.ts`

### Console Logging
- Development: Full console logging enabled
- Staging/Production: Console logging suppressed for users
- Use `Logger` utility from `src/config/environment.ts` for environment-aware logging

---

## Resources

### Documentation
- [`PRODUCTION_FEATURES.md`](./PRODUCTION_FEATURES.md) - Complete feature list
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) - Deployment procedures
- [`../README.md`](../README.md) - Project overview

### Setup Guides
All setup guides are in the [`setup/`](./setup/) directory:
- [`setup/SPOTIFY_SETUP.md`](./setup/SPOTIFY_SETUP.md) - Spotify integration
- [`setup/ADMOB_SETUP.md`](./setup/ADMOB_SETUP.md) - AdMob monetization
- [`setup/CRASH_ANALYTICS_SETUP.md`](./setup/CRASH_ANALYTICS_SETUP.md) - Crash analytics
- [`setup/MODERATION_SETUP.md`](./setup/MODERATION_SETUP.md) - Content moderation

### Feature Documentation
- [`features/INSTAGRAM_PRIVACY_MODEL.md`](./features/INSTAGRAM_PRIVACY_MODEL.md) - Privacy model
- [`features/HOME_PAGE_SOCIAL_FEATURES.md`](./features/HOME_PAGE_SOCIAL_FEATURES.md) - Home page features
- [`features/ARTIST_DETAILS_IMPLEMENTATION.md`](./features/ARTIST_DETAILS_IMPLEMENTATION.md) - Artist details

### Technical Decisions
- [`decisions/DATABASE_SCHEMA_V2_MIGRATION.md`](./decisions/DATABASE_SCHEMA_V2_MIGRATION.md) - Database schema
- [`decisions/ACTIVITY_FEED_REMOVAL_DECISION.md`](./decisions/ACTIVITY_FEED_REMOVAL_DECISION.md) - Architecture decisions

---

## Getting Help

- Check existing documentation in `docs/`
- Review code comments and TypeScript types
- Check Supabase dashboard for database issues
- Review Firebase Console for crash reports

---

**Happy coding!** 🎵
