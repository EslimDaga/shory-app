import { test as base, expect, type Page } from '@playwright/test';
import type { MusicSource } from '../../src/types/music';
import { SESSION_KEY } from './env';
import { createBackendState, installMocks, supabaseSession, type BackendState, type TestUser } from './mocks';

const PREFERRED_SOURCE_KEY = 'shory.onboarding.preferredSource';

type SessionOptions = {
  user?: Partial<TestUser>;
  // Stores a session whose access token already ran out, as after the app sat in the background
  // for over an hour.
  expired?: boolean;
  // The music source stored from onboarding.
  preferredSource?: MusicSource;
};

type Fixtures = {
  backend: BackendState;
  // Stores a session for the next page load, without opening the app.
  seedSession: (options?: SessionOptions) => Promise<void>;
  // Opens the app with a stored session, straight into Home.
  signedIn: (options?: SessionOptions) => Promise<void>;
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
    expect(state.unexpected, 'requests no mock answered').toEqual([]);
  },

  seedSession: async ({ page, backend }, use) => {
    await use(async (options) => {
      backend.user = { ...backend.user, ...options?.user };
      const session = supabaseSession(backend.user, { expired: options?.expired });
      const seed: [string, string][] = [[SESSION_KEY, JSON.stringify(session)]];
      if (options?.preferredSource) seed.push([PREFERRED_SOURCE_KEY, options.preferredSource]);
      await page.addInitScript((items) => {
        // Only seed on the first load, so sign-out isn't undone by a reload.
        if (sessionStorage.getItem('e2e.seeded')) return;
        sessionStorage.setItem('e2e.seeded', '1');
        for (const [key, value] of items) localStorage.setItem(key, value);
      }, seed);
    });
  },

  signedIn: async ({ page, seedSession }, use) => {
    await use(async (options) => {
      await seedSession(options);
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Pegar link de una canción' })).toBeVisible({
        timeout: 45_000,
      });
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
