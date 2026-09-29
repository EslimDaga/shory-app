import { defineConfig, devices } from '@playwright/test';
import { E2E_SUPABASE_KEY, E2E_SUPABASE_URL } from './e2e/support/env';

// The suite runs against a production web export (react-native-web) built with a fake Supabase
// project: every backend call is mocked in e2e/support/mocks.ts, so the tests never touch real
// accounts, purchases or third-party APIs. EXPO_NO_DOTENV keeps .env/.env.local out of the build
// (the dev server can't be used for this: its bundle reads the .env files directly). It doesn't
// cover the shell, though: Playwright passes its own environment to the webServer, so every
// EXPO_PUBLIC_* variable the app reads is pinned below, or a value set in the shell or CI would be
// inlined into the export, plus EAS_BUILD_PROFILE, which app.config.ts checks. The rest of what
// app.config.ts reads (EAS_PROJECT_ID, GOOGLE_IOS_URL_SCHEME) only ends up in the native config.
const PORT = 8082;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-PE',
    timezoneId: 'America/Lima',
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 14'], browserName: 'chromium' } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx expo export -p web --output-dir .e2e-dist && npx expo serve .e2e-dist --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      EXPO_NO_DOTENV: '1',
      EXPO_NO_TELEMETRY: '1',
      EXPO_PUBLIC_SUPABASE_URL: E2E_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: E2E_SUPABASE_KEY,
      EXPO_PUBLIC_PRIVACY_URL: 'https://shory.test/privacy',
      EXPO_PUBLIC_TERMS_URL: 'https://shory.test/terms',
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '',
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '',
      EXPO_PUBLIC_APPLE_SIGN_IN: 'false',
      EXPO_PUBLIC_DEV_TRACK_URL: '',
      EXPO_PUBLIC_FB_APP_ID: '',
      EXPO_PUBLIC_REVENUECAT_IOS_KEY: '',
      // A production profile would trip app.config.ts's release checks.
      EAS_BUILD_PROFILE: '',
    },
  },
});
