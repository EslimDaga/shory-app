# Lanzamiento en la App Store

Todo el código está listo. Lo que falta son cuentas, IDs y credenciales. Síguelo en orden; cada paso dice qué valor sale de ahí y dónde va.

## Ya hecho

- Supabase conectado (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local`).
- Google Sign-In: proyecto GCP `shory-app-ios`, clientes iOS y Web, provider Google activo en Supabase, client IDs en `.env.local`.
- Login con Google/Apple y con email + contraseña (crear cuenta, confirmar correo, recuperar contraseña), vistas protegidas, cerrar sesión y eliminar cuenta dentro de la app.
- Ícono, splash, onboarding.
- `eas.json` con perfiles `development`, `preview` y `production`.
- Política de privacidad y términos completos y publicados (ver paso 4).

## 0. Login con email

- Redirect URL `shoryapp://auth-callback**` y Site URL `shoryapp://auth-callback` en Supabase → Authentication → URL Configuration. La Site URL es a donde va un link que no dice a dónde volver; si queda en `http://localhost:3000` (el valor por defecto), esos links se rompen.
- SMTP: Gmail (`smtp.gmail.com`, puerto 465, remitente `eslimdaga@gmail.com`) con una contraseña de aplicación de Google. Límite de Supabase: 30 correos por hora. Si la app crece, pasa a un dominio propio con Resend o Postmark.
- Código de confirmación: **6 dígitos**, vence en 1 hora (Sign In / Providers → Email). La app dice "código de 6 dígitos"; si cambias el largo, cambia también ese texto.
- Plantillas de correo: `supabase/templates/confirmation.html` (asunto `{{ .Token }} es tu código de Shory`) y `recovery.html` (asunto `Restablece tu contraseña de Shory`). Se pegan a mano en Authentication → Emails → Templates: si editas un archivo, vuelve a pegarlo ahí. La de confirmación tiene que llevar `{{ .Token }}`, porque la app pide el código.

## 1. Apple Developer Program (USD 99/año)

1. Inscríbete en https://developer.apple.com/programs/ con tu Apple ID (tarda 24–48 h en aprobarse).
2. Confirma que el Team ID sea `228QXV53GS` (Membership). Si es otro, cámbialo en `app.json` (`ios.appleTeamId`) y en `eas.json` (`submit.production.ios.appleTeamId`).

## 2. Sign in with Apple

1. developer.apple.com → Identifiers → `com.shoryapp.app` → activa **Sign in with Apple**.
2. Supabase → Authentication → Providers → **Apple** → actívalo, *Client IDs*: `com.shoryapp.app`.
3. En `.env.local`: `EXPO_PUBLIC_APPLE_SIGN_IN=true`.

## 3. Supabase: función de eliminar cuenta

```bash
npx supabase login
npx supabase link --project-ref fqkkiehcjekogizwsayw
npx supabase functions deploy delete-account
```

Sin esto, "Eliminar cuenta" falla, y Apple lo revisa.

## 4. Páginas legales

Ya publicadas en Vercel (proyecto `shory-legal`, equipo *eslim's projects*) desde `legal/`:

- https://shory-legal.vercel.app/privacy
- https://shory-legal.vercel.app/terms
- https://shory-legal.vercel.app/support — va en App Store Connect como *Support URL* (obligatoria)

Si editas `legal/*.html`, vuelve a desplegar ese proyecto. Las URLs ya están en `.env.local` y como valor por defecto en `src/constants/legal.ts`; súbelas también a EAS.

## 5. Google en producción

Hoy la pantalla de consentimiento está en **modo prueba**: solo entran los usuarios de prueba, y el revisor de Apple no podría usar Google.

1. Cloud Console → Google Auth Platform (proyecto `shory-app-ios`) → **Información de la marca**: pon las URLs de privacidad y términos.
2. El logo obliga a una verificación de marca con Google (pide dominio verificado). Opción rápida: **quita el logo**, y vuelve a subirlo cuando tengas dominio.
3. **Público** → **Publicar app**. Con los permisos básicos (email, perfil) no hace falta verificación.

## 6. EAS

```bash
npx eas-cli login
npx eas-cli init          # imprime el projectId → EAS_PROJECT_ID en .env.local
npx eas-cli env:create    # sube a EAS cada variable de .env.local (entorno production)
```

`.env.local` no se sube a EAS: las variables del build de producción tienen que estar creadas en EAS.

## 7. App Store Connect

1. https://appstoreconnect.apple.com → Apps → **+** → Nueva app: nombre "Shory", bundle `com.shoryapp.app`, SKU `shory-ios`.
2. Copia el **Apple ID** numérico de la app (App Information) y agrégalo en `eas.json` como `submit.production.ios.ascAppId`.
3. **App Privacy**: declara *Contact Info → Name, Email*, *Identifiers → User ID*, *Purchases → Purchase History* y *Diagnostics → Crash Data, Performance Data, Other Diagnostic Data* (Sentry), uso *App Functionality*, vinculados al usuario, sin tracking. Es lo mismo que declara el privacy manifest de `app.json` (`ios.privacyManifests`); si cambias uno, cambia el otro.
4. **Notas para el revisor** (App Review Information): crea una cuenta de prueba con email y contraseña ya confirmada y ponla ahí, y explica que el flujo empieza compartiendo o pegando un link de Spotify, Apple Music o YouTube Music.
5. Capturas de iPhone 6.9" (1320×2868) y la descripción.
6. **Support URL**: `https://shory-legal.vercel.app/support`; **Privacy Policy URL**: `https://shory-legal.vercel.app/privacy`.

## 7b. Pagos

Ver `docs/PAYMENTS.md`: productos de App Store, llave `appl_…` de RevenueCat y *Paid Apps Agreement* firmado en App Store Connect.

## 8. Compilar y enviar

Un build `production` falla a propósito si falta `EXPO_PUBLIC_APPLE_SIGN_IN=true` (guía 4.8) o alguna de `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_FB_APP_ID`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` en EAS (`app.config.ts`). Además necesita `SENTRY_AUTH_TOKEN` en EAS con visibilidad *sensitive*: sin él la subida de sourcemaps falla y el build también.

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --latest
```

El build aparece en TestFlight; pruébalo y envíalo a revisión desde App Store Connect.

## Monitoreo (Sentry)

Los errores, crashes nativos y logs llegan al proyecto `shory-app` de la organización `eslim` en sentry.io. Solo se envía desde iOS/Android con `EXPO_PUBLIC_SENTRY_DSN` puesto; en web (la suite e2e) y sin DSN el logger solo escribe en la consola de Metro. El entorno (`development`, `preview`, `production`) sale de `EXPO_PUBLIC_APP_ENV`, que fija `eas.json` por perfil.

En el código se usa `createLogger('área')` de `src/services/observability/logger.ts`: `info`/`warn` van a Sentry Logs; `error` crea un issue, salvo los errores esperados (sin conexión, timeout, permisos), que quedan como `warn`.

## Android (después)

- Google Play Console: USD 25 una vez.
- Client ID Android en Google Cloud con el SHA-1 que muestra `npx eas-cli credentials` (no va en `.env`).

## Resumen de valores

| Valor | Dónde se obtiene | Dónde va |
|---|---|---|
| `EXPO_PUBLIC_APPLE_SIGN_IN=true` | después de pagar | `.env.local` + EAS |
| Team ID | developer.apple.com → Membership | `app.json`, `eas.json` (ya puesto `228QXV53GS`) |
| `EXPO_PUBLIC_PRIVACY_URL` / `EXPO_PUBLIC_TERMS_URL` | donde publiques `legal/` | `.env.local` + EAS |
| `EAS_PROJECT_ID` | `eas init` | `.env.local` + EAS |
| `EXPO_PUBLIC_FB_APP_ID` | developers.facebook.com → tu app | `.env` + EAS (sin esto no se comparte a Instagram) |
| `FOOTBALL_DATA_KEY` | football-data.org (plan gratis) | `supabase secrets set` (ya puesto); lo usa la función `football` |
| `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_CLIENT_ID`, `APPLE_PRIVATE_KEY` | key de Sign in with Apple (`.p8`) | `supabase secrets set` (ver AUTH_SETUP) |
| `ascAppId` | App Store Connect → App Information | `eas.json` |
| `EXPO_PUBLIC_SENTRY_DSN` | sentry.io → proyecto `shory-app` → Client Keys | `.env.local` + EAS (ya en `.env.local`) |
| `SENTRY_ORG` / `SENTRY_PROJECT` | `eslim` / `shory-app` | `.env.local` + EAS (ya en `.env.local`) |
| `SENTRY_AUTH_TOKEN` | sentry.io → User Settings → Auth Tokens | `.env.local` + EAS *sensitive* — nunca en git |
| Resto (`SUPABASE_*`, `GOOGLE_*`) | ya configurado | copiar a EAS con `eas env:create` |
