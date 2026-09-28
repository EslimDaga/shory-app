export const authConfig = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  appRedirectUri: 'shoryapp://auth-callback',
};

export const isAppleSignInEnabled = process.env.EXPO_PUBLIC_APPLE_SIGN_IN === 'true';

export const isSupabaseConfigured = Boolean(authConfig.supabaseUrl && authConfig.supabaseKey);

export const isPreviewAuth = __DEV__ && !isSupabaseConfigured;
