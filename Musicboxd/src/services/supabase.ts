import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Environment variables - these will be replaced with actual values from .env
const supabaseUrl = process.env.SUPABASE_URL || 'your_supabase_project_url_here';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

if (supabaseUrl === 'your_supabase_project_url_here' || supabaseAnonKey === 'your_supabase_anon_key_here') {
  console.warn('⚠️  Supabase configuration not found. Please update your .env file with actual Supabase credentials.');
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