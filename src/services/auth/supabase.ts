import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { strings } from '@/i18n/es';
import { authConfig, isSupabaseConfigured } from './authConfig';
import { secureSessionStorage } from './sessionStorage';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) throw new Error(strings.auth.errors.notConfigured);
  if (client) return client;

  client = createClient(authConfig.supabaseUrl, authConfig.supabaseKey, {
    auth: {
      storage: secureSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });

  if (Platform.OS !== 'web') {
    const supabase = client;
    AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
  }

  return client;
}
