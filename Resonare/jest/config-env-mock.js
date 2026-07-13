// Test stub for src/config/env.ts, which is gitignored (holds per-developer
// env wiring) and therefore absent in CI. Mirrors the ENV_CONFIG shape that
// modules like src/services/supabase.ts import, with inert test values.
module.exports = {
  ENV_CONFIG: {
    ENVIRONMENT: 'test',
    APP_NAME: 'Resonare',
    BUNDLE_ID: 'com.resonare.test',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SPOTIFY_CLIENT_ID: 'test-client-id',
    SPOTIFY_CLIENT_SECRET: 'test-client-secret',
  },
  isDevelopment: false,
  isStaging: false,
  isProduction: false,
};
