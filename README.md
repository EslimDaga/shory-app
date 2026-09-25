# Shory ⚡️

**El tubo de exportación definitivo para "flexear" música en Instagram Stories con cero fricción.**

## 🎯 El Problema
Los usuarios quieren construir su identidad compartiendo la música que escuchan (estatus/aspiración). Actualmente, las herramientas de terceros exigen salir de la app, abrir un buscador, renderizar y descargar manualmente. La fricción mata el impulso. La gente es perezosa.

## 💊 La Solución (El Flujo Shory)
Un flujo invisible y sin fricción que ocurre en menos de 5 segundos:
1. Usuario escucha en Spotify, YouTube Music o Apple Music -> Toca "Compartir".
2. Selecciona **Shory** en el Share Sheet nativo del OS.
3. Shory recibe el link, extrae la data (sin APIs oficiales) y abre el **editor**: fondo (foto propia de la galería o cámara, o degradado), widget de la librería y tono.
4. Un toque al obturador y Shory abre Instagram Stories con la foto de fondo y el widget como sticker movible. También se puede guardar la historia completa en Fotos.

## 🛠 Stack Tecnológico
*   **Framework:** React Native + Expo (SDK 57).
*   **Recepción de link:** `expo-share-intent` (Share Extension en iOS, intent filter `text/*` en Android).
*   **Extracción de data (cero keys):** Spotify → oEmbed + JSON público de `/embed/`. YouTube Music → oEmbed de YouTube. Apple Music → iTunes Lookup API + `bgColor` de la página pública.
*   **Renderizado de imagen:** `react-native-view-shot` (canal alfa/fondo transparente).
*   **Deep Linking:** Esquema nativo `instagram-stories://share` con `stickerImage` + `backgroundImage`, vía `react-native-share`.
*   **Fotos:** `expo-image-picker` (galería/cámara) y `expo-media-library` (`Asset.create`, guardar en Fotos).

## ⚠️ Las Reglas de Oro (No Negociables)
1. **Cero fricción:** No hay barra de búsqueda. El disparador *siempre* es el menú nativo de compartir.
2. **Cero APIs oficiales:** Nada de tokens de autenticación de Spotify o Apple Music. Usamos metadatos públicos.
3. **Cero Backend:** Todo el renderizado ocurre en el cliente. No gastamos dinero en servidores para procesar imágenes.
4. **Un solo nicho:** Solo audiófilos y snobs musicales. No vuelos, no Strava, no fútbol. Un solo problema, resuelto a la perfección.

## 🚀 Hitos del MVP (Roadmap Técnico)
- [x] **Fase 1 (Data):** Extraer título, artista, cover y color primario desde el link de Spotify usando oEmbed.
- [x] **Fase 2 (Share Intent):** Lograr que Shory aparezca en el menú de compartir de iOS/Android y reciba el link correctamente.
- [x] **Fase 3 (Renderizado Local):** Inyectar los datos en una vista de React Native y capturarla como un PNG transparente.
- [x] **Fase 4 (El Salto):** Lograr que la app abra Instagram y pase el PNG directamente a la cámara de historias.
- [ ] **Fase 5 (Estética):** Pulir el diseño del widget para que parezca un elemento de estatus premium (cristal, sombras, tipografía impecable).
- [ ] **Fase 6 (Editor):** Foto propia de fondo, librería de widgets (Player, Vinilo, Polaroid, Ticket, Mini), tonos y soporte para YouTube Music y Apple Music. *Implementado; falta probar el flujo completo en dispositivo.*

> Fases 2–4 probadas en iPhone físico (iOS 27).
>
> **iOS 27:** exige el ciclo de vida UIScene. En SDK 57 se activa con `expo-build-properties` → `ios.enableSceneSupport: true` (ya configurado en `app.json`). Sin eso la app se cierra al abrir. En SDK 58+ ya no hace falta.

---

## 🧩 Notas técnicas

### Estructura
Todo el código está en inglés y sin comentarios. Los textos visibles están en español, centralizados en `src/i18n/es.ts`. Los imports usan el alias `@/` → `src/`.

```
src/
├── App.tsx                 raíz: fuentes, providers y Home ↔ Editor
├── i18n/es.ts              todos los textos visibles
├── theme/                  colors (paleta `brand` lima) · typography · layout
├── types/                  music · history · storyBackground
├── constants/              storyBackgrounds (degradados del editor)
├── services/
│   ├── music/              spotify · youtubeMusic · appleMusic · musicService
│   ├── instagram/          instagramStories (+ .web)
│   ├── media/              photoLibrary · viewCapture (+ .web)
│   └── storage/            historyStorage · historyReducer (+ .web)
├── hooks/                  useAppFonts · useHistory · useTrackLoader
├── utils/                  color · time · haptics · errors
├── components/             SourceLogo · Icons (compartidos)
├── widgets/                librería de widgets + registry · tonePalette
└── screens/
    ├── home/               HomeScreen · homeStats · components/
    └── editor/             EditorScreen · editorTools · components/ · hooks/
```

| Pieza | Responsabilidad |
|---|---|
| `hooks/useTrackLoader.ts` | Recibe el link (Share Sheet, portapapeles o link de desarrollo) y carga la metadata. |
| `services/music/musicService.ts` | Detecta el servicio del link y delega en su proveedor. |
| `screens/editor/hooks/useStoryExport.ts` | Captura sticker/fondo, comparte a Stories y guarda en Fotos. |
| `screens/editor/hooks/useDragAndPinch.ts` | Arrastrar (1 dedo) y escalar (2 dedos) el widget. |
| `widgets/registry.ts` | Lista de widgets. Para agregar uno: crea el componente (raíz transparente de tamaño fijo) y regístralo aquí. |
| `scripts/test-music.mts` | Prueba la extracción de data de los 3 servicios desde la terminal. |

### Datos de Spotify
- oEmbed solo devuelve **título y cover** (300px, se sube a 640px cambiando el hash).
- El **artista** y el **color primario** salen del JSON `__NEXT_DATA__` de `open.spotify.com/embed/...`. Es público pero no documentado: si Spotify lo cambia, el widget sigue funcionando sin artista.
- Probar la extracción con cualquier link:
  ```bash
  npm run test:music -- "https://open.spotify.com/track/..." "https://music.youtube.com/watch?v=..." "https://music.apple.com/us/album/...?i=..."
  ```

### YouTube Music y Apple Music
- **YouTube Music:** oEmbed da título, canal y thumbnail. El artista sale del canal (`Artista - Topic`) o del título (`Artista - Canción`); se limpian sufijos como "(Official Video)". El cover es `maxresdefault` recortado al centro. No hay color ni duración → fondo neutro.
- **Apple Music:** iTunes Lookup (`?i=` o `/song/<id>`) da canción, artista, duración y carátula a 1000px. El color sale de `bgColor` en la página pública (best-effort).

### Instagram Stories
Meta exige un **Facebook App ID** como `source_application`. Crea una app en https://developers.facebook.com y:
```bash
cp .env.example .env   # EXPO_PUBLIC_FB_APP_ID=<tu id>
```
- **iOS:** escribe `com.instagram.sharedSticker.stickerImage` (y `backgroundImage` si hay foto) en el pasteboard y abre `instagram-stories://share?source_application=<APP_ID>`.
- El fondo con foto se exporta **ya encuadrado** como se ve en el editor (captura 1080×1920 de la capa de fondo).
- **Android:** intent `com.instagram.share.ADD_TO_STORY` con `interactive_asset_uri`.

### Vista previa en web
Para iterar el diseño del widget sin Xcode: `npm run web` y pega un link. En el navegador el artista y la duración no llegan (el embed de Spotify no permite CORS; en iOS/Android no aplica) y el botón de compartir no hace nada (`src/services/instagram/instagramStories.web.ts` es un stub).

### Modo desarrollo
En builds de desarrollo, `shoryapp://open?url=<link-codificado>` abre el editor sin pasar por el Share Sheet (con la app ya abierta):
```bash
xcrun devicectl device process launch --device <UDID> --payload-url "shoryapp://open?url=https%3A%2F%2Fopen.spotify.com%2Ftrack%2F..." com.shoryapp.app
```
En producción ese link no hace nada.

En el **simulador** iOS pide confirmar cada deep link y ese diálogo no se puede automatizar; para abrir el editor directo al iniciar:
```bash
EXPO_PUBLIC_DEV_TRACK_URL="https://open.spotify.com/track/..." npx expo start --dev-client
```

### Editor
- La historia ocupa casi toda la pantalla; cerrar y el riel **Fondo · Widget · Tono** flotan encima (como el editor de historias de Instagram).
- Las bandejas solo aparecen al tocar una herramienta y se cierran tocando la foto.
- Widget: **un dedo lo mueve, dos dedos lo escalan** (0.45×–2.6×).
- Fila inferior: galería · obturador (→ Stories) · guardar en Fotos.

## ▶️ Ejecutar

No funciona en Expo Go (usa módulos nativos); necesita un development build.

**Requisitos (macOS):** Xcode (+ Command Line Tools apuntando a Xcode), CocoaPods, Watchman, Node 20+.

```bash
npm install
npx expo prebuild --clean
npx expo run:ios              # simulador
npx expo run:ios --device     # iPhone físico: asigna tu Team en Xcode a "shory" y "ShareExtension"
npx expo run:android --device
```

Para probar el flujo completo se necesita un **dispositivo físico** con Spotify e Instagram instalados.
