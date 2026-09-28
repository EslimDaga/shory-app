import { defineConfig, devices } from '@playwright/test';

// The suite runs against a production web export (react-native-web) built with a fake Supabase
// project: every backend call is mocked in e2e/support/mocks.ts, so the tests never touch real
// accounts, purchases or third-party APIs. EXPO_NO_DOTENV keeps .env/.env.local out of the build
// (the dev server can't be used for this: its bundle reads the .env files directly).
const PORT = 8082;
export const E2E_SUPABASE_URL = 'https://e2e.supabase.co';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
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
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'e2e-publishable-key',
      EXPO_PUBLIC_PRIVACY_URL: 'https://shory.test/privacy',
      EXPO_PUBLIC_TERMS_URL: 'https://shory.test/terms',
    },
  },
});
