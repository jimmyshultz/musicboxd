declare module 'react-native-config' {
  export interface NativeConfig {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    NODE_ENV?: string;
  }

  export const Config: NativeConfig;
  export default Config;
}