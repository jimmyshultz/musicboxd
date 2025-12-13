# 🎵 Resonare - Social Music Discovery App

A React Native app for discovering, tracking, and sharing music experiences, inspired by Letterboxd but for albums.

## 📱 Current Status: ✅ **In Production** - Available on Apple App Store

Resonare is now live on the Apple App Store! The app has successfully completed development and beta testing phases.

### **✅ Production Features:**

#### **Core Features**
- **User Authentication** - Google Sign-In and Apple Sign-In via Supabase
- **Music Discovery** - Full Spotify Web API integration with real-time search
- **Album Tracking** - Listen status, 5-star ratings, and diary entries
- **Artist Details** - Comprehensive artist pages with full discographies
- **Social Features** - Follow system, user discovery, and social feeds
- **Instagram Privacy Model** - Private profiles with follow request workflow
- **Home Page Discovery** - Popular This Week, New From Friends, Popular With Friends
- **User Profiles** - Complete profiles with stats, reviews, and listening history
- **Diary System** - Chronological listening history with notes
- **Favorite Albums** - Top 5 favorite albums management

#### **Production Infrastructure**
- **Monetization** - Google AdMob integration (Banner, Interstitial, Rewarded ads)
- **Crash Analytics** - Firebase Crashlytics for production monitoring
- **Content Moderation** - App Store compliant UGC safety system
  - Terms of Service & Community Guidelines acceptance
  - Client-side profanity filtering using `bad-words` library
  - User reporting system for profiles, ratings, and diary entries
  - User blocking functionality
  - 24-hour moderation response commitment
- **Environment Management** - Development, Staging, and Production environments
- **Error Handling** - Comprehensive error boundaries and crash prevention

### **🏗️ Tech Stack:**

#### **Frontend**
- **Framework**: React Native 0.80.1 + TypeScript
- **State Management**: Redux Toolkit + React Redux
- **UI Library**: React Native Paper (Material Design 3)
- **Navigation**: React Navigation 7 (Stack + Bottom Tabs)
- **Icons**: React Native Vector Icons

#### **Backend & Services**
- **Backend**: Supabase (PostgreSQL, Auth, RLS, Storage)
- **Authentication**: Google Sign-In + Apple Sign-In via Supabase
- **Music Data**: Spotify Web API (100 req/sec free tier)
- **Analytics**: Firebase Crashlytics
- **Monetization**: Google AdMob
- **File Storage**: Supabase Storage (profile pictures)

#### **Development Tools**
- **Environment Management**: React Native Config
- **Type Safety**: Full TypeScript integration
- **Testing**: Jest + React Native Testing Library
- **Linting**: ESLint with React Native config

## 🚀 Development Setup

### **Prerequisites:**
- Node.js 16+
- React Native CLI
- iOS: Xcode, CocoaPods
- Android: Android Studio, Java 11

### **Installation:**
```bash
git clone [repository-url]
cd resonare/Resonare
npm install
cd ios && pod install && cd ..
```

### **Environment Configuration:**
1. Copy environment examples: `cp .env.development.example .env.development`
2. Fill in your credentials (Supabase, Spotify)
3. Run development: `ENVFILE=.env.development npm run ios`

### **Staging Environment:**
```bash
ENVFILE=.env.staging npm run ios
```

## 📂 Project Structure

```
Resonare/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/             # App screens
│   ├── navigation/          # Navigation configuration
│   ├── services/            # API services and business logic
│   ├── store/               # Redux store and slices
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   └── config/              # Environment and app configuration
├── database/
│   ├── migrations/          # Database migration scripts
│   │   └── add_ugc_safety_tables.sql  # UGC safety compliance tables
│   └── schema_v2.sql        # Complete database schema
├── docs/                    # Legal documents (GitHub Pages)
│   ├── index.html           # Privacy Policy
│   ├── terms.html           # Terms of Service
│   ├── guidelines.html       # Community Guidelines
│   └── styles.css           # Legal docs styling
└── Resonare/
    └── docs/                 # Technical documentation
        ├── README.md         # Documentation index
        ├── DEPLOYMENT.md     # Deployment guide
        ├── PRODUCTION_FEATURES.md  # Production features
        ├── DEVELOPER_GUIDE.md      # Developer onboarding
        ├── MODERATION_SETUP.md     # Content moderation
        ├── features/         # Feature documentation
        ├── decisions/        # Technical decisions
        └── archive/         # Historical documentation
└── supabase/
    └── functions/           # Supabase Edge Functions
        └── notify-report/   # Email notification for content reports
```

## 📋 Documentation

### **📚 Documentation Index:**
- [`Resonare/docs/README.md`](Resonare/docs/README.md) - Complete documentation index
- [`Resonare/docs/PRODUCTION_FEATURES.md`](Resonare/docs/PRODUCTION_FEATURES.md) - Comprehensive production features list
- [`Resonare/docs/DEVELOPER_GUIDE.md`](Resonare/docs/DEVELOPER_GUIDE.md) - Developer onboarding guide
- [`Resonare/docs/DEPLOYMENT.md`](Resonare/docs/DEPLOYMENT.md) - Deployment and release procedures

### **🎯 Feature Documentation:**
- [`Resonare/docs/features/INSTAGRAM_PRIVACY_MODEL.md`](Resonare/docs/features/INSTAGRAM_PRIVACY_MODEL.md) - Privacy model implementation
- [`Resonare/docs/features/HOME_PAGE_SOCIAL_FEATURES.md`](Resonare/docs/features/HOME_PAGE_SOCIAL_FEATURES.md) - Home page social features
- [`Resonare/docs/features/ARTIST_DETAILS_IMPLEMENTATION.md`](Resonare/docs/features/ARTIST_DETAILS_IMPLEMENTATION.md) - Artist details feature
- [`Resonare/docs/features/DIARY_ENTRY_REVIEW.md`](Resonare/docs/features/DIARY_ENTRY_REVIEW.md) - Diary and review system
- [`Resonare/docs/MODERATION_SETUP.md`](Resonare/docs/MODERATION_SETUP.md) - Content moderation setup guide

### **📋 Technical Decisions:**
- [`Resonare/docs/decisions/DATABASE_SCHEMA_V2_MIGRATION.md`](Resonare/docs/decisions/DATABASE_SCHEMA_V2_MIGRATION.md) - Database schema migration
- [`Resonare/docs/decisions/ACTIVITY_FEED_REMOVAL_DECISION.md`](Resonare/docs/decisions/ACTIVITY_FEED_REMOVAL_DECISION.md) - Activity feed architecture decision

### **⚙️ Setup Guides:**
- [`Resonare/docs/setup/SPOTIFY_SETUP.md`](Resonare/docs/setup/SPOTIFY_SETUP.md) - Spotify API integration
- [`Resonare/docs/setup/ADMOB_SETUP.md`](Resonare/docs/setup/ADMOB_SETUP.md) - AdMob monetization setup
- [`Resonare/docs/setup/CRASH_ANALYTICS_SETUP.md`](Resonare/docs/setup/CRASH_ANALYTICS_SETUP.md) - Firebase Crashlytics setup
- [`Resonare/docs/setup/MODERATION_SETUP.md`](Resonare/docs/setup/MODERATION_SETUP.md) - Content moderation setup

### **🗺️ Roadmap:**
- [`PRODUCTION_ROADMAP.md`](PRODUCTION_ROADMAP.md) - Post-launch roadmap and future features

## 📱 App Store

Resonare is available on the Apple App Store. For download links and app information, see the App Store listing.

## 🎯 Post-Launch Roadmap

For future features and improvements, see [`PRODUCTION_ROADMAP.md`](PRODUCTION_ROADMAP.md) for the post-launch roadmap:
- Enhanced discovery algorithms
- Advanced social features
- Performance optimizations
- Android version development

## 🔧 Development Notes

### **Environment Management:**
- Environment files are in `.gitignore` for security
- Use `.example` files as templates
- `react-native-config` handles environment switching

### **Database:**
- `schema_v2.sql` contains the complete, current schema
- RLS policies implement Instagram privacy model
- Use staging environment for testing schema changes

### **Privacy Model:**
- Public profiles: Fully visible content
- Private profiles: Discoverable but content protected until following
- Follow requests: Complete workflow for private profile access

### **User-Generated Content Safety (App Store Compliance):**
- **Terms of Service & Community Guidelines**: Users must accept before using the app
  - Terms: https://jimmyshultz.github.io/musicboxd/terms.html
  - Guidelines: https://jimmyshultz.github.io/musicboxd/guidelines.html
- **Content Moderation**: Client-side profanity filtering using `bad-words` library
- **Reporting System**: Users can report profiles, ratings, and diary entries
- **User Blocking**: Users can block abusive users (mutual blocking prevents interaction)
- **Moderation Workflow**: Admin receives email notifications for reports within 24 hours
- **Database Tables**: `content_reports`, `blocked_users`, `user_profiles.terms_accepted_at`

### **Legal Documents:**
- Privacy Policy: https://jimmyshultz.github.io/musicboxd/
- Terms of Service: https://jimmyshultz.github.io/musicboxd/terms.html
- Community Guidelines: https://jimmyshultz.github.io/musicboxd/guidelines.html

---

**Built with ❤️ for music discovery and social connection.** 🎵