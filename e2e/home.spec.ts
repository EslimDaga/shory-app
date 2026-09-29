import type { Page, Route } from '@playwright/test';
import { APPLE_TRACK, SPOTIFY_TRACK, YOUTUBE_TRACK } from './support/mocks';
import { expect, openEditorWith, storedPreferredSource, storedSession, test } from './support/fixtures';

const PASTE = { name: 'Pegar link de una canción' };
const DELETE_CONFIRM = '¿Eliminar tu cuenta?';

// Home's load errors are announced from the live region above the paste button.
const loadError = (page: Page, text: string) =>
  page.locator('[aria-live="polite"]').getByText(text, { exact: true });

test.describe('Home', () => {
  test.beforeEach(async ({ signedIn }) => {
    // Name and email start with different letters, so the avatar check tells them apart.
    await signedIn({ user: { name: 'Lucía Prueba' } });
  });

  test('muestra el contador, las estadísticas y los pasos para empezar', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'shory' })).toBeVisible();
    await expect(page.getByText('Historias creadas')).toBeVisible();
    await expect(page.getByText('Spotify · YT Music · Apple')).toBeVisible();
    // Each stat is one labelled element; a new account has nothing yet.
    for (const label of ['Esta semana: 0', 'Artistas: 0', 'Favorito: ninguno']) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByText('Cómo funciona')).toBeVisible();
    await expect(page.getByText('Abre la canción en tu app de música')).toBeVisible();
    await expect(page.getByText('Toca Compartir → Más → Shory')).toBeVisible();
    await expect(page.getByText('Pon tu foto, elige el widget y listo')).toBeVisible();
    // Initial of the signed-in user's name.
    await expect(page.getByRole('button', { name: 'Tu cuenta' })).toHaveText('L');
  });

  test('pegar texto sin link de música explica qué falta', async ({ page, setClipboard }) => {
    await setClipboard('hola, esto no es una canción');
    await page.getByRole('button', PASTE).click();
    await expect(
      loadError(page, 'No encontré un link de Spotify, YouTube Music o Apple Music.'),
    ).toBeVisible();
  });

  test('portapapeles vacío también muestra el aviso', async ({ page, setClipboard }) => {
    await setClipboard('');
    await page.getByRole('button', PASTE).click();
    await expect(
      loadError(page, 'No encontré un link de Spotify, YouTube Music o Apple Music.'),
    ).toBeVisible();
  });

  test('si el navegador no deja leer el portapapeles lo explica', async ({ page }) => {
    await page.evaluate(() => {
      navigator.clipboard.readText = () => Promise.reject(new DOMException('denied', 'NotAllowedError'));
    });
    await page.getByRole('button', PASTE).click();
    await expect(
      loadError(page, 'No se pudo leer el portapapeles. Permite el acceso e inténtalo de nuevo.'),
    ).toBeVisible();
    await expect(page.getByRole('button', PASTE)).toBeEnabled();
  });

  test('sin conexión avisa y deja volver a intentarlo', async ({ page, setClipboard }) => {
    await page
      .context()
      .route('https://open.spotify.com/oembed**', (route) => route.abort('internetdisconnected'));
    await setClipboard(SPOTIFY_TRACK.url);
    await page.getByRole('button', PASTE).click();
    await expect(loadError(page, 'Parece que no tienes conexión a internet.')).toBeVisible();
    await expect(page.getByRole('button', PASTE)).toBeEnabled();
  });

  test('un link de Spotify inválido muestra el estado del servicio', async ({
    page,
    setClipboard,
    backend,
  }) => {
    backend.spotifyStatus = 404;
    await setClipboard(SPOTIFY_TRACK.url);
    await page.getByRole('button', PASTE).click();
    await expect(loadError(page, 'Spotify respondió 404. ¿Es un link válido?')).toBeVisible();
    await expect(page.getByRole('button', PASTE)).toBeVisible();
  });

  test('muestra "Leyendo el link…" mientras carga', async ({ page, setClipboard, backend }) => {
    backend.musicDelayMs = 1500;
    await setClipboard(SPOTIFY_TRACK.url);
    await page.getByRole('button', PASTE).click();
    await expect(page.getByRole('button', { name: 'Leyendo el link…' })).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByText(SPOTIFY_TRACK.title, { exact: true }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  for (const [service, track] of [
    ['Spotify', SPOTIFY_TRACK],
    ['Apple Music', APPLE_TRACK],
    ['YouTube Music', YOUTUBE_TRACK],
  ] as const) {
    test(`abre el editor con una canción de ${service}`, async ({ page, setClipboard }) => {
      await openEditorWith(page, setClipboard, track.url);
      await expect(page.getByText(track.title, { exact: true }).first()).toBeVisible();
      await expect(page.getByText(track.artist, { exact: true }).first()).toBeVisible();
    });
  }

  test('Apple Music pide la canción (no el álbum) en la tienda del país del link', async ({
    page,
    setClipboard,
    backend,
  }) => {
    await openEditorWith(page, setClipboard, APPLE_TRACK.url);
    const lookups = backend.calls.filter((c) => c.path.startsWith('itunes.apple.com/lookup'));
    expect(lookups).toHaveLength(1);
    const params = new URL(`https://${lookups[0].path}`).searchParams;
    expect(params.get('id')).toBe('1440000001');
    expect(params.get('country')).toBe('pe');
  });

  test('YouTube quita el ruido del título y separa "Artista - Canción"', async ({
    page,
    setClipboard,
    backend,
  }) => {
    backend.youtubeOEmbed = {
      title: 'Otro Artista - Otra Canción (Official Video)',
      author_name: 'Algún Canal',
    };
    await openEditorWith(page, setClipboard, YOUTUBE_TRACK.url);
    await expect(page.getByText('Otra Canción', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Otro Artista', { exact: true }).first()).toBeVisible();
  });

  test('YouTube quita "VEVO" del canal cuando el título no trae artista', async ({
    page,
    setClipboard,
    backend,
  }) => {
    backend.youtubeOEmbed = { title: 'Canción Suelta [Lyric Video]', author_name: 'Artista MockVEVO' };
    await openEditorWith(page, setClipboard, YOUTUBE_TRACK.url);
    await expect(page.getByText('Canción Suelta', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Artista Mock', { exact: true }).first()).toBeVisible();
  });

  test('encuentra el link dentro de un texto compartido y lo limpia', async ({ page, setClipboard }) => {
    // The Spotify mock only knows the link without `?si=`: the app has to strip it.
    await openEditorWith(page, setClipboard, `Escucha esto 🎧 ${SPOTIFY_TRACK.url}?si=abc123 está buenazo`);
    await expect(page.getByText(SPOTIFY_TRACK.title, { exact: true }).first()).toBeVisible();
  });
});

const isLogout = (c: { method: string; path: string }) =>
  c.method === 'POST' && c.path.includes('/auth/v1/logout');
const isDeleteAccount = (c: { path: string }) => c.path.endsWith('/functions/v1/delete-account');

test.describe('Cuenta', () => {
  test.beforeEach(async ({ signedIn, page }) => {
    // The music source picked during onboarding is this person's data too.
    await signedIn({ preferredSource: 'spotify' });
    await page.getByRole('button', { name: 'Tu cuenta' }).click();
  });

  test('muestra los datos del usuario y su plan', async ({ page }) => {
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByText('Ana Prueba')).toBeVisible();
    await expect(sheet.getByText('ana@shory.test')).toBeVisible();
    await expect(sheet.getByText('Conectado con email')).toBeVisible();
    await expect(sheet.getByText('Plan gratis')).toBeVisible();
    // Restoring purchases only exists where the store does (iOS).
    await expect(sheet.getByRole('button', { name: 'Restaurar compras' })).toHaveCount(0);
  });

  test('se cierra con el botón Cerrar', async ({ page }) => {
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('button', PASTE)).toBeVisible();
  });

  test('los enlaces legales abren privacidad y términos', async ({ page }) => {
    const privacy = page.waitForEvent('popup');
    await page.getByRole('dialog').getByRole('link', { name: 'Privacidad' }).click();
    await expect(await privacy).toHaveURL('https://shory.test/privacy');

    const terms = page.waitForEvent('popup');
    await page.getByRole('dialog').getByRole('link', { name: 'Términos' }).click();
    await expect(await terms).toHaveURL('https://shory.test/terms');
  });

  test('cerrar sesión vuelve a la bienvenida, borra la sesión y no vuelve tras recargar', async ({
    page,
    backend,
  }) => {
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible();
    expect(backend.calls.some(isLogout)).toBe(true);
    expect(await storedSession(page)).toBeNull();
    // The next person on this device starts onboarding without it.
    expect(await storedPreferredSource(page)).toBeNull();

    await page.reload();
    await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible({ timeout: 30_000 });
  });

  test('eliminar cuenta pide confirmación y borra la cuenta', async ({ page, backend }) => {
    // The browser's own confirm (react-native-web's Alert is a no-op). The click only returns once
    // the dialog is handled, so it's answered from the listener.
    let confirm: { type: string; message: string } | null = null;
    page.once('dialog', (dialog) => {
      confirm = { type: dialog.type(), message: dialog.message() };
      return dialog.accept();
    });
    await page.getByRole('button', { name: 'Eliminar cuenta' }).click();
    expect(confirm).toMatchObject({ type: 'confirm', message: expect.stringContaining(DELETE_CONFIRM) });

    await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible();
    const deletes = backend.calls.filter(isDeleteAccount);
    expect(deletes).toHaveLength(1);
    expect(deletes[0].method).toBe('POST');
    expect(deletes[0].body).toEqual({});
    expect(await storedSession(page)).toBeNull();
    expect(await storedPreferredSource(page)).toBeNull();
  });

  test('cancelar la confirmación no elimina nada', async ({ page, backend }) => {
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'Eliminar cuenta' }).click();
    // The sheet stays open and usable once the dialog is gone.
    await expect(page.getByRole('dialog').getByText('ana@shory.test')).toBeVisible();
    expect(await storedPreferredSource(page)).toBe('spotify');

    // A later round-trip to the server: a delete started by the dismissed dialog would have been
    // sent before it.
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible();
    const logout = backend.calls.findIndex(isLogout);
    expect(logout).toBeGreaterThanOrEqual(0);
    expect(backend.calls.slice(0, logout).some(isDeleteAccount)).toBe(false);
  });

  test('si el servidor no puede eliminarla lo explica y sigue con la sesión', async ({ page, backend }) => {
    backend.deleteAccountStatus = 500;
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Eliminar cuenta' }).click();
    await expect(page.getByRole('dialog').getByText(/^No se pudo eliminar la cuenta: /)).toBeVisible();
    expect(backend.calls.some(isDeleteAccount)).toBe(true);
    expect(await storedSession(page)).not.toBeNull();
    expect(await storedPreferredSource(page)).toBe('spotify');
  });
});

test.describe('Cuenta con Apple', () => {
  test('en web no se puede eliminar: pide hacerlo desde un iPhone y no llama al servidor', async ({
    page,
    signedIn,
    backend,
  }) => {
    await signedIn({ user: { provider: 'apple' } });
    await page.getByRole('button', { name: 'Tu cuenta' }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Eliminar cuenta' }).click();
    await expect(
      page
        .getByRole('dialog')
        .getByText(
          'No se pudo eliminar la cuenta: Tu cuenta está vinculada con Apple. Elimínala desde la app en un iPhone.',
          { exact: true },
        ),
    ).toBeVisible();
    expect(backend.calls.some(isDeleteAccount)).toBe(false);
  });
});

test.describe('Sesión vencida con conexión', () => {
  const refreshes = (calls: { path: string; body: unknown }[]) =>
    calls.filter((c) => c.path.includes('/auth/v1/token') && c.path.includes('grant_type=refresh_token'));

  test('al abrir la renueva, entra a Home y guarda el token nuevo', async ({ page, signedIn, backend }) => {
    await signedIn({ expired: true, preferredSource: 'spotify' });
    const sent = refreshes(backend.calls);
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toEqual({ refresh_token: `e2e-refresh-${backend.user.id}-0` });

    await expect
      .poll(async () => JSON.parse((await storedSession(page)) ?? '{}').access_token)
      .toBe(`e2e-access-${backend.user.id}-1`);
    const stored = JSON.parse((await storedSession(page))!);
    expect(stored.refresh_token).toBe(`e2e-refresh-${backend.user.id}-1`);
    expect(stored.expires_at * 1000).toBeGreaterThan(Date.now());
    expect(await storedPreferredSource(page)).toBe('spotify');
  });

  test('si el servidor revocó la sesión vuelve a la bienvenida y borra los datos locales', async ({
    page,
    seedSession,
    signedOut,
    backend,
  }) => {
    backend.refreshError = {
      status: 400,
      code: 'refresh_token_not_found',
      message: 'Invalid Refresh Token: Refresh Token Not Found',
    };
    await seedSession({ expired: true, preferredSource: 'spotify' });
    await signedOut();
    expect(refreshes(backend.calls)).toHaveLength(1);
    await expect.poll(() => storedSession(page)).toBeNull();
    await expect.poll(() => storedPreferredSource(page)).toBeNull();
  });
});

test.describe('Sin conexión y con el token vencido', () => {
  // supabase-js retries the refresh with backoff before giving up (about 30 s).
  test.setTimeout(120_000);

  const OFFLINE_PATHS = ['**/auth/v1/token**', '**/auth/v1/logout**'];
  const offline = (route: Route) => route.abort('internetdisconnected');

  test.beforeEach(async ({ page, signedIn }) => {
    for (const path of OFFLINE_PATHS) await page.context().route(path, offline);
    // Opens on Home from the stored session instead of the welcome screen.
    await signedIn({ expired: true });
  });

  test('cerrar sesión igual la borra del dispositivo', async ({ page }) => {
    await page.getByRole('button', { name: 'Tu cuenta' }).click();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible({ timeout: 90_000 });
    expect(await storedSession(page)).toBeNull();

    // Back online, nothing is left to refresh the person back in.
    for (const path of OFFLINE_PATHS) await page.context().unroute(path, offline);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible({ timeout: 30_000 });
  });
});
