// Spotify Web API Configuration
import { ENV_CONFIG } from './env';

export const SPOTIFY_CONFIG = {
  // API Base URL
  API_BASE_URL: 'https://api.spotify.com/v1',
  
  // Authentication endpoints
  AUTH_URL: 'https://accounts.spotify.com/api/token',
  
  // Client credentials from environment configuration
  // For development, you'll need to:
  // 1. Go to https://developer.spotify.com/dashboard
  // 2. Create a new app
  // 3. Get your Client ID and Client Secret
  // 4. Create env.local.ts with your credentials (see env.ts for example)
  CLIENT_ID: ENV_CONFIG.SPOTIFY_CLIENT_ID || 'your_spotify_client_id',
  CLIENT_SECRET: ENV_CONFIG.SPOTIFY_CLIENT_SECRET || 'your_spotify_client_secret',
  
  // API Endpoints
  ENDPOINTS: {
    SEARCH: '/search',
    ALBUMS: '/albums',
    ARTISTS: '/artists',
    TRACKS: '/tracks',
  },
  
  // Rate limiting configuration
  RATE_LIMIT: {
    REQUESTS_PER_SECOND: 10, // Conservative limit to avoid hitting rate limits
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
  },
  
  // Search configuration
  SEARCH: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 50,
    DEFAULT_MARKET: 'US',
    TYPES: {
      ALBUM: 'album',
      ARTIST: 'artist',
      TRACK: 'track',
    },
  },
};

// Validate configuration on load
if (SPOTIFY_CONFIG.CLIENT_ID === 'your_spotify_client_id' || SPOTIFY_CONFIG.CLIENT_SECRET === 'your_spotify_client_secret') {
  console.warn('⚠️ Spotify API credentials not configured. Using mock data fallback.');
}

// Environment setup instructions
export const SETUP_INSTRUCTIONS = `
To set up Spotify API integration:

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click "Create an App"
4. Fill in the app details:
   - App name: "Resonare Development"
   - App description: "Music discovery and rating app"
   - Website: Leave blank or add your website
   - Redirect URIs: https://example.com/callback (secure placeholder)
5. Accept the terms and create the app
6. Copy your Client ID and Client Secret
7. Set environment variables in .env file:
   - SPOTIFY_CLIENT_ID=your_client_id_here
   - SPOTIFY_CLIENT_SECRET=your_client_secret_here

For React Native development, you need react-native-config to load .env files.
`;