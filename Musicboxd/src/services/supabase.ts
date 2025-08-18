import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Config from 'react-native-config';

// Environment variables from .env file
const supabaseUrl = Config.SUPABASE_URL;
const supabaseAnonKey = Config.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️  Supabase configuration not found. Please check your .env file has SUPABASE_URL and SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable automatic session refresh
    autoRefreshToken: true,
    // Persist session in local storage
    persistSession: true,
    // Detect session from URL (useful for OAuth redirects)
    detectSessionInUrl: false,
  },
});

// Export types for TypeScript support
export type { User, Session } from '@supabase/supabase-js';