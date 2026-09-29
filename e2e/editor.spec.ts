import type { Locator, Page } from '@playwright/test';
import { SPOTIFY_TRACK } from './support/mocks';
import { expect, openEditorWith, test } from './support/fixtures';

const tool = (page: Page, name: 'Widgets' | 'Ajustes' | 'Plantillas') =>
  page.getByRole('button', { name, exact: true });

const paywall = (page: Page) => page.getByRole('dialog').filter({ hasText: 'Tus historias, sin límites.' });

// The default Player widget shows the time left of the 3:21 song at 42%.
const PLAYER_TIME_LEFT = '–1:57';

async function closePaywall(page: Page) {
  await paywall(page).getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(paywall(page)).toBeHidden();
}

// The story's own background gradient (the tray swatches use other ids).
const storyGradient = (page: Page) => page.locator('#story-background');

async function topColor(gradient: Locator) {
  return (await gradient.locator('stop').first().getAttribute('stop-color'))?.toUpperCase();
}

// A solid-color PNG made by the browser, to pick as a photo.
async function solidPng(page: Page, color: string): Promise<Buffer> {
  const dataUrl = await page.evaluate((fill) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    context.fillStyle = fill;
    context.fillRect(0, 0, 64, 64);
    return canvas.toDataURL('image/png');
  }, color);
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

test.describe('Editor', () => {
  test.beforeEach(async ({ page, signedIn, setClipboard }) => {
    await signedIn();
    await openEditorWith(page, setClipboard, SPOTIFY_TRACK.url);
  });

  test('muestra la canción en el player y las herramientas', async ({ page }) => {
    await expect(page.getByText(SPOTIFY_TRACK.title, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(SPOTIFY_TRACK.artist, { exact: true }).first()).toBeVisible();
    for (const name of ['Widgets', 'Ajustes', 'Plantillas'] as const) {
      await expect(tool(page, name)).toBeVisible();
      await expect(tool(page, name)).toHaveAttribute('aria-expanded', 'false');
    }
    await expect(page.getByRole('button', { name: 'Cambiar fondo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compartir en Instagram Stories' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar en Fotos' })).toBeVisible();
    // Web can't record video, so there's no Foto/Video choice.
    await expect(page.getByRole('tablist')).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Video' })).toHaveCount(0);
  });

  test('cerrar vuelve a Home', async ({ page }) => {
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pegar link de una canción' })).toBeVisible();
  });

  test('cada herramienta indica si su bandeja está abierta', async ({ page }) => {
    await tool(page, 'Ajustes').click();
    await expect(tool(page, 'Ajustes')).toHaveAttribute('aria-expanded', 'true');
    await expect(tool(page, 'Widgets')).toHaveAttribute('aria-expanded', 'false');
    await tool(page, 'Widgets').click();
    await expect(tool(page, 'Widgets')).toHaveAttribute('aria-expanded', 'true');
    await expect(tool(page, 'Ajustes')).toHaveAttribute('aria-expanded', 'false');
    await tool(page, 'Widgets').click();
    await expect(tool(page, 'Widgets')).toHaveAttribute('aria-expanded', 'false');
  });

  test.describe('Widgets', () => {
    test('lista los widgets, marca el elegido y nombra los Pro', async ({ page }) => {
      await tool(page, 'Widgets').click();
      const player = page.getByRole('button', { name: 'Widget Player', exact: true });
      const airpods = page.getByRole('button', { name: 'Widget Isla: AirPods', exact: true });
      const run = page.getByRole('button', { name: 'Widget Resumen de carrera, función Pro', exact: true });
      await expect(player).toHaveAttribute('aria-selected', 'true');
      await expect(airpods).toHaveAttribute('aria-selected', 'false');
      await expect(run).toContainText('PRO');
      await expect(player).not.toContainText('PRO');
      await expect(
        page.getByRole('button', { name: 'Widget Clima, función Pro', exact: true }),
      ).toBeVisible();
    });

    test('elegir un widget gratis lo pone en la historia', async ({ page }) => {
      await tool(page, 'Widgets').click();
      await page.getByRole('button', { name: 'Widget Isla: AirPods', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Widget Isla: AirPods', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await tool(page, 'Widgets').click();
      await expect(page.getByRole('button', { name: 'Widget Isla: AirPods', exact: true })).toBeHidden();
      // The AirPods island says "Conectado"; the player's timeline is gone from the story.
      await expect(page.getByText('Conectado', { exact: true })).toBeVisible();
      await expect(page.getByText(PLAYER_TIME_LEFT)).toBeHidden();
    });

    test('un widget Pro abre el paywall y no cambia el widget', async ({ page }) => {
      await tool(page, 'Widgets').click();
      await page.getByRole('button', { name: 'Widget Clima, función Pro', exact: true }).click();
      await expect(paywall(page)).toBeVisible();
      await expect(
        paywall(page).getByText('Desbloquea el clima y el fútbol con datos reales.'),
      ).toBeVisible();
      await closePaywall(page);
      await expect(page.getByRole('button', { name: 'Widget Player', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await tool(page, 'Widgets').click();
      await expect(page.getByText(PLAYER_TIME_LEFT)).toBeVisible();
    });

    test('la biblioteca filtra por categoría y aplica el widget elegido', async ({ page }) => {
      await tool(page, 'Widgets').click();
      await page.getByRole('button', { name: 'Abrir biblioteca' }).click();
      const library = page.getByRole('dialog');
      await expect(library.getByText('9 widgets para tu historia')).toBeVisible();

      const fitness = library.getByRole('button', { name: 'Fitness', exact: true });
      await fitness.click();
      await expect(fitness).toHaveAttribute('aria-selected', 'true');
      await expect(
        library.getByRole('button', { name: 'Widget Resumen de carrera, función Pro', exact: true }),
      ).toBeVisible();
      await expect(library.getByRole('button', { name: 'Widget Player', exact: true })).toBeHidden();

      await library.getByRole('button', { name: 'Dynamic Island', exact: true }).click();
      await expect(fitness).toHaveAttribute('aria-selected', 'false');
      await expect(
        library.getByRole('button', { name: 'Widget Resumen de carrera, función Pro', exact: true }),
      ).toBeHidden();
      await library.getByRole('button', { name: 'Widget Isla: AirPods', exact: true }).click();
      await expect(library).toBeHidden();

      // The widget tray is still open, and its AirPods preview also says "Conectado": close it so
      // only the story is left.
      await tool(page, 'Widgets').click();
      await expect(page.getByRole('button', { name: 'Widget Isla: AirPods', exact: true })).toBeHidden();
      await expect(page.getByText('Conectado', { exact: true })).toBeVisible();
      await expect(page.getByText(PLAYER_TIME_LEFT)).toBeHidden();
    });

    test('un widget sin opciones lo dice en Ajustes', async ({ page }) => {
      await tool(page, 'Widgets').click();
      await page.getByRole('button', { name: 'Widget Isla: música', exact: true }).click();
      await tool(page, 'Ajustes').click();
      await expect(page.getByText('Este widget no tiene ajustes.')).toBeVisible();
      await expect(page.getByRole('tablist')).toHaveCount(0);
    });
  });

  test.describe('Plantillas', () => {
    test('una plantilla gratis reemplaza al widget y "Sin plantilla" lo devuelve', async ({ page }) => {
      await tool(page, 'Plantillas').click();
      await page.getByRole('button', { name: 'Plantilla Reproductor verde', exact: true }).click();
      await tool(page, 'Plantillas').click();
      await expect(
        page.getByRole('button', { name: 'Plantilla Reproductor verde', exact: true }),
      ).toBeHidden();
      await expect(page.getByText('REPRODUCIENDO DESDE SHORY')).toBeVisible();
      await expect(page.getByText('AirPods Pro de Ana Prueba')).toBeVisible();

      await tool(page, 'Plantillas').click();
      await page.getByRole('button', { name: 'Sin plantilla' }).click();
      await tool(page, 'Plantillas').click();
      await expect(page.getByText('REPRODUCIENDO DESDE SHORY')).toBeHidden();
      await expect(page.getByText(PLAYER_TIME_LEFT)).toBeVisible();
    });

    test('una plantilla Pro abre el paywall y no se aplica', async ({ page }) => {
      await tool(page, 'Plantillas').click();
      await page
        .getByRole('button', { name: 'Plantilla Reproductor clásico, función Pro', exact: true })
        .click();
      await expect(paywall(page).getByText('Desbloquea todas las plantillas.')).toBeVisible();
      await closePaywall(page);
      await tool(page, 'Plantillas').click();
      await expect(
        page.getByRole('button', { name: 'Plantilla Reproductor clásico, función Pro', exact: true }),
      ).toBeHidden();
      // The default widget is still what the story shows.
      await expect(page.getByText(PLAYER_TIME_LEFT)).toBeVisible();
    });
  });

  test.describe('Ajustes', () => {
    test.beforeEach(async ({ page }) => {
      await tool(page, 'Ajustes').click();
    });

    test('tiene pestañas de estilo, dispositivo, progreso y mostrar', async ({ page }) => {
      await expect(page.getByRole('tab', { name: 'Estilo' })).toHaveAttribute('aria-selected', 'true');
      for (const tone of ['Liquid glass', 'Negro', 'Blanco', 'Canción']) {
        await expect(page.getByRole('button', { name: tone, exact: true })).toBeVisible();
      }
      await page.getByRole('tab', { name: 'Dispositivo' }).click();
      await expect(page.getByRole('tab', { name: 'Dispositivo' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('tab', { name: 'Estilo' })).toHaveAttribute('aria-selected', 'false');
      await expect(page.getByRole('button', { name: 'Dispositivo de audio: AirPods Max' })).toBeVisible();
      await page.getByRole('tab', { name: 'Progreso' }).click();
      await expect(page.getByRole('slider', { name: 'Posición de la canción' })).toBeVisible();
      await page.getByRole('tab', { name: 'Mostrar' }).click();
      await expect(page.getByRole('switch', { name: 'Carátula' })).toBeVisible();
      await expect(page.getByRole('switch', { name: 'Tiempos' })).toBeVisible();
    });

    test('elegir un estilo lo marca como elegido', async ({ page }) => {
      const glass = page.getByRole('button', { name: 'Liquid glass', exact: true });
      const black = page.getByRole('button', { name: 'Negro', exact: true });
      await expect(glass).toHaveAttribute('aria-selected', 'true');
      await black.click();
      await expect(black).toHaveAttribute('aria-selected', 'true');
      await expect(glass).toHaveAttribute('aria-selected', 'false');
    });

    test('ocultar los tiempos los quita del player', async ({ page }) => {
      await page.getByRole('tab', { name: 'Mostrar' }).click();
      const times = page.getByRole('switch', { name: 'Tiempos' });
      await expect(times).toBeChecked();
      await expect(page.getByText(PLAYER_TIME_LEFT)).toBeVisible();
      await times.click();
      await expect(times).not.toBeChecked();
      await expect(page.getByText(PLAYER_TIME_LEFT)).toBeHidden();
      await times.click();
      await expect(times).toBeChecked();
      await expect(page.getByText(PLAYER_TIME_LEFT)).toBeVisible();
    });

    test('tocar la barra de progreso mueve el tiempo a esa posición', async ({ page }) => {
      await page.getByRole('tab', { name: 'Progreso' }).click();
      const slider = page.getByRole('slider', { name: 'Posición de la canción' });
      await expect(slider).toHaveAttribute('aria-valuenow', '42');
      const box = (await slider.boundingBox())!;
      await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2);
      // Near the end (the thumb's width shifts it a little): 10-20 s of the 3:21 song are left.
      await expect(page.getByText(/^–0:[0-2]\d$/)).toBeVisible();
      await expect(page.getByText(/^–\d:\d\d$/)).toHaveCount(1);
      const now = Number(await slider.getAttribute('aria-valuenow'));
      expect(now).toBeGreaterThanOrEqual(88);
      expect(now).toBeLessThan(100);
    });

    test('la barra de progreso también se mueve con el teclado', async ({ page }) => {
      await page.getByRole('tab', { name: 'Progreso' }).click();
      const slider = page.getByRole('slider', { name: 'Posición de la canción' });
      await slider.focus();
      await page.keyboard.press('End');
      await expect(slider).toHaveAttribute('aria-valuenow', '100');
      await expect(page.getByText('–0:00', { exact: true })).toBeVisible();
      await page.keyboard.press('Home');
      await expect(slider).toHaveAttribute('aria-valuenow', '0');
      await expect(page.getByText('–3:21', { exact: true })).toBeVisible();
      await page.keyboard.press('ArrowRight');
      await expect(slider).toHaveAttribute('aria-valuenow', '5');
    });
  });

  test.describe('Fondo', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Cambiar fondo' }).click();
    });

    test('ofrece galería, cámara, colores de la carátula y fondos', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Cambiar fondo' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      await expect(page.getByRole('button', { name: 'Elegir de la galería' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Tomar foto' })).toBeVisible();
      // Video backgrounds need the native recorder.
      await expect(page.getByRole('button', { name: 'Subir un video' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Color 1 de tu imagen', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Color automático' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      for (const preset of ['Noche', 'Atardecer', 'Océano', 'Menta', 'Arena', 'Chicle', 'Lima', 'Papel']) {
        await expect(page.getByRole('button', { name: `Fondo ${preset}`, exact: true })).toBeVisible();
      }
    });

    test('elegir un fondo o un color cambia el fondo de la historia', async ({ page }) => {
      await expect(storyGradient(page)).toHaveCount(1);
      const auto = await topColor(storyGradient(page));
      const ocean = page.getByRole('button', { name: 'Fondo Océano', exact: true });
      await ocean.click();
      await expect.poll(() => topColor(storyGradient(page))).toBe('#3CC8F4');
      await expect(ocean).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('button', { name: 'Color automático' })).toHaveAttribute(
        'aria-selected',
        'false',
      );

      await page.getByRole('button', { name: 'Fondo Lima', exact: true }).click();
      await expect.poll(() => topColor(storyGradient(page))).not.toBe('#3CC8F4');
      await expect(ocean).toHaveAttribute('aria-selected', 'false');

      await page.getByRole('button', { name: 'Color automático' }).click();
      await expect.poll(() => topColor(storyGradient(page))).toBe(auto);
    });

    test('el selector de color aplica el color elegido', async ({ page }) => {
      await page.getByRole('button', { name: 'Elegir color' }).click();
      const picker = page.getByRole('dialog');
      await expect(picker.getByRole('heading', { name: 'Elige un color' })).toBeVisible();
      const hex = picker.getByText(/^#[0-9A-F]{6}$/);
      const before = await hex.textContent();
      await picker.getByRole('button', { name: 'Sorpréndeme' }).click();
      await expect(hex).not.toHaveText(before!);
      const chosen = (await hex.textContent())!;
      await picker.getByRole('button', { name: 'Usar este color' }).click();
      await expect(picker).toBeHidden();

      // The story and the new "Tu color" swatch both start from the chosen color.
      await expect.poll(() => topColor(storyGradient(page))).toBe(chosen);
      const swatch = page.getByRole('button', { name: 'Tu color', exact: true });
      await expect(swatch).toHaveAttribute('aria-selected', 'true');
      expect(await topColor(swatch)).toBe(chosen);
    });

    test('elegir una foto la pone de fondo, cierra la bandeja y ofrece sus colores', async ({ page }) => {
      const photo = await solidPng(page, '#E0102A');
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Elegir de la galería' }).click();
      await (await chooser).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: photo });

      await expect(page.getByRole('button', { name: 'Elegir de la galería' })).toBeHidden();
      // The photo replaces the gradient.
      await expect(storyGradient(page)).toHaveCount(0);

      // The photo's color comes first among the Magic colors.
      await page.getByRole('button', { name: 'Cambiar fondo' }).click();
      const first = page.getByRole('button', { name: 'Color 1 de tu imagen', exact: true });
      await expect.poll(async () => (await topColor(first)) ?? '').toMatch(/^#E[0-9A-F]1[0-9A-F]2[0-9A-F]$/);
      // No gradient swatch is the current background any more.
      await expect(page.getByRole('button', { name: 'Color automático' })).toHaveAttribute(
        'aria-selected',
        'false',
      );
    });

    test('cancelar la galería deja el fondo igual y se puede volver a elegir', async ({ page }) => {
      const gallery = page.getByRole('button', { name: 'Elegir de la galería' });
      const before = await topColor(storyGradient(page));
      const chooser = page.waitForEvent('filechooser');
      await gallery.click();
      await (await chooser).setFiles([]);
      // Still open, still the same gradient.
      await expect(gallery).toBeVisible();
      await expect(page.getByRole('button', { name: 'Color automático' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(await topColor(storyGradient(page))).toBe(before);

      // The cancelled pick settled: the gallery opens again and a photo applies.
      const photo = await solidPng(page, '#E0102A');
      const again = page.waitForEvent('filechooser');
      await gallery.click();
      await (await again).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: photo });
      await expect(gallery).toBeHidden();
      await expect(storyGradient(page)).toHaveCount(0);
    });
  });

  test.describe('Paywall', () => {
    test('en web no hay compras: explica por qué y desactiva suscribirse', async ({ page }) => {
      await tool(page, 'Widgets').click();
      await page.getByRole('button', { name: 'Widget Clima, función Pro', exact: true }).click();
      const dialog = paywall(page);
      for (const benefit of [
        'Video 4K y fondos de video',
        'Clima y fútbol en tiempo real',
        'Todas las plantillas',
        'Sin marca de agua',
      ]) {
        await expect(dialog.getByText(benefit)).toBeVisible();
      }
      await expect(
        dialog.getByText('Las compras no están disponibles en este momento. Inténtalo más tarde.'),
      ).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Suscribirme' })).toBeDisabled();
      // Nothing to restore without a store.
      await expect(dialog.getByRole('button', { name: 'Restaurar compras' })).toHaveCount(0);
      await closePaywall(page);
    });
  });

  test.describe('Exportar', () => {
    test('guardar en web avisa que solo funciona en iOS/Android', async ({ page }) => {
      await page.getByRole('button', { name: 'Guardar en Fotos' }).click();
      await expect(page.getByText('La captura solo funciona en iOS/Android.')).toBeVisible();
    });

    test('compartir va directo a Instagram y en web avisa que la captura no está disponible', async ({ page }) => {
      await page.getByRole('button', { name: 'Compartir en Instagram Stories' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByText('La captura solo funciona en iOS/Android.')).toBeVisible();
    });
  });
});
