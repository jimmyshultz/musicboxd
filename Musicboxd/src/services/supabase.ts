import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV_CONFIG } from '../config/env';

// Environment configuration
const supabaseUrl = ENV_CONFIG.SUPABASE_URL;
const supabaseAnonKey = ENV_CONFIG.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Export types for TypeScript support
export type { User, Session } from '@supabase/supabase-js';