import Config from 'react-native-config';

export const ENV = {
  ENVIRONMENT: Config.ENVIRONMENT || 'development',
  APP_NAME: Config.APP_NAME || 'Musicboxd',
  BUNDLE_ID: Config.BUNDLE_ID || 'com.musicboxd.app',
  SUPABASE_URL: Config.SUPABASE_URL!,
  SUPABASE_ANON_KEY: Config.SUPABASE_ANON_KEY!,
  SPOTIFY_CLIENT_ID: Config.SPOTIFY_CLIENT_ID!,
};

// Environment checking helpers
export const isDevelopment = ENV.ENVIRONMENT === 'development';
export const isStaging = ENV.ENVIRONMENT === 'staging';
export const isProduction = ENV.ENVIRONMENT === 'production';

// Debug logging (only in development)
if (isDevelopment) {
  console.log('🔧 Current Environment:', ENV.ENVIRONMENT);
  console.log('📱 App Name:', ENV.APP_NAME);
  console.log('🆔 Bundle ID:', ENV.BUNDLE_ID);
}
