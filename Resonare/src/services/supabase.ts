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
    //config.url = ENV.SUPABASE_PRODUCTION_URL;
    //config.anonKey = ENV.SUPABASE_PRODUCTION_ANON_KEY;
    Logger.log('Using production Supabase configuration');
  } else {
    Logger.log('Using development Supabase configuration');
  }

  return config;
};

const config = getSupabaseConfig();

export const supabase = createClient<Database>(config.url, config.anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Export types for TypeScript support
export type { User, Session } from '@supabase/supabase-js';