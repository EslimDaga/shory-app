import type { Page } from '@playwright/test';
import { SPOTIFY_TRACK } from './support/mocks';
import { expect, openEditorWith, test } from './support/fixtures';

const tool = (page: Page, name: 'Widgets' | 'Ajustes' | 'Plantillas') =>
  page.getByRole('button', { name, exact: true });

const paywall = (page: Page) => page.getByRole('dialog').filter({ hasText: 'Tus historias, sin límites.' });

async function closePaywall(page: Page) {
  await paywall(page).getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(paywall(page)).toBeHidden();
}

test.describe('Editor', () => {
  test.beforeEach(async ({ page, signedIn, setClipboard }) => {
    await signedIn();
    await openEditorWith(page, setClipboard, SPOTIFY_TRACK.url);
  });

  test('muestra la canción en el player y las herramientas', async ({ page }) => {
    await expect(page.getByText(SPOTIFY_TRACK.title).first()).toBeVisible();
    await expect(page.getByText(SPOTIFY_TRACK.artist).first()).toBeVisible();
    for (const name of ['Widgets', 'Ajustes', 'Plantillas'] as const) await expect(tool(page, name)).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Foto' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Video' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cambiar fondo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compartir en Instagram Stories' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar en Fotos' })).toBeVisible();
  });

  test('cerrar vuelve a Home', async ({ page }) => {
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pegar link de una canción' })).toBeVisible();
  });

  test.describe('Widgets', () => {
    test('lista los widgets y marca los Pro', async ({ page }) => {
      await tool(page, 'Widgets').click();
      await expect(page.getByRole('button', { name: 'Widget Player' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Widget Isla: AirPods' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Widget Pasos' })).toContainText('PRO');
      await expect(page.getByRole('button', { name: 'Widget Player' })).not.toContainText('PRO');
    });

    test('elegir un widget gratis lo pone en la historia', async ({ page }) => {
      await tool(page, 'Widgets').click();
      await page.getByRole('button', { name: 'Widget Isla: AirPods' }).click();
      await tool(page, 'Widgets').click();
      await expect(page.getByRole('button', { name: 'Widget Isla: AirPods' })).toBeHidden();
      // The AirPods island says "Conectado"; the player's timeline is gone from the story.
      await expect(page.getByText('Conectado', { exact: true })).toBeVisible();
      await expect(page.getByText('–1:57')).toBeHidden();
    });

    test('un widget Pro abre el paywall y no cambia el widget', async ({ page }) => {
      await tool(page, 'Widgets').click();
      await page.getByRole('button', { name: 'Widget Clima', exact: true }).click();
      await expect(paywall(page)).toBeVisible();
      await expect(paywall(page).getByText('Desbloquea el clima y el fútbol con datos reales.')).toBeVisible();
      await closePaywall(page);
      await tool(page, 'Widgets').click();
      await expect(page.getByText('–1:57')).toBeVisible();
    });

    test('la biblioteca filtra por categoría y aplica el widget elegido', async ({ page }) => {
      await tool(page, 'Widgets').click();
      await page.getByRole('button', { name: 'Abrir biblioteca' }).click();
      const library = page.getByRole('dialog');
      await expect(library.getByText('21 widgets para tu historia')).toBeVisible();

      await library.getByRole('button', { name: 'Fitness', exact: true }).click();
      await expect(library.getByRole('button', { name: 'Widget Pasos' })).toBeVisible();
      await expect(library.getByRole('button', { name: 'Widget Player' })).toBeHidden();

      await library.getByRole('button', { name: 'Dynamic Island', exact: true }).click();
      await expect(library.getByRole('button', { name: 'Widget Pasos' })).toBeHidden();
      await library.getByRole('button', { name: 'Widget Isla: AirPods' }).click();

      await expect(library).toBeHidden();
      await expect(page.getByText('Conectado', { exact: true }).first()).toBeVisible();
    });
  });

  test.describe('Plantillas', () => {
    test('una plantilla gratis reemplaza al widget y "Sin plantilla" lo devuelve', async ({ page }) => {
      await tool(page, 'Plantillas').click();
      await page.getByRole('button', { name: 'Plantilla Reproductor verde' }).click();
      await tool(page, 'Plantillas').click();
      await expect(page.getByRole('button', { name: 'Plantilla Reproductor verde' })).toBeHidden();
      await expect(page.getByText('REPRODUCIENDO DESDE SHORY')).toBeVisible();
      await expect(page.getByText('AirPods Pro de Ana Prueba')).toBeVisible();

      await tool(page, 'Plantillas').click();
      await page.getByRole('button', { name: 'Sin plantilla' }).click();
      await tool(page, 'Plantillas').click();
      await expect(page.getByText('REPRODUCIENDO DESDE SHORY')).toBeHidden();
      await expect(page.getByText('–1:57')).toBeVisible();
    });

    test('una plantilla Pro abre el paywall', async ({ page }) => {
      await tool(page, 'Plantillas').click();
      await page.getByRole('button', { name: 'Plantilla Reproductor clásico' }).click();
      await expect(paywall(page).getByText('Desbloquea todas las plantillas.')).toBeVisible();
      await closePaywall(page);
    });
  });

  test.describe('Ajustes', () => {
    test.beforeEach(async ({ page }) => {
      await tool(page, 'Ajustes').click();
    });

    test('tiene pestañas de estilo, dispositivo, progreso y mostrar', async ({ page }) => {
      for (const tone of ['Liquid glass', 'Negro', 'Blanco', 'Canción']) {
        await expect(page.getByRole('button', { name: tone, exact: true })).toBeVisible();
      }
      await page.getByRole('tab', { name: 'Dispositivo' }).click();
      await expect(page.getByRole('button', { name: 'Dispositivo de audio: AirPods Max' })).toBeVisible();
      await page.getByRole('tab', { name: 'Progreso' }).click();
      await expect(page.getByRole('slider', { name: 'Posición de la canción' })).toBeVisible();
      await page.getByRole('tab', { name: 'Mostrar' }).click();
      await expect(page.getByRole('switch', { name: 'Carátula' })).toBeVisible();
      await expect(page.getByRole('switch', { name: 'Tiempos' })).toBeVisible();
    });

    test('ocultar los tiempos los quita del player', async ({ page }) => {
      await page.getByRole('tab', { name: 'Mostrar' }).click();
      // react-native-web drops accessibilityState, so the switch has no aria-checked: the effect on
      // the story is what's checked.
      const times = page.getByRole('switch', { name: 'Tiempos' });
      await expect(page.getByText('–1:57')).toBeVisible();
      await times.click();
      await expect(page.getByText('–1:57')).toBeHidden();
      await times.click();
      await expect(page.getByText('–1:57')).toBeVisible();
    });

    test('mover el progreso cambia el tiempo mostrado', async ({ page }) => {
      await page.getByRole('tab', { name: 'Progreso' }).click();
      const slider = page.getByRole('slider', { name: 'Posición de la canción' });
      const before = await page.getByText(/^–\d:\d\d$/).first().textContent();
      const box = (await slider.boundingBox())!;
      await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2);
      await expect(page.getByText(/^–\d:\d\d$/).first()).not.toHaveText(before!);
    });
  });

  test.describe('Fondo', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Cambiar fondo' }).click();
    });

    test('ofrece galería, cámara, video, colores de la carátula y fondos', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Elegir de la galería' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Tomar foto' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Subir un video' })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Color de tu imagen #/ }).first()).toBeVisible();
      for (const preset of ['night', 'sunset', 'ocean', 'mint', 'sand', 'bubblegum', 'lime', 'paper']) {
        await expect(page.getByRole('button', { name: `Fondo ${preset}` })).toBeVisible();
      }
    });

    test('elegir un fondo o un color cambia el fondo de la historia', async ({ page }) => {
      // A patch of the story background, clear of the widget and the tool rail.
      const patch = async () => {
        await page.waitForTimeout(400);
        return page.screenshot({ clip: { x: 60, y: 150, width: 40, height: 40 }, animations: 'disabled' });
      };
      const auto = await patch();
      await page.getByRole('button', { name: 'Fondo ocean' }).click();
      const ocean = await patch();
      expect(ocean.equals(auto)).toBe(false);
      await page.getByRole('button', { name: 'Fondo lime' }).click();
      expect((await patch()).equals(ocean)).toBe(false);
      await page.getByRole('button', { name: 'Color automático' }).click();
      expect((await patch()).equals(auto)).toBe(true);
    });

    test('el selector de color aplica el color elegido', async ({ page }) => {
      await page.getByRole('button', { name: 'Elegir color' }).click();
      const picker = page.getByRole('dialog');
      await expect(picker.getByRole('heading', { name: 'Elige un color' })).toBeVisible();
      const hex = picker.getByText(/^#[0-9A-F]{6}$/);
      const before = await hex.textContent();
      await picker.getByRole('button', { name: 'Sorpréndeme' }).click();
      await expect(hex).not.toHaveText(before!);
      await picker.getByRole('button', { name: 'Usar este color' }).click();
      await expect(picker).toBeHidden();
      await expect(page.getByRole('button', { name: /Tu color/ })).toBeVisible();
    });

    test('subir un video es Pro', async ({ page }) => {
      await page.getByRole('button', { name: 'Subir un video' }).click();
      await expect(paywall(page).getByText('Desbloquea las historias en video 4K.')).toBeVisible();
    });
  });

  test.describe('Paywall', () => {
    test('video es Pro: abre el paywall y el formato sigue en Foto', async ({ page }) => {
      await page.getByRole('tab', { name: 'Video' }).click();
      await expect(paywall(page).getByText('Desbloquea las historias en video 4K.')).toBeVisible();
      await closePaywall(page);
      // Still on photo: asking for video again hits the paywall again.
      await page.getByRole('tab', { name: 'Video' }).click();
      await expect(paywall(page)).toBeVisible();
    });

    test('en web no hay compras: explica por qué y desactiva suscribirse', async ({ page }) => {
      await page.getByRole('tab', { name: 'Video' }).click();
      const dialog = paywall(page);
      for (const benefit of ['Video 4K y fondos de video', 'Clima y fútbol en tiempo real', 'Todas las plantillas', 'Sin marca de agua']) {
        await expect(dialog.getByText(benefit)).toBeVisible();
      }
      await expect(dialog.getByText('Las compras no están disponibles en este momento. Inténtalo más tarde.')).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Suscribirme' })).toBeDisabled();
      await dialog.getByRole('button', { name: 'Restaurar compras' }).click();
      await expect(dialog.getByText('No se pudo completar la compra. Inténtalo de nuevo.')).toBeVisible();
    });
  });

  test.describe('Exportar', () => {
    test('guardar en web avisa que solo funciona en iOS/Android', async ({ page }) => {
      await page.getByRole('button', { name: 'Guardar en Fotos' }).click();
      await expect(page.getByText('La captura solo funciona en iOS/Android.')).toBeVisible();
    });

    test('compartir ofrece "con la canción" y "directo"', async ({ page }) => {
      await page.getByRole('button', { name: 'Compartir en Instagram Stories' }).click();
      const sheet = page.getByRole('dialog');
      await expect(sheet.getByText('Compartir en Instagram')).toBeVisible();
      await expect(sheet.getByRole('button', { name: /^Con la canción/ })).toContainText('Recomendado');
      await expect(sheet.getByRole('button', { name: /^Directo, sin canción/ })).toBeVisible();
      await sheet.getByRole('button', { name: 'Cerrar', exact: true }).click();
      await expect(sheet).toBeHidden();
    });

    test('"con la canción" copia "título - artista" al portapapeles', async ({ page }) => {
      await page.getByRole('button', { name: 'Compartir en Instagram Stories' }).click();
      await page.getByRole('dialog').getByRole('button', { name: /^Con la canción/ }).click();
      const song = `${SPOTIFY_TRACK.title} - ${SPOTIFY_TRACK.artist}`;
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(song);
    });

    test('"directo" en web avisa que la captura no está disponible', async ({ page }) => {
      await page.getByRole('button', { name: 'Compartir en Instagram Stories' }).click();
      await page.getByRole('dialog').getByRole('button', { name: /^Directo, sin canción/ }).click();
      await expect(page.getByText('La captura solo funciona en iOS/Android.')).toBeVisible();
    });

    test('exportar con un widget Pro vuelve a pedir Pro', async ({ page }) => {
      await tool(page, 'Plantillas').click();
      await page.getByRole('button', { name: 'Plantilla Reproductor con foto' }).click();
      await expect(paywall(page)).toBeVisible();
      await closePaywall(page);
    });
  });
});
