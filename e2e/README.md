# Pruebas e2e (Playwright)

Corren contra la versión **web** de la app (react-native-web), exportada en modo producción con un
Supabase falso (`https://e2e.supabase.co`). Todo el backend (Supabase auth y functions, Spotify,
Apple Music, YouTube, Open-Meteo) se mockea en `support/mocks.ts`: las pruebas nunca tocan cuentas,
compras ni APIs reales.

```bash
npm run e2e              # construye el export, levanta el servidor y corre todo (iphone + android)
npm run e2e -- --project=iphone -g "Login"   # un subconjunto
npm run e2e:ui           # modo interactivo
npm run e2e:report       # abre el último reporte HTML
npm run e2e:typecheck
```

- `support/fixtures.ts`: `signedIn()` abre Home con una sesión guardada, `signedOut()` abre la
  bienvenida, `setClipboard()` controla lo que devuelve "Pegar link", y `backend` permite cambiar
  las respuestas (errores de login, confirmación de email, estado de Spotify…) y revisar las
  llamadas que hizo la app.
- Si ya tienes algo en el puerto 8082 se reutiliza: borra `.e2e-dist/` o detén ese servidor para
  probar cambios nuevos.
- Lo nativo (captura, Guardar en Fotos, Instagram, compras) no existe en web; aquí se prueba que la
  app lo explique en vez de fallar. Eso se prueba en dispositivo.
