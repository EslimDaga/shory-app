# Auth de Shory — tareas pendientes

El flujo completo ya está en el código: onboarding → login con Google o Apple → vistas protegidas → cerrar sesión → eliminar cuenta. Si faltan las variables de Supabase, la app corre en **modo demo** en desarrollo (`__DEV__`): los botones sociales crean una sesión local falsa para que puedas probar todo el flujo. En un build de producción sin credenciales, los botones muestran un error y nadie entra.

## Cómo funciona

| Proveedor | En el teléfono | En el servidor |
|---|---|---|
| Email | formulario propio | Supabase `signInWithPassword` / `signUp` / `resetPasswordForEmail`; los enlaces vuelven a `shoryapp://auth-callback` (PKCE) |
| Apple | `expo-apple-authentication` (nativo, con nonce) | Supabase `signInWithIdToken({ provider: 'apple' })` |
| Google | `@react-native-google-signin/google-signin` (nativo) | Supabase `signInWithIdToken({ provider: 'google' })` |

- La sesión (access + refresh token) se guarda **cifrada en el Keychain** de iOS con `expo-secure-store` (`src/services/auth/sessionStorage.ts`), solo en este dispositivo y sin copiarse a respaldos. Si reinstalas la app, la sesión vieja del Keychain se borra. Se refresca sola mientras la app está en primer plano.
- Cerrar sesión revoca el refresh token en el servidor; si no hay conexión, igual cierra la sesión en el teléfono. Cerrar sesión y eliminar cuenta borran el historial local.
- Las contraseñas nunca se guardan en el teléfono. Supabase solo guarda su hash (bcrypt).
- `src/providers/AuthProvider.tsx` expone `useAuth()`; `src/App.tsx` solo monta Home/Editor con `status === 'signedIn'`.
- Eliminar cuenta llama a la Edge Function `delete-account` (Apple exige esto si la app permite crear cuentas).

## 1. Supabase

1. Crea un proyecto en https://supabase.com.
2. En **Project Settings → API** copia la URL y la *publishable key* (o `anon`) a `.env.local`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<key>
   ```
3. Instala la CLI (`brew install supabase/tap/supabase`), luego:
   ```bash
   supabase login
   supabase link --project-ref <ref>
   supabase functions deploy delete-account
   ```

### Correo de confirmación (código de 6 dígitos)

La app confirma cuentas nuevas con el **código** del correo (`verifyOtp`), no solo con el enlace: el enlace se gasta si el cliente de correo lo abre antes (Gmail/Outlook lo hacen) y con PKCE solo funciona en el mismo teléfono donde te registraste. Para que el correo traiga el código:

1. Supabase → **Authentication → Emails → Templates → Confirm signup**.
2. Asunto: `Tu código de Shory: {{ .Token }}`
3. Cuerpo (deja el enlace como alternativa):
   ```html
   <h2>Confirma tu cuenta de Shory</h2>
   <p>Escribe este código en la app:</p>
   <p style="font-size:32px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
   <p>O abre este enlace desde el iPhone donde te registraste:
      <a href="{{ .ConfirmationURL }}">Confirmar mi cuenta</a></p>
   ```
4. En **Authentication → URL Configuration → Redirect URLs** debe estar `shoryapp://auth-callback` (ya lo está).

### Seguridad del login (Supabase → Authentication)

Ya aplicado con `SUPABASE_ACCESS_TOKEN=<token> scripts/supabase/harden-auth.sh` (el token nunca va al repo). Valores:

1. **Rate limits** (Authentication → Rate Limits). Recomendado:
   - *Sign-ups and sign-ins*: 30 por 5 min por IP.
   - *Token verifications* (códigos OTP): 30 por 5 min por IP.
   - *Token refreshes*: 150 por 5 min por IP.
   - *Emails*: según tu SMTP (con el SMTP por defecto son 2 por hora).
2. **Contraseñas** (Authentication → Providers → Email → Password requirements): largo mínimo **8** y *lowercase, uppercase, digits and symbols* (la app ya lo exige al crear cuenta, pero el servidor también debe hacerlo). Si tienes plan Pro, activa **Leaked password protection** (HaveIBeenPwned).
3. **Secure email change** y **Secure password change**: activados.
4. **CAPTCHA** (opcional, Authentication → Attack Protection): hCaptcha o Turnstile si ves registros masivos.

La app además frena intentos repetidos por su lado (`src/services/auth/attemptLimiter.ts`): tras 5 fallos en 15 min bloquea ese correo 30 s, y el bloqueo se duplica hasta 15 min. Reenviar el código o el correo de recuperación tiene 60 s de espera. Esto es solo UX: la protección real contra fuerza bruta son los rate limits del servidor.

## 2. Apple

> Requiere el Apple Developer Program (USD 99/año). Mientras no lo tengas, deja `EXPO_PUBLIC_APPLE_SIGN_IN=false`: el botón y el entitlement nativo quedan desactivados y puedes instalar en tu iPhone con la cuenta gratis.

1. En https://developer.apple.com → Identifiers → `com.shoryapp.app` → activa **Sign in with Apple**.
2. En Supabase → Authentication → Providers → **Apple**: actívalo y en *Client IDs* pon `com.shoryapp.app` (para login nativo no necesitas el secret key).
3. En `.env.local` pon `EXPO_PUBLIC_APPLE_SIGN_IN=true`, corre `npx expo prebuild --platform ios --clean` y compila de nuevo.
4. **Revocación al eliminar cuenta (obligatorio para App Review):** crea una key en developer.apple.com → Keys → **+** → *Sign in with Apple* (asociada a `com.shoryapp.app`), descarga el `.p8` y guarda los secretos de la función:
   ```bash
   npx supabase secrets set APPLE_TEAM_ID=228QXV53GS APPLE_KEY_ID=<key id> APPLE_CLIENT_ID=com.shoryapp.app
   npx supabase secrets set APPLE_PRIVATE_KEY="$(cat AuthKey_<key id>.p8)"
   npx supabase functions deploy delete-account
   ```
   Sin estos secretos, un usuario de Apple no puede eliminar su cuenta (la función responde `apple_revocation_unavailable`).

## 3. Google

1. En https://console.cloud.google.com → APIs & Services → Credentials crea dos OAuth client IDs:
   - **iOS** con bundle ID `com.shoryapp.app`.
   - **Web application** (Supabase lo usa para validar el token).
2. En `.env.local`:
   ```
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web client id>
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios client id>
   GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.<parte del iOS client id>
   ```
3. En Supabase → Authentication → Providers → **Google**: actívalo, pon el Web client ID y su secret. En *Authorized Client IDs* agrega también el iOS client ID. Activa **Skip nonce checks** (el SDK de iOS mete su propio nonce).
4. Para Android: crea un client ID **Android** con el SHA-1 de tu keystore (`eas credentials`) — no hace falta ponerlo en `.env`.

## 4. Legal

Las páginas están publicadas en https://shory-legal.vercel.app/privacy y /terms (ya puestas en `EXPO_PUBLIC_PRIVACY_URL` y `EXPO_PUBLIC_TERMS_URL`).

## 5. Compilar

Las variables `EXPO_PUBLIC_*` se incrustan al compilar el JS y `GOOGLE_IOS_URL_SCHEME` entra al `Info.plist`, así que después de llenarlas:

```bash
npx expo prebuild --platform ios --clean
npx expo run:ios --device
```

Con EAS, crea las mismas variables en el proyecto (`eas env:create`) antes de `eas build`.

## Checklist

- [x] Proyecto Supabase + URL/key en `.env.local`
- [x] Deploy de `delete-account` (26/09/2026)
- [ ] Sign in with Apple activado en el App ID + provider Apple en Supabase
- [ ] Key de Sign in with Apple + secretos `APPLE_*` de `delete-account`
- [x] Rate limits y requisitos de contraseña en Supabase (`scripts/supabase/harden-auth.sh`, 26/09/2026)
- [x] Client IDs de Google iOS y Web (proyecto GCP `shory-app-ios`) + provider Google en Supabase con *Skip nonce checks*
- [ ] Client ID de Google Android (necesita el SHA-1 de EAS)
- [x] URLs de privacidad y términos
- [ ] Plantilla *Confirm signup* con `{{ .Token }}`
- [ ] Rebuild nativo
