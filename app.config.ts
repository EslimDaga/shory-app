import type { ConfigContext, ExpoConfig } from 'expo/config';
import { withEntitlementsPlist, type ConfigPlugin } from 'expo/config-plugins';

const GOOGLE_IOS_URL_SCHEME_PLACEHOLDER = 'com.googleusercontent.apps.shory-placeholder';
const APPLE_SIGN_IN_ENABLED = process.env.EXPO_PUBLIC_APPLE_SIGN_IN === 'true';
const IS_PRODUCTION_BUILD = process.env.EAS_BUILD_PROFILE === 'production';

// App Review guideline 4.8: an app offering Google sign-in must also offer Sign in with Apple.
// A production build without it would be rejected, so it's refused here instead.
if (IS_PRODUCTION_BUILD && !APPLE_SIGN_IN_ENABLED) {
  throw new Error('Production builds need EXPO_PUBLIC_APPLE_SIGN_IN=true (App Store guideline 4.8).');
}

// Guideline 5.1.1 needs a working privacy policy in the app, and sharing to Instagram (the core
// feature) needs the Facebook App ID. A production build missing either would fail review.
const REQUIRED_IN_PRODUCTION = [
  'EXPO_PUBLIC_PRIVACY_URL',
  'EXPO_PUBLIC_TERMS_URL',
  'EXPO_PUBLIC_FB_APP_ID',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_REVENUECAT_IOS_KEY',
];
const missing = REQUIRED_IN_PRODUCTION.filter((name) => !process.env[name]);
if (IS_PRODUCTION_BUILD && missing.length > 0) {
  throw new Error(`Production builds need these EAS environment variables: ${missing.join(', ')}`);
}

const withoutAppleSignIn: ConfigPlugin = (config) =>
  withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['com.apple.developer.applesignin'];
    return mod;
  });

// Only the App Store public key belongs in the bundle: a Test Store key (test_) would give Pro away
// for free, and a secret key (sk_) would be published inside the app.
if (IS_PRODUCTION_BUILD && !process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY?.startsWith('appl_')) {
  throw new Error(
    'Production builds need the App Store RevenueCat key (appl_…), not a Test Store or secret key.',
  );
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const expoConfig: ExpoConfig = {
    ...(config as ExpoConfig),
    ios: {
      ...config.ios,
      usesAppleSignIn: APPLE_SIGN_IN_ENABLED,
      infoPlist: {
        ...config.ios?.infoPlist,
        // Only standard HTTPS/TLS (exempt): skips the export-compliance question on every upload.
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    plugins: [
      ...(config.plugins ?? []),
      ...(APPLE_SIGN_IN_ENABLED ? ['expo-apple-authentication'] : []),
      [
        '@react-native-google-signin/google-signin',
        { iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME ?? GOOGLE_IOS_URL_SCHEME_PLACEHOLDER },
      ],
    ],
    extra: {
      ...config.extra,
      ...(process.env.EAS_PROJECT_ID ? { eas: { projectId: process.env.EAS_PROJECT_ID } } : {}),
    },
  };
  return APPLE_SIGN_IN_ENABLED ? expoConfig : withoutAppleSignIn(expoConfig);
};
