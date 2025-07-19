# Musicboxd

> Track, Rate, Discover - Your personal music album journal

Musicboxd is a mobile application inspired by Letterboxd, designed for music enthusiasts to track, rate, and discover albums while connecting with friends. Built with React Native and TypeScript.

## 🎵 Features

### Core Features (Implemented)
- ✅ **Album Discovery**: Browse popular albums with beautiful cover art
- ✅ **Search Functionality**: Real-time search with debounced API calls
- ✅ **Album Details**: Comprehensive album view with track listings, metadata, and ratings
- ✅ **Interactive Rating System**: 5-star rating system for albums
- ✅ **Professional UI**: Material Design 3 with consistent theming and navigation
- ✅ **Dark/Light Mode**: Automatic theme switching based on system preferences
- ✅ **TypeScript Integration**: Full type safety throughout the application
- ✅ **Redux State Management**: Centralized state management with Redux Toolkit
- ✅ **Mock Data**: Rich album data including track listings for popular albums

### Upcoming Features
- 📋 User Authentication (Firebase/JWT)
- 👥 Social Features (Follow users, activity feeds)
- 📊 Listening Statistics and Insights
- 📋 Custom Lists and Collections
- 🔍 Advanced Search Filters
- 🎧 Streaming Service Integration
- 📱 Push Notifications

## 🛠 Tech Stack

### Frontend
- **React Native 0.80.1** - Cross-platform mobile development
- **TypeScript** - Type safety and enhanced developer experience
- **React Navigation 7** - Navigation and routing
- **React Native Paper** - Material Design 3 components
- **Redux Toolkit** - State management
- **React Redux** - React bindings for Redux

### Dependencies
- `@react-navigation/native` - Navigation core
- `@react-navigation/stack` - Stack navigation
- `@react-navigation/bottom-tabs` - Bottom tab navigation
- `react-native-screens` - Native screen components
- `react-native-safe-area-context` - Safe area handling
- `react-native-paper` - Material Design 3 UI components
- `react-native-vector-icons` - Icon library
- `@reduxjs/toolkit` - Redux state management
- `react-redux` - React Redux bindings
- `lodash` - Utility functions (debounce for search)

## 📱 Current App Flow

1. **Home Screen**: Browse popular albums with cover art and metadata
2. **Album Details**: Tap any album → View comprehensive details with track listings
3. **Search**: Real-time album search with trending suggestions and genre filters
4. **Profile**: User profile with statistics and menu options
5. **Rating System**: Interactive 5-star rating for albums
6. **Theme Support**: Automatic dark/light mode switching

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm or yarn
- React Native development environment set up
- iOS Simulator (for iOS) or Android Emulator (for Android)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jimmyshultz/musicboxd.git
   cd musicboxd/Musicboxd
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
│   ├── Search/         # Search functionality
│   ├── Album/          # Album details
│   ├── Profile/        # User profile
│   └── Auth/           # Authentication
├── store/              # Redux store configuration
│   └── slices/         # Redux slices
├── services/           # API services and mock data
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

## 📊 Mock Data

The app includes comprehensive mock data featuring:
- **Albums**: OK Computer, In Rainbows, To Pimp a Butterfly, Blonde, Good Kid M.A.A.D City
- **Track Listings**: Complete track data with durations and featured artists
- **Metadata**: Release dates, genres, descriptions, and external IDs
- **User Data**: Mock user profiles and statistics

## 🔧 Development

### State Management
The app uses Redux Toolkit with the following slices:
- `authSlice`: User authentication and profile data
- `albumSlice`: Album data and user interactions (ratings, listens)
- `searchSlice`: Search functionality and trending data
- `userSlice`: Social features and activity feeds

### Services
- `AlbumService`: Handles album data fetching and search
- Mock API responses with realistic delays
- Extensible architecture for real API integration

### Type Safety
Full TypeScript integration with:
- Strongly typed Redux state and actions
- Navigation parameter types
- Component prop interfaces
- API response types

## 🚧 Future Development

### Phase 1: Backend Integration
- Replace mock data with real API
- Implement user authentication
- Set up database for user data

### Phase 2: Social Features
- User following system
- Activity feeds
- Review comments and likes

### Phase 3: Advanced Features
- Custom lists and collections
- Advanced search filters
- Listening statistics
- Streaming service integration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Letterboxd](https://letterboxd.com/)
- Album data and images from Spotify Web API
- Built with React Native and Material Design 3

---

**Status**: ✅ Core features implemented and functional
**Next Steps**: Backend integration and user authentication
