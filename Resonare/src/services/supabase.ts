import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV_CONFIG } from '../config/env';
import { Environment, Logger } from '../config/environment';
import { Database } from '../types/database';

// Environment-specific Supabase configuration
const getSupabaseConfig = () => {
  const config = {
    url: ENV_CONFIG.SUPABASE_URL,
    anonKey: ENV_CONFIG.SUPABASE_ANON_KEY,
  };

  // In the future, different environments can use different Supabase projects
  if (Environment.isStaging) {
    // For now, use the same config. In a real staging setup, you'd have:
    //config.url = ENV.SUPABASE_STAGING_URL;
    //config.anonKey = ENV.SUPABASE_STAGING_ANON_KEY;
    Logger.log('Using staging Supabase configuration');
  } else if (Environment.isProduction) {
    // Use production environment variables from .env.production
    // config.url = ENV_CONFIG.SUPABASE_URL;
    // config.anonKey = ENV_CONFIG.SUPABASE_ANON_KEY;
    Logger.log('Using production Supabase configuration', config.url);
  } else {
    Logger.log('Using development Supabase configuration');
  }

  return config;
};

const config = getSupabaseConfig();

// Debug Supabase configuration (only in development)
Logger.debug('Supabase Configuration', {
  environment: ENV_CONFIG.ENVIRONMENT,
  isProduction: Environment.isProduction,
  isStaging: Environment.isStaging,
  url: config.url,
  anonKeyPreview: config.anonKey?.substring(0, 20) + '...',
});

export const supabase = createClient<Database>(config.url, config.anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Test Supabase connection (environment-aware logging)
setTimeout(() => {
  supabase.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) {
        Logger.warn('Supabase connection test failed', error.message);
      } else {
        Logger.debug('Supabase connection test successful', {
          hasSession: !!data.session,
        });
      }
    })
    .catch(err => {
      Logger.error('Supabase connection test error', err);
    });
}, 1000);

// Export types for TypeScript support
export type { User, Session } from '@supabase/supabase-js';
