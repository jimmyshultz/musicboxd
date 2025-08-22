// Local Environment Configuration Example
// Copy this file to env.local.ts and add your actual Spotify credentials
// env.local.ts is gitignored and won't be committed to version control

export const LOCAL_ENV = {
  SPOTIFY_CLIENT_ID: 'your_actual_spotify_client_id_here',
  SPOTIFY_CLIENT_SECRET: 'your_actual_spotify_client_secret_here',
};

// Instructions:
// 1. Go to https://developer.spotify.com/dashboard
// 2. Create or select your Musicboxd app
// 3. Copy your Client ID and Client Secret
// 4. Replace the values above with your actual credentials
// 5. Save this file as env.local.ts (remove .example from filename)