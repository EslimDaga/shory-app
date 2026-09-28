import { test as base, expect, type Page } from '@playwright/test';
import { createBackendState, installMocks, supabaseSession, type BackendState, type TestUser } from './mocks';

// supabase-js keeps the session under `sb-<project ref>-auth-token`; the e2e project is
// https://e2e.supabase.co (see playwright.config.ts).
export const SESSION_KEY = 'sb-e2e-auth-token';
const PREFERRED_SOURCE_KEY = 'shory.onboarding.preferredSource';

type Fixtures = {
  backend: BackendState;
  // Opens the app with a stored session, straight into Home.
  signedIn: (options?: { user?: Partial<TestUser> }) => Promise<void>;
  // Opens the app signed out, on the welcome screen.
  signedOut: () => Promise<void>;
  // What navigator.clipboard.readText() returns inside the app.
  setClipboard: (text: string) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  backend: async ({ page }, use) => {
    const state = createBackendState();
    await installMocks(page, state);
    // A controllable clipboard: the real one needs permissions and differs per browser.
    await page.addInitScript(() => {
      const w = window as unknown as { __clipboard: string };
      w.__clipboard = w.__clipboard ?? '';
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          readText: async () => w.__clipboard,
          writeText: async (text: string) => {
            w.__clipboard = text;
          },
          read: async () => [],
          write: async () => {},
        },
      });
    });
    await use(state);
  },

  signedIn: async ({ page, backend }, use) => {
    await use(async (options) => {
      backend.user = { ...backend.user, ...options?.user };
      const session = supabaseSession(backend.user);
      await page.addInitScript(
        ([key, value]) => {
          // Only seed on the first load, so sign-out isn't undone by a reload.
          if (sessionStorage.getItem('e2e.seeded')) return;
          sessionStorage.setItem('e2e.seeded', '1');
          localStorage.setItem(key, value);
        },
        [SESSION_KEY, JSON.stringify(session)] as const,
      );
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Pegar link de una canción' })).toBeVisible({ timeout: 45_000 });
    });
  },

  signedOut: async ({ page, backend }, use) => {
    void backend;
    await use(async () => {
      await page.goto('/');
      await expect(page.getByText('Empezar', { exact: true })).toBeVisible({ timeout: 45_000 });
    });
  },

  setClipboard: async ({ page }, use) => {
    await use(async (text) => {
      await page.evaluate((value) => {
        (window as unknown as { __clipboard: string }).__clipboard = value;
      }, text);
    });
  },
});

export { expect };

export async function storedPreferredSource(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), PREFERRED_SOURCE_KEY);
}

export async function storedSession(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), SESSION_KEY);
}

// Loads a song from the clipboard and waits for the editor.
export async function openEditorWith(page: Page, setClipboard: (text: string) => Promise<void>, url: string) {
  await setClipboard(url);
  await page.getByRole('button', { name: 'Pegar link de una canción' }).click();
  await expect(page.getByRole('button', { name: 'Cerrar' }).first()).toBeVisible({ timeout: 20_000 });
}
