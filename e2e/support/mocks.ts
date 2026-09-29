import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page, Request, Route } from '@playwright/test';
import { E2E_SUPABASE_HOST } from './env';

// Every network call the app makes outside its own dev server is answered here. Anything left
// unmatched is refused and recorded in `unexpected`, which fails the test (see the `backend`
// fixture), so a test can never reach a real backend by accident nor pass on a call nobody mocked.

const COVER_JPG = readFileSync(path.join(__dirname, '../assets/cover.jpg'));

export type TestUser = { id: string; email: string; name: string; provider?: 'email' | 'google' | 'apple' };

const DEFAULT_USER: TestUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'ana@shory.test',
  name: 'Ana Prueba',
};

export const SPOTIFY_TRACK = {
  url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
  title: 'Noches de Prueba',
  artist: 'Los Mocks',
};

const APPLE_SONG_ID = '1440000001';

export const APPLE_TRACK = {
  url: `https://music.apple.com/pe/album/golden-test/1440000000?i=${APPLE_SONG_ID}`,
  title: 'Golden Test',
  artist: 'Apple Band',
};

export const YOUTUBE_TRACK = {
  url: 'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
  title: 'YouTube Mock Song',
  artist: 'YT Artist',
};

// The app asks YouTube's oEmbed about the plain watch URL of the video id.
const YOUTUBE_WATCH_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

export function supabaseUser(user: TestUser) {
  const provider = user.provider ?? 'email';
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    email_confirmed_at: '2026-01-01T00:00:00Z',
    app_metadata: { provider, providers: [provider] },
    user_metadata: { full_name: user.name },
    identities: [
      {
        identity_id: `${user.id}-${provider}`,
        id: user.id,
        user_id: user.id,
        identity_data: { sub: user.id, email: user.email },
        provider,
        email: user.email,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        last_sign_in_at: '2026-01-01T00:00:00Z',
      },
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

// `expired`: an access token that ran out an hour ago, which supabase-js has to refresh before use.
// `generation` tells apart the tokens handed out by each refresh (0 is the one stored at sign-in).
export function supabaseSession(user: TestUser, { expired = false, generation = 0 } = {}) {
  const expiresIn = expired ? -60 * 60 : 60 * 60 * 24;
  return {
    access_token: `e2e-access-${user.id}-${generation}`,
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    refresh_token: `e2e-refresh-${user.id}-${generation}`,
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
  // With email confirmation on, Supabase answers a sign-up for an already confirmed email with an
  // obfuscated user that has no identities (and no session) instead of an error.
  signupExistingUser: boolean;
  signupError: AuthError | null;
  verifyError: AuthError | null;
  // Refreshing the session fails with this error when set (e.g. a revoked refresh token).
  refreshError: AuthError | null;
  // Sessions handed out by refreshes so far.
  refreshes: number;
  deleteAccountStatus: number;
  spotifyStatus: number;
  // What YouTube's oEmbed returns, to exercise the title/artist parsing.
  youtubeOEmbed: { title: string; author_name: string };
  // Holds music metadata responses back, to observe the loading state.
  musicDelayMs: number;
  // Records of what the app sent, for assertions.
  calls: { method: string; path: string; body: unknown }[];
  // Requests nothing here answers. The `backend` fixture fails the test if any happened.
  unexpected: string[];
};

export function createBackendState(): BackendState {
  return {
    user: { ...DEFAULT_USER },
    loginError: null,
    signupNeedsConfirmation: false,
    signupExistingUser: false,
    signupError: null,
    verifyError: null,
    refreshError: null,
    refreshes: 0,
    deleteAccountStatus: 200,
    spotifyStatus: 200,
    youtubeOEmbed: { title: YOUTUBE_TRACK.title, author_name: `${YOUTUBE_TRACK.artist} - Topic` },
    musicDelayMs: 0,
    calls: [],
    unexpected: [],
  };
}

const json = (route: Route, status: number, body: unknown, headers: Record<string, string> = {}) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*', ...headers },
    body: JSON.stringify(body),
  });

// supabase-js asks for API version 2024-01-01, and Supabase Auth then answers errors as
// `{ code, message }` with the version in a header (which auth-js needs to read the code).
const authError = (route: Route, error: AuthError) =>
  json(
    route,
    error.status,
    { code: error.code, message: error.message },
    { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'x-supabase-api-version' },
  );

function bodyOf(request: Request): unknown {
  try {
    return request.postDataJSON();
  } catch {
    return request.postData();
  }
}

// CORS preflights never reach these handlers: Chromium answers them itself for intercepted requests.
async function handleSupabase(route: Route, state: BackendState) {
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
    if (state.refreshError) return authError(route, state.refreshError);
    state.refreshes += 1;
    return json(route, 200, supabaseSession(state.user, { generation: state.refreshes }));
  }
  if (p.endsWith('/auth/v1/signup')) {
    if (state.signupError) return authError(route, state.signupError);
    const { email, data } = (body ?? {}) as { email?: string; data?: { full_name?: string } };
    state.user = {
      ...state.user,
      email: email ?? state.user.email,
      name: data?.full_name ?? state.user.name,
    };
    if (state.signupExistingUser) return json(route, 200, { ...supabaseUser(state.user), identities: [] });
    if (state.signupNeedsConfirmation) return json(route, 200, supabaseUser(state.user));
    return json(route, 200, supabaseSession(state.user));
  }
  if (p.endsWith('/auth/v1/verify')) {
    if (state.verifyError) return authError(route, state.verifyError);
    return json(route, 200, supabaseSession(state.user));
  }
  if (p.endsWith('/auth/v1/resend') || p.endsWith('/auth/v1/recover')) return json(route, 200, {});
  if (p.endsWith('/auth/v1/logout'))
    return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
  if (p.endsWith('/auth/v1/user') && method === 'PUT') {
    const data = (body as { data?: Record<string, unknown> })?.data;
    return json(route, 200, {
      ...supabaseUser(state.user),
      user_metadata: { full_name: state.user.name, ...data },
    });
  }
  // The only edge function web reaches: the plan sync, football and weather are Pro-only paths and
  // web always runs on the free plan (purchases.web.ts).
  if (p.endsWith('/functions/v1/delete-account')) {
    return json(
      route,
      state.deleteAccountStatus,
      state.deleteAccountStatus === 200 ? { ok: true } : { error: 'delete_failed' },
    );
  }

  state.unexpected.push(`${method} ${url.href}`);
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

// Metadata lookups only answer for the exact song the app should have asked for, like the real
// services: a wrong id or an un-normalized link gets "not found".
async function handleMusic(route: Route, state: BackendState) {
  const request = route.request();
  const url = new URL(request.url());
  const host = url.hostname;
  state.calls.push({ method: request.method(), path: `${host}${url.pathname}${url.search}`, body: null });
  if (state.musicDelayMs) await new Promise((resolve) => setTimeout(resolve, state.musicDelayMs));

  if (host === 'open.spotify.com' && url.pathname === '/oembed') {
    if (state.spotifyStatus !== 200) return json(route, state.spotifyStatus, { error: 'not found' });
    if (url.searchParams.get('url') !== SPOTIFY_TRACK.url) return json(route, 404, { error: 'not found' });
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
    const { searchParams } = url;
    // The real lookup answers 200 with no results for an unknown id.
    if (searchParams.get('id') !== APPLE_SONG_ID || searchParams.get('country') !== 'pe') {
      return json(route, 200, { resultCount: 0, results: [] });
    }
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
    return route.fulfill({
      status: 200,
      contentType: 'text/html',
      headers: { 'access-control-allow-origin': '*' },
      body: '<html></html>',
    });
  }
  if (host === 'www.youtube.com' && url.pathname === '/oembed') {
    if (url.searchParams.get('url') !== YOUTUBE_WATCH_URL) return json(route, 404, { error: 'not found' });
    return json(route, 200, {
      ...state.youtubeOEmbed,
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

// Routed on the browser context, so pages the app opens (legal links) are covered too.
export async function installMocks(page: Page, state: BackendState) {
  await page.context().route(/^https?:\/\/(?!localhost)/, (route) => {
    const host = new URL(route.request().url()).hostname;
    if (host === 'shory.test') {
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Shory legal</h1>' });
    }
    if (host === E2E_SUPABASE_HOST) return handleSupabase(route, state);
    if (/(spotify|scdn|apple|mzstatic|youtube|ytimg)/.test(host)) return handleMusic(route, state);
    // The paywall's sample football widget shows two club crests.
    if (host === 'crests.football-data.org') {
      return route.fulfill({ status: 200, contentType: 'image/jpeg', body: COVER_JPG });
    }
    state.unexpected.push(`${route.request().method()} ${route.request().url()}`);
    return route.abort('blockedbyclient');
  });
}
