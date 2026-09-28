import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page, Request, Route } from '@playwright/test';

// Every network call the app makes outside its own dev server is answered here. Anything left
// unmatched is aborted, so a test can never reach a real backend by accident.

export const COVER_JPG = readFileSync(path.join(__dirname, '../assets/cover.jpg'));

export type TestUser = { id: string; email: string; name: string; provider?: 'email' | 'google' | 'apple' };

export const DEFAULT_USER: TestUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'ana@shory.test',
  name: 'Ana Prueba',
};

export const SPOTIFY_TRACK = {
  url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
  title: 'Noches de Prueba',
  artist: 'Los Mocks',
};

export const APPLE_TRACK = {
  url: 'https://music.apple.com/pe/album/golden-test/1440000000?i=1440000001',
  title: 'Golden Test',
  artist: 'Apple Band',
};

export const YOUTUBE_TRACK = {
  url: 'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
  title: 'YouTube Mock Song',
  artist: 'YT Artist',
};

export function supabaseUser(user: TestUser) {
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    email_confirmed_at: '2026-01-01T00:00:00Z',
    app_metadata: { provider: user.provider ?? 'email', providers: [user.provider ?? 'email'] },
    user_metadata: { full_name: user.name },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

export function supabaseSession(user: TestUser) {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  return {
    access_token: `e2e-access-${user.id}`,
    token_type: 'bearer',
    expires_in: 60 * 60 * 24,
    expires_at: expiresAt,
    refresh_token: `e2e-refresh-${user.id}`,
    user: supabaseUser(user),
  };
}

type AuthError = { status: number; code: string; message: string };

// What the fake backend answers; each test tweaks it through the `backend` fixture.
export type BackendState = {
  user: TestUser;
  // Sign-in with password fails with this error when set.
  loginError: AuthError | null;
  // Sign-up returns no session (email confirmation needed) when true.
  signupNeedsConfirmation: boolean;
  signupError: AuthError | null;
  verifyError: AuthError | null;
  deleteAccountStatus: number;
  serverPlan: 'free' | 'pro';
  spotifyStatus: number;
  // Holds music metadata responses back, to observe the loading state.
  musicDelayMs: number;
  // Records of what the app sent, for assertions.
  calls: { method: string; path: string; body: unknown }[];
};

export function createBackendState(): BackendState {
  return {
    user: { ...DEFAULT_USER },
    loginError: null,
    signupNeedsConfirmation: false,
    signupError: null,
    verifyError: null,
    deleteAccountStatus: 200,
    serverPlan: 'free',
    spotifyStatus: 200,
    musicDelayMs: 0,
    calls: [],
  };
}

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  });

const authError = (route: Route, error: AuthError) =>
  json(route, error.status, { code: error.code, error_code: error.code, msg: error.message, message: error.message });

function bodyOf(request: Request): unknown {
  try {
    return request.postDataJSON();
  } catch {
    return request.postData();
  }
}

// CORS preflights from supabase-js (it sends custom headers).
async function preflight(route: Route): Promise<boolean> {
  if (route.request().method() !== 'OPTIONS') return false;
  await route.fulfill({
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    },
  });
  return true;
}

async function handleSupabase(route: Route, state: BackendState) {
  if (await preflight(route)) return;
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method();
  const body = bodyOf(request);
  state.calls.push({ method, path: `${url.pathname}${url.search}`, body });

  const p = url.pathname;
  const grant = url.searchParams.get('grant_type');

  if (p.endsWith('/auth/v1/token') && grant === 'password') {
    if (state.loginError) return authError(route, state.loginError);
    const email = (body as { email?: string })?.email ?? state.user.email;
    state.user = { ...state.user, email };
    return json(route, 200, supabaseSession(state.user));
  }
  if (p.endsWith('/auth/v1/token') && grant === 'refresh_token') {
    return json(route, 200, supabaseSession(state.user));
  }
  if (p.endsWith('/auth/v1/signup')) {
    if (state.signupError) return authError(route, state.signupError);
    const { email, data } = (body ?? {}) as { email?: string; data?: { full_name?: string } };
    state.user = { ...state.user, email: email ?? state.user.email, name: data?.full_name ?? state.user.name };
    if (state.signupNeedsConfirmation) return json(route, 200, supabaseUser(state.user));
    return json(route, 200, supabaseSession(state.user));
  }
  if (p.endsWith('/auth/v1/verify')) {
    if (state.verifyError) return authError(route, state.verifyError);
    return json(route, 200, supabaseSession(state.user));
  }
  if (p.endsWith('/auth/v1/resend') || p.endsWith('/auth/v1/recover')) return json(route, 200, {});
  if (p.endsWith('/auth/v1/logout')) return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
  if (p.endsWith('/auth/v1/user')) {
    if (method === 'PUT') {
      const data = (body as { data?: Record<string, unknown> })?.data;
      return json(route, 200, { ...supabaseUser(state.user), user_metadata: { full_name: state.user.name, ...data } });
    }
    return json(route, 200, supabaseUser(state.user));
  }

  if (p.endsWith('/functions/v1/subscription')) {
    return json(route, 200, {
      subscription: { plan: state.serverPlan, periodType: null, expiresAt: null, willRenew: false },
    });
  }
  if (p.endsWith('/functions/v1/delete-account')) {
    return json(route, state.deleteAccountStatus, state.deleteAccountStatus === 200 ? { ok: true } : { error: 'boom' });
  }
  if (p.endsWith('/functions/v1/football')) {
    if (state.serverPlan !== 'pro') return json(route, 402, { error: 'pro_required' });
    const action = (body as { action?: string })?.action;
    if (action === 'search') {
      return json(route, 200, {
        teams: [
          { id: 1, name: 'Club Alianza Lima', shortName: 'Alianza', crest: null },
          { id: 2, name: 'Universitario de Deportes', shortName: 'Universitario', crest: null },
        ],
      });
    }
    return json(route, 200, { match: null });
  }

  return json(route, 404, { message: `Unmocked Supabase route ${method} ${p}` });
}

const SPOTIFY_EMBED_HTML = (artist: string) => `<!doctype html><html><body>
<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
  props: {
    pageProps: {
      state: {
        data: {
          entity: {
            artists: [{ name: artist }],
            duration: 201000,
            visualIdentity: { backgroundBase: { red: 196, green: 83, blue: 47 } },
          },
        },
      },
    },
  },
})}</script></body></html>`;

async function handleMusic(route: Route, state: BackendState) {
  const url = new URL(route.request().url());
  const host = url.hostname;
  if (state.musicDelayMs) await new Promise((resolve) => setTimeout(resolve, state.musicDelayMs));

  if (host === 'open.spotify.com' && url.pathname === '/oembed') {
    if (state.spotifyStatus !== 200) return json(route, state.spotifyStatus, { error: 'not found' });
    return json(route, 200, {
      title: SPOTIFY_TRACK.title,
      thumbnail_url: 'https://i.scdn.co/image/ab67616d00001e02e2e2e2e2e2e2e2e2',
      iframe_url: 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
    });
  }
  if (host === 'open.spotify.com' && url.pathname.startsWith('/embed/')) {
    return route.fulfill({
      status: 200,
      contentType: 'text/html',
      headers: { 'access-control-allow-origin': '*' },
      body: SPOTIFY_EMBED_HTML(SPOTIFY_TRACK.artist),
    });
  }
  if (host === 'itunes.apple.com') {
    return json(route, 200, {
      resultCount: 1,
      results: [
        {
          wrapperType: 'track',
          trackName: APPLE_TRACK.title,
          artistName: APPLE_TRACK.artist,
          artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/cover/100x100bb.jpg',
          trackTimeMillis: 180000,
        },
      ],
    });
  }
  if (host === 'music.apple.com') {
    return route.fulfill({ status: 200, contentType: 'text/html', headers: { 'access-control-allow-origin': '*' }, body: '<html></html>' });
  }
  if (host === 'www.youtube.com' && url.pathname === '/oembed') {
    return json(route, 200, {
      title: YOUTUBE_TRACK.title,
      author_name: `${YOUTUBE_TRACK.artist} - Topic`,
      thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    });
  }
  // Cover art from any of the services.
  return route.fulfill({
    status: 200,
    contentType: 'image/jpeg',
    headers: { 'access-control-allow-origin': '*' },
    body: COVER_JPG,
  });
}

async function handleWeather(route: Route) {
  const url = new URL(route.request().url());
  if (url.hostname.startsWith('geocoding-api')) {
    return json(route, 200, {
      results: [
        {
          id: 3936456,
          name: 'Lima',
          latitude: -12.04,
          longitude: -77.03,
          country: 'Perú',
          country_code: 'PE',
          admin1: 'Lima',
          feature_code: 'PPLC',
          population: 7737002,
        },
      ],
    });
  }
  const hours = Array.from({ length: 24 }, (_, hour) => `2026-09-27T${String(hour).padStart(2, '0')}:00`);
  return json(route, 200, {
    current: { time: '2026-09-27T12:15', temperature_2m: 21.4, weather_code: 2, is_day: 1, wind_speed_10m: 14 },
    hourly: {
      time: hours,
      temperature_2m: hours.map((_, i) => 16 + (i % 8)),
      weather_code: hours.map(() => 1),
      is_day: hours.map((_, i) => (i >= 6 && i < 18 ? 1 : 0)),
    },
    daily: { temperature_2m_max: [24.1, 25], temperature_2m_min: [17.2, 16] },
  });
}

// Routed on the browser context, so pages the app opens (legal links) are covered too.
export async function installMocks(page: Page, state: BackendState) {
  await page.context().route(/^https?:\/\/(?!localhost)/, (route) => {
    const host = new URL(route.request().url()).hostname;
    if (host === 'shory.test') {
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Shory legal</h1>' });
    }
    if (host === 'e2e.supabase.co') return handleSupabase(route, state);
    if (/(spotify|scdn|apple|mzstatic|youtube|ytimg)/.test(host)) return handleMusic(route, state);
    if (host.endsWith('open-meteo.com')) return handleWeather(route);
    // Fonts are bundled; anything else external is out of scope for these tests.
    return route.abort('blockedbyclient');
  });
}
