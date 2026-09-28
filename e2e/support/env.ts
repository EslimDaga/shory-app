// The fake Supabase project the web export is built against (playwright.config.ts) and that
// mocks.ts answers for. Everything else about it is derived from here.
export const E2E_SUPABASE_URL = 'https://e2e.supabase.co';
export const E2E_SUPABASE_KEY = 'e2e-publishable-key';

export const E2E_SUPABASE_HOST = new URL(E2E_SUPABASE_URL).hostname;

// supabase-js keeps the session under `sb-<project ref>-auth-token` (the app's getAuthStorageKey).
export const SESSION_KEY = `sb-${E2E_SUPABASE_HOST.split('.')[0]}-auth-token`;
