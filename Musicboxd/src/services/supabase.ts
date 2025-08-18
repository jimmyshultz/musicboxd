import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration - replace with your actual values
const supabaseUrl = 'https://your-project-ref.supabase.co'; // Replace with your actual Supabase URL
const supabaseAnonKey = 'your_actual_anon_key_here'; // Replace with your actual anon key

if (supabaseUrl === 'https://your-project-ref.supabase.co' || supabaseAnonKey === 'your_actual_anon_key_here') {
  console.warn('⚠️  Supabase configuration not found. Please update with your actual Supabase credentials.');
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