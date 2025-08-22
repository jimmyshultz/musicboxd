// Environment configuration example for Musicboxd
// Copy this file to env.ts and replace with your actual Supabase credentials

export const ENV_CONFIG = {
  SUPABASE_URL: 'https://your-project-ref.supabase.co', // Replace with your actual Supabase URL
  SUPABASE_ANON_KEY: 'your_actual_anon_key_here', // Replace with your actual anon key
  NODE_ENV: 'development',
  SPOTIFY_CLIENT_ID: 'your_actual_spotify_client_id_here',
  SPOTIFY_CLIENT_SECRET: 'your_actual_spotify_client_secret_here',
};

// Validation
if (ENV_CONFIG.SUPABASE_URL === 'https://your-project-ref.supabase.co' || 
    ENV_CONFIG.SUPABASE_ANON_KEY === 'your_actual_anon_key_here') {
  console.warn('⚠️  Please update src/config/env.ts with your actual Supabase credentials');
}