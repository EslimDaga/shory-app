import { expect, storedPreferredSource, test } from './support/fixtures';

test.describe('Onboarding', () => {
  test.beforeEach(async ({ signedOut }) => {
    await signedOut();
  });

  test('la bienvenida muestra el titular, los enlaces legales y las dos entradas', async ({ page }) => {
    await expect(page.getByText('Bienvenido a Shory')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tu música, lista para tus historias.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Términos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Privacidad' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ya tengo una cuenta' })).toBeVisible();
  });

  test('los enlaces legales abren las páginas configuradas', async ({ page }) => {
    const terms = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Términos' }).click();
    await expect(await terms).toHaveURL('https://shory.test/terms');

    const privacy = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Privacidad' }).click();
    await expect(await privacy).toHaveURL('https://shory.test/privacy');
  });

  test('flujo completo: fuente → cómo funciona → crear cuenta, guardando la fuente elegida', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Empezar' }).click();

    await expect(page.getByRole('heading', { name: '¿Dónde escuchas música?' })).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
    for (const source of ['Spotify', 'YouTube Music', 'Apple Music', 'Uso varias']) {
      const row = page.getByRole('button', { name: source, exact: true });
      await expect(row).toBeVisible();
      await expect(row).toHaveAttribute('aria-selected', 'false');
    }
    await page.getByRole('button', { name: 'Apple Music', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Así de fácil' })).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');
    await expect.poll(() => storedPreferredSource(page)).toBe('apple-music');
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar con email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  });

  test('"Saltar" avanza sin guardar una fuente', async ({ page }) => {
    await page.getByRole('button', { name: 'Empezar' }).click();
    await page.getByRole('button', { name: 'Saltar' }).click();
    await expect(page.getByRole('heading', { name: 'Así de fácil' })).toBeVisible();
    expect(await storedPreferredSource(page)).toBeNull();
  });

  for (const choice of ['Saltar', 'Uso varias']) {
    test(`"${choice}" después de volver borra la fuente elegida antes`, async ({ page }) => {
      await page.getByRole('button', { name: 'Empezar' }).click();
      await page.getByRole('button', { name: 'Spotify', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Así de fácil' })).toBeVisible();
      await expect.poll(() => storedPreferredSource(page)).toBe('spotify');

      await page.getByRole('button', { name: 'Atrás' }).click();
      await page.getByRole('button', { name: choice, exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Así de fácil' })).toBeVisible();
      // The removal is async.
      await expect.poll(() => storedPreferredSource(page)).toBeNull();
    });
  }

  test('"Atrás" regresa paso a paso hasta la bienvenida', async ({ page }) => {
    await page.getByRole('button', { name: 'Empezar' }).click();
    await page.getByRole('button', { name: 'Spotify', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Así de fácil' })).toBeVisible();

    await page.getByRole('button', { name: 'Atrás' }).click();
    await expect(page.getByRole('heading', { name: '¿Dónde escuchas música?' })).toBeVisible();
    // Going back keeps the previous choice, stored and shown.
    expect(await storedPreferredSource(page)).toBe('spotify');
    await expect(page.getByRole('button', { name: 'Spotify', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Apple Music', exact: true })).toHaveAttribute(
      'aria-selected',
      'false',
    );

    await page.getByRole('button', { name: 'Atrás' }).click();
    await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible();
  });

  test('"Ya tengo una cuenta" va directo al login', async ({ page }) => {
    await page.getByRole('button', { name: 'Ya tengo una cuenta' }).click();
    await expect(page.getByRole('heading', { name: 'Hola de nuevo' })).toBeVisible();
    await page.getByRole('button', { name: 'Atrás' }).click();
    await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible();
  });

  test('Google sin configurar muestra un error claro en vez de fallar en silencio', async ({ page }) => {
    await page.getByRole('button', { name: 'Ya tengo una cuenta' }).click();
    await page.getByRole('button', { name: 'Continuar con Google' }).click();
    await expect(page.getByText('Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en .env.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hola de nuevo' })).toBeVisible();
  });
});
