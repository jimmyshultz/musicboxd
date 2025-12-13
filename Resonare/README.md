# Resonare

> Track, Rate, Discover - Your personal music album journal

Resonare is a mobile application inspired by Letterboxd, designed for music enthusiasts to track, rate, and discover albums while connecting with friends. Built with React Native and TypeScript.

**Status**: ✅ **In Production** - Available on Apple App Store

## 🎵 Features

### Core Features (Implemented)
- ✅ **Album Discovery**: Browse popular albums with beautiful cover art
- ✅ **Artist Details**: Dedicated artist pages with full discographies and album grids
- ✅ **Real-time Search**: Search albums, artists, and users with instant results
- ✅ **Album Details**: Comprehensive album view with track listings, metadata, and clickable artist names
- ✅ **Interactive Rating System**: 5-star rating system for albums with written reviews
- ✅ **Professional UI**: Material Design 3 with consistent theming and navigation
- ✅ **Dark/Light Mode**: Automatic theme switching based on system preferences
- ✅ **TypeScript Integration**: Full type safety throughout the application
- ✅ **Redux State Management**: Centralized state management with Redux Toolkit
- ✅ **Spotify Integration**: Real music data from Spotify Web API with fallback to mock data
- ✅ **User Authentication**: Google Sign-In and Apple Sign-In via Supabase
- ✅ **Social Features**: Follow system, user discovery, followers/following lists
- ✅ **Privacy Model**: Instagram-style private profiles with follow requests
- ✅ **User Profiles**: Complete profiles with stats, reviews, and listening history
- ✅ **Diary System**: Chronological listening history with notes
- ✅ **Favorite Albums**: Top 5 favorite albums management
- ✅ **Content Moderation**: Profanity filtering, user reporting, and blocking
- ✅ **Monetization**: Google AdMob integration (Banner, Interstitial, Rewarded ads)
- ✅ **Crash Analytics**: Firebase Crashlytics for production monitoring

### Future Enhancements
- 📊 Advanced Listening Statistics and Insights
- 📋 Custom Lists and Collections
- 🔍 Advanced Search Filters
- 🎧 Enhanced Streaming Integration
- 📱 Push Notifications
- 🤖 Personalized Recommendations

## 🛠 Tech Stack

### Frontend
- **React Native 0.80.1** - Cross-platform mobile development
- **TypeScript** - Type safety and enhanced developer experience
- **React Navigation 7** - Navigation and routing
- **React Native Paper** - Material Design 3 components
- **Redux Toolkit** - State management
- **React Redux** - React bindings for Redux

### Key Dependencies
- `@react-navigation/native` - Navigation core
- `@react-navigation/stack` - Stack navigation
- `@react-navigation/bottom-tabs` - Bottom tab navigation
- `react-native-paper` - Material Design 3 UI components
- `@reduxjs/toolkit` - Redux state management
- `react-redux` - React Redux bindings
- `@supabase/supabase-js` - Backend and authentication
- `@react-native-google-signin/google-signin` - Google Sign-In
- `@invertase/react-native-apple-authentication` - Apple Sign-In
- `react-native-google-mobile-ads` - AdMob monetization
- `@react-native-firebase/app` - Firebase services
- `@react-native-firebase/crashlytics` - Crash analytics
- `bad-words` - Content moderation
- `lodash` - Utility functions

## 📱 Current App Flow

1. **Home Screen**: Browse popular albums with cover art and metadata
2. **Search**: Real-time search for albums, artists, and users with tabbed interface
3. **Album Details**: Tap any album → View comprehensive details with track listings
4. **Artist Details**: Tap artist names → View artist profile with full discography
5. **Profile**: User profile with statistics and menu options
6. **Rating System**: Interactive 5-star rating for albums
7. **Theme Support**: Automatic dark/light mode switching

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm or yarn
- React Native development environment set up
- iOS Simulator (for iOS) or Android Emulator (for Android)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jimmyshultz/resonare.git
   cd resonare/Resonare
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **iOS Setup** (if developing for iOS):
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Start the Metro bundler**:
   ```bash
   npm start
   ```

5. **Run the app**:
   ```bash
   # For iOS
   npm run ios
   
   # For Android
   npm run android
   ```

### 🎵 Spotify Integration Setup (Optional)

By default, the app works with sample album data. To enable real Spotify data:

1. **Create a Spotify App**:
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app with any name and description
   - Copy your Client ID and Client Secret

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env and add your Spotify credentials:
   # SPOTIFY_CLIENT_ID=your_client_id_here
   # SPOTIFY_CLIENT_SECRET=your_client_secret_here
   ```

3. **Restart the development server** to load the new environment variables

📖 **For detailed setup instructions, see [docs/setup/SPOTIFY_SETUP.md](docs/setup/SPOTIFY_SETUP.md)**

> **Note**: Without Spotify credentials, the app automatically falls back to sample data and works perfectly for development and testing.

## 📱 Screenshots & Demo

### Key Screens
- **Home**: Popular albums grid with professional card design
- **Search**: Real-time search with trending albums and genre chips
- **Album Details**: Full-screen album view with comprehensive track listings
- **Profile**: User statistics and menu options

### Technical Highlights
- **Type-Safe Navigation**: Fully typed navigation params and routes
- **Redux Integration**: Centralized state management for albums, search, and user data
- **Responsive Design**: Adaptive layouts that work on various screen sizes
- **Professional UI**: Material Design 3 with consistent spacing and typography
- **Performance**: Optimized with proper loading states and efficient rendering

## 🏗 Project Structure

```
src/
├── components/          # Reusable UI components
├── navigation/          # Navigation configuration
├── screens/            # Screen components
│   ├── Home/           # Home screen
│   ├── Search/         # Search functionality (albums, artists, users)
│   ├── Album/          # Album details
│   ├── Artist/         # Artist details and discography
│   ├── Profile/        # User profile
│   └── Auth/           # Authentication
├── store/              # Redux store configuration
│   └── slices/         # Redux slices (albums, artists, search, user, auth)
├── services/           # API services (Spotify, Supabase)
├── types/              # TypeScript type definitions
└── utils/              # Utility functions and theme
```

## 🎨 Design System

### Colors
- **Primary**: Deep Purple (#6200EE)
- **Secondary**: Teal (#03DAC6)
- **Background**: Light/Dark adaptive
- **Surface**: Card backgrounds with proper elevation

### Typography
- Material Design 3 typography scale
- Consistent font weights and sizes
- Proper line heights and spacing

### Spacing
- Consistent spacing system (4dp base unit)
- Responsive margins and padding
- Professional card layouts

## 🗄️ Database (Supabase)

The app uses Supabase for backend services:
- **PostgreSQL Database**: Full relational database with Row Level Security (RLS)
- **Authentication**: Supabase Auth with Google and Apple OAuth
- **Storage**: Supabase Storage for profile pictures
- **Real-time**: Supabase real-time subscriptions for live updates

### Key Database Tables
- `user_profiles` - User accounts and social data
- `albums` - Album metadata with `artist_id` foreign key
- `artists` - Artist profiles, genres, and follower counts
- `album_listens` - User listening history
- `album_ratings` - User ratings and reviews
- `diary_entries` - User diary entries for albums
- `user_follows` - Following relationships
- `follow_requests` - Private profile follow requests
- `content_reports` - User-generated content reports
- `blocked_users` - User blocking relationships

See [`database/README.md`](../database/README.md) for complete database documentation.

## 🔧 Development

### State Management
The app uses Redux Toolkit with the following slices:
- `authSlice`: User authentication and profile data
- `albumSlice`: Album data and user interactions (ratings, listens)
- `artistSlice`: Artist data and discographies
- `searchSlice`: Search functionality for albums, artists, and users
- `userSlice`: Social features and activity feeds

### Services
- `albumService`: Handles album data fetching and caching
- `artistService`: Manages artist data, discographies, and Spotify integration
- `spotifyService`: Direct Spotify Web API integration
- `authService`: Authentication with Google and Apple Sign-In
- `userService`: User profiles and social features
- `diaryService`: Diary entries and listening history
- `albumRatingsService`: Ratings and reviews
- `contentModerationService`: Profanity filtering and content validation
- `reportService`: User reporting system
- `blockService`: User blocking functionality
- `adMobService`: AdMob monetization
- `crashAnalytics`: Firebase Crashlytics integration
- Supabase integration for data persistence and caching

### Type Safety
Full TypeScript integration with:
- Strongly typed Redux state and actions
- Navigation parameter types
- Component prop interfaces
- API response types

### Environment Configuration

The app supports three environments:
- **Development**: Local development with full logging
- **Staging**: Pre-production testing environment
- **Production**: Live App Store version

Environment configuration is managed via `react-native-config`:
- `.env.development.example` - Development environment template
- `.env.staging.example` - Staging environment template
- `.env.production.example` - Production environment template

See [`src/config/environment.ts`](src/config/environment.ts) for environment management.

## 📚 Documentation

For comprehensive documentation, see:
- [`docs/README.md`](docs/README.md) - Documentation index
- [`docs/PRODUCTION_FEATURES.md`](docs/PRODUCTION_FEATURES.md) - Complete production features
- [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md) - Developer onboarding
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) - Deployment procedures

### Setup Guides
- [`docs/setup/SPOTIFY_SETUP.md`](docs/setup/SPOTIFY_SETUP.md) - Spotify API integration
- [`docs/setup/ADMOB_SETUP.md`](docs/setup/ADMOB_SETUP.md) - AdMob monetization
- [`docs/setup/CRASH_ANALYTICS_SETUP.md`](docs/setup/CRASH_ANALYTICS_SETUP.md) - Firebase Crashlytics
- [`docs/setup/MODERATION_SETUP.md`](docs/setup/MODERATION_SETUP.md) - Content moderation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Letterboxd](https://letterboxd.com/)
- Album data and images from Spotify Web API
- Built with React Native and Material Design 3

---

**Status**: ✅ **In Production** - Available on Apple App Store

## Quick Start

### Prerequisites
- Node.js >= 18
- npm or yarn
- **For iOS development**: Xcode and CocoaPods
- **For Android development**: Android Studio and Android SDK

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **iOS Setup (Required for iOS development):**
   ```bash
   # Install CocoaPods if not already installed
   sudo gem install cocoapods
   
   # Install iOS dependencies
   npm run ios:setup
   # OR manually:
   cd ios && pod install && cd ..
   ```

3. **Run the application:**
   ```bash
   # iOS (requires macOS with Xcode)
   npm run ios
   
   # Android
   npm run android
   
   # Start Metro bundler only
   npm start
   ```

### Troubleshooting iOS Build Issues

If you encounter iOS build errors related to missing Pods files:

1. **Clean and reinstall CocoaPods dependencies:**
   ```bash
   cd ios
   rm -rf Pods
   rm Podfile.lock
   pod install
   cd ..
   ```

2. **If CocoaPods is not installed:**
   ```bash
   sudo gem install cocoapods
   ```

3. **For M1/M2 Macs, you may need:**
   ```bash
   sudo arch -x86_64 gem install ffi
   arch -x86_64 pod install
   ```

## Architecture
