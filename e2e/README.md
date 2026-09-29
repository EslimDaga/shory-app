# Pruebas e2e (Playwright)

Corren contra la versión **web** de la app (react-native-web), exportada en modo producción con un
Supabase falso (`https://e2e.supabase.co`). Todo el backend que la web usa (Supabase auth, la función
`delete-account`, Spotify, Apple Music, YouTube) se mockea en `support/mocks.ts`: las pruebas nunca
tocan cuentas, compras ni APIs reales. Las búsquedas de música solo responden a la canción exacta que
la app debería pedir, así un link mal limpiado o un id equivocado falla como en el servicio real.

```bash
npm run e2e              # construye el export, levanta el servidor y corre todo (iphone + android)
npm run e2e -- --project=iphone -g "Login"   # un subconjunto
npm run e2e:ui           # modo interactivo
npm run e2e:report       # abre el último reporte HTML
npm run e2e:typecheck
```

- `support/fixtures.ts`: `signedIn()` abre Home con una sesión guardada (vencida o con la fuente de
  música del onboarding si se pide), `seedSession()` solo la guarda para la próxima carga,
  `signedOut()` abre la bienvenida, `setClipboard()` controla lo que devuelve "Pegar link", y
  `backend` permite cambiar las respuestas (errores de login, confirmación de email, refresh
  revocado, estado de Spotify…) y revisar las llamadas que hizo la app.
- Una petición que ningún mock responde hace fallar la prueba al terminar (`backend.unexpected`):
  si la app empieza a llamar algo nuevo, hay que mockearlo en `support/mocks.ts`.
- `support/env.ts` define el proyecto Supabase falso (URL, clave y la llave de la sesión) que usan
  el export, los mocks y las fixtures.
- Si ya tienes algo en el puerto 8082 se reutiliza: borra `.e2e-dist/` o detén ese servidor para
  probar cambios nuevos.
- `playwright.config.ts` fija todas las variables `EXPO_PUBLIC_*` del export: `EXPO_NO_DOTENV` solo
  ignora los `.env`, no las variables de la terminal o del CI.
- Lo nativo (captura, Guardar en Fotos, Instagram, compras, video) no existe en web; aquí se prueba
  que la app lo explique o lo oculte en vez de fallar. Eso se prueba en dispositivo.
- Lo Pro tampoco se cubre en web: `purchases.web.ts` siempre da el plan gratis, así que los datos en
  vivo (clima, fútbol), la sincronización del plan y el export en video no se alcanzan. Tampoco el
  historial (Recientes, estadísticas), porque en web ningún export termina.
