# 🎵 Resonare - Social Music Discovery App

A React Native app for discovering, tracking, and sharing music experiences, inspired by Letterboxd but for albums.

## 📱 Current Status: Week 5 Complete

### **✅ Implemented Features:**
- **User Authentication** (Supabase Auth)
- **Music Discovery** (Spotify Web API integration)
- **Album Tracking** (Listen status, ratings, diary entries)
- **Social Features** (Follow system, activity feeds)
- **Instagram Privacy Model** (Private profiles with follow requests)
- **Home Page Discovery** (Popular This Week, New From Friends, Popular With Friends)
- **Staging Environment** (Separate testing environment)
- **User-Generated Content Safety** (App Store compliant)
  - Terms of Service & Community Guidelines acceptance
  - Content moderation and profanity filtering
  - User reporting system
  - User blocking functionality
  - 24-hour moderation response commitment

### **🏗️ Tech Stack:**
- **Frontend**: React Native, TypeScript, Redux Toolkit
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Music Data**: Spotify Web API
- **Navigation**: React Navigation
- **Environment Management**: React Native Config

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
├── docs/                    # Documentation
│   ├── weekly-summaries/    # Development progress summaries
│   ├── features/            # Feature implementation guides
│   ├── decisions/           # Important technical decisions
│   ├── archive/             # Historical documentation
│   ├── index.html           # Privacy Policy (GitHub Pages)
│   ├── terms.html           # Terms of Service (GitHub Pages)
│   └── guidelines.html     # Community Guidelines (GitHub Pages)
└── supabase/
    └── functions/           # Supabase Edge Functions
        └── notify-report/   # Email notification for content reports
```

## 📋 Documentation

### **📊 Weekly Progress:**
- [`docs/weekly-summaries/WEEK_4_IMPLEMENTATION_SUMMARY.md`](docs/weekly-summaries/WEEK_4_IMPLEMENTATION_SUMMARY.md)
- [`docs/weekly-summaries/WEEK_5_IMPLEMENTATION_SUMMARY.md`](docs/weekly-summaries/WEEK_5_IMPLEMENTATION_SUMMARY.md)

### **🎯 Feature Guides:**
- [`docs/features/INSTAGRAM_PRIVACY_MODEL.md`](docs/features/INSTAGRAM_PRIVACY_MODEL.md)
- [`docs/features/HOME_PAGE_SOCIAL_FEATURES.md`](docs/features/HOME_PAGE_SOCIAL_FEATURES.md)
- [`docs/features/STAGING_ENVIRONMENT_SETUP.md`](docs/features/STAGING_ENVIRONMENT_SETUP.md)
- [`docs/MODERATION_SETUP.md`](docs/MODERATION_SETUP.md) - Content moderation setup guide

### **📋 Important Decisions:**
- [`docs/decisions/DATABASE_SCHEMA_V2_MIGRATION.md`](docs/decisions/DATABASE_SCHEMA_V2_MIGRATION.md)
- [`docs/decisions/ACTIVITY_FEED_REMOVAL_DECISION.md`](docs/decisions/ACTIVITY_FEED_REMOVAL_DECISION.md)

### **🗺️ Roadmap:**
- [`PRODUCTION_ROADMAP.md`](PRODUCTION_ROADMAP.md) - Complete development plan

## 🎯 Next Steps (Week 6)

Refer to `PRODUCTION_ROADMAP.md` for upcoming features:
- Enhanced discovery algorithms
- Advanced social features
- Performance optimizations
- Production deployment preparation

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