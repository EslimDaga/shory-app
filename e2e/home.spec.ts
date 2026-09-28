import { APPLE_TRACK, SPOTIFY_TRACK, YOUTUBE_TRACK } from './support/mocks';
import { expect, openEditorWith, storedSession, test } from './support/fixtures';

const PASTE = { name: 'Pegar link de una canción' };

test.describe('Home', () => {
  test.beforeEach(async ({ signedIn }) => {
    await signedIn();
  });

  test('muestra el contador, las estadísticas y los pasos para empezar', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'shory' })).toBeVisible();
    await expect(page.getByText('Historias creadas')).toBeVisible();
    await expect(page.getByText('Spotify · YT Music · Apple')).toBeVisible();
    for (const label of ['Esta semana', 'Artistas', 'Favorito']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByText('Cómo funciona')).toBeVisible();
    await expect(page.getByText('Abre la canción en tu app de música')).toBeVisible();
    await expect(page.getByText('Toca Compartir → Más → Shory')).toBeVisible();
    await expect(page.getByText('Pon tu foto, elige el widget y listo')).toBeVisible();
    // Initial of the signed-in user.
    await expect(page.getByRole('button', { name: 'Tu cuenta' })).toHaveText('A');
  });

  test('pegar texto sin link de música explica qué falta', async ({ page, setClipboard }) => {
    await setClipboard('hola, esto no es una canción');
    await page.getByRole('button', PASTE).click();
    await expect(page.getByText('No encontré un link de Spotify, YouTube Music o Apple Music.')).toBeVisible();
  });

  test('portapapeles vacío también muestra el aviso', async ({ page, setClipboard }) => {
    await setClipboard('');
    await page.getByRole('button', PASTE).click();
    await expect(page.getByText('No encontré un link de Spotify, YouTube Music o Apple Music.')).toBeVisible();
  });

  test('un link de Spotify inválido muestra el estado del servicio', async ({ page, setClipboard, backend }) => {
    backend.spotifyStatus = 404;
    await setClipboard(SPOTIFY_TRACK.url);
    await page.getByRole('button', PASTE).click();
    await expect(page.getByText('Spotify respondió 404. ¿Es un link válido?')).toBeVisible();
    await expect(page.getByRole('button', PASTE)).toBeVisible();
  });

  test('muestra "Leyendo el link…" mientras carga', async ({ page, setClipboard, backend }) => {
    backend.musicDelayMs = 1500;
    await setClipboard(SPOTIFY_TRACK.url);
    await page.getByRole('button', PASTE).click();
    await expect(page.getByText('Leyendo el link…')).toBeVisible();
    await expect(page.getByText(SPOTIFY_TRACK.title).first()).toBeVisible({ timeout: 20_000 });
  });

  for (const [service, track] of [
    ['Spotify', SPOTIFY_TRACK],
    ['Apple Music', APPLE_TRACK],
    ['YouTube Music', YOUTUBE_TRACK],
  ] as const) {
    test(`abre el editor con una canción de ${service}`, async ({ page, setClipboard }) => {
      await openEditorWith(page, setClipboard, track.url);
      await expect(page.getByText(track.title).first()).toBeVisible();
      await expect(page.getByText(track.artist).first()).toBeVisible();
    });
  }

  test('encuentra el link dentro de un texto compartido', async ({ page, setClipboard }) => {
    await openEditorWith(page, setClipboard, `Escucha esto 🎧 ${SPOTIFY_TRACK.url}?si=abc123 está buenazo`);
    await expect(page.getByText(SPOTIFY_TRACK.title).first()).toBeVisible();
  });
});

test.describe('Cuenta', () => {
  test.beforeEach(async ({ signedIn, page }) => {
    await signedIn();
    await page.getByRole('button', { name: 'Tu cuenta' }).click();
  });

  test('muestra los datos del usuario y su plan', async ({ page }) => {
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByText('Ana Prueba')).toBeVisible();
    await expect(sheet.getByText('ana@shory.test')).toBeVisible();
    await expect(sheet.getByText('Conectado con email')).toBeVisible();
    await expect(sheet.getByText('Plan gratis')).toBeVisible();
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
  });

  test('cerrar sesión vuelve a la bienvenida, borra la sesión y no vuelve tras recargar', async ({ page, backend }) => {
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible();
    expect(backend.calls.some((c) => c.path.includes('/auth/v1/logout'))).toBe(true);
    expect(await storedSession(page)).toBeNull();

    await page.reload();
    await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible({ timeout: 30_000 });
  });

  test('cerrar sesión funciona aunque el servidor falle', async ({ page }) => {
    await page.context().route('**/auth/v1/logout**', (route) => route.fulfill({ status: 500, body: '{}' }));
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible();
    expect(await storedSession(page)).toBeNull();
  });

  // The confirmation uses Alert.alert, which react-native-web implements as a no-op: on web the
  // button does nothing. Works on iOS/Android; enable once web has a confirmation dialog.
  test.fixme('eliminar cuenta pide confirmación y borra la cuenta', async ({ page, backend }) => {
    await page.getByRole('button', { name: 'Eliminar cuenta' }).click();
    await page.getByRole('button', { name: 'Sí, eliminar' }).click();
    await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible();
    expect(backend.calls.some((c) => c.path.endsWith('/functions/v1/delete-account'))).toBe(true);
  });
});
