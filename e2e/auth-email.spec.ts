import type { Page, Route } from '@playwright/test';
import { expect, storedSession, test } from './support/fixtures';

const HOME_BUTTON = { name: 'Pegar link de una canción' };

const isUserUpdate = (c: { method: string; path: string }) =>
  c.method === 'PUT' && c.path.endsWith('/auth/v1/user');

async function submitSignup(page: Page) {
  await page.getByRole('textbox', { name: 'Nombre' }).fill('Ana');
  await page.getByRole('textbox', { name: 'Email' }).fill('ana@shory.test');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('Musica2026!');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
}

async function openEmailSignup(page: Page) {
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.getByRole('button', { name: 'Spotify', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar con email' }).click();
  await expect(page.getByRole('button', { name: 'Crear cuenta' })).toBeVisible();
}

async function openEmailLogin(page: Page) {
  await page.getByRole('button', { name: 'Ya tengo una cuenta' }).click();
  await page.getByRole('button', { name: 'Continuar con email' }).click();
  await expect(page.getByRole('heading', { name: 'Inicia sesión con tu email' })).toBeVisible();
}

test.describe('Registro con email', () => {
  test.beforeEach(async ({ signedOut, page }) => {
    await signedOut();
    await openEmailSignup(page);
  });

  test('valida nombre y email antes de llamar al servidor', async ({ page, backend }) => {
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByText('Escribe tu nombre.')).toBeVisible();
    await expect(page.getByText('Ese email no se ve bien.')).toBeVisible();

    await page.getByRole('textbox', { name: 'Nombre' }).fill('Ana');
    await page.getByRole('textbox', { name: 'Email' }).fill('ana@mal');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('corta');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    // Validation ran again: the name error is gone, the email one stays.
    await expect(page.getByText('Escribe tu nombre.')).toBeHidden();
    await expect(page.getByText('Ese email no se ve bien.')).toBeVisible();
    expect(backend.calls.filter((c) => c.path.includes('/signup'))).toHaveLength(0);
  });

  test('una contraseña que no cumple la regla no llega al servidor', async ({ page, backend }) => {
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Ana');
    await page.getByRole('textbox', { name: 'Email' }).fill('ana@shory.test');
    const password = page.getByRole('textbox', { name: 'Contraseña' });
    // Accented capitals don't count as uppercase (the server only takes A-Z).
    for (const weak of ['abcdefgh1', 'ÁÑÉÍabc1!']) {
      await password.fill(weak);
      await page.getByRole('button', { name: 'Crear cuenta' }).click();
      await expect(page.getByText('Combina mayúsculas y minúsculas sin acento (A-Z, a-z).')).toBeVisible();
    }
    await password.fill('Musica2026!');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByRole('button', HOME_BUTTON)).toBeVisible();
    // Only the strong password was ever sent.
    const signups = backend.calls.filter((c) => c.path.includes('/auth/v1/signup'));
    expect(signups).toHaveLength(1);
    expect(signups[0].body).toMatchObject({ password: 'Musica2026!' });
  });

  test('el medidor de contraseña explica qué falta', async ({ page }) => {
    const password = page.getByRole('textbox', { name: 'Contraseña' });
    await expect(page.getByText('Usa 8+ caracteres, mayúsculas, números y un símbolo.')).toBeVisible();
    await password.fill('abc');
    await expect(page.getByText('Necesita al menos 8 caracteres.')).toBeVisible();
    await password.fill('abcdefgh');
    await expect(page.getByText('Combina mayúsculas y minúsculas sin acento (A-Z, a-z).')).toBeVisible();
    await password.fill('ÁÑÉÍÓÚab');
    await expect(page.getByText('Combina mayúsculas y minúsculas sin acento (A-Z, a-z).')).toBeVisible();
    await password.fill('Abcdefgh');
    await expect(page.getByText('Agrega al menos un número.')).toBeVisible();
    await password.fill('Abcdefg1');
    await expect(page.getByText('Agrega un símbolo, como ! o #.')).toBeVisible();
    await password.fill('Abcdef1!');
    await expect(page.getByText('Contraseña segura.')).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
  });

  test('mostrar/ocultar contraseña', async ({ page }) => {
    const password = page.getByRole('textbox', { name: 'Contraseña' });
    await password.fill('Secreta123');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(password).not.toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('registro sin confirmación entra directo a Home y guarda la fuente preferida', async ({
    page,
    backend,
  }) => {
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Lucía');
    await page.getByRole('textbox', { name: 'Email' }).fill('  Lucia@Shory.Test ');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('Musica2026!');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByRole('button', HOME_BUTTON)).toBeVisible();
    const signup = backend.calls.find((c) => c.path.includes('/auth/v1/signup'));
    expect(signup?.body).toMatchObject({
      email: 'lucia@shory.test',
      password: 'Musica2026!',
      data: { full_name: 'Lucía' },
    });
    await expect
      .poll(() => backend.calls.find((c) => c.method === 'PUT' && c.path.endsWith('/auth/v1/user'))?.body)
      .toMatchObject({ data: { preferred_source: 'spotify' } });
    expect(await storedSession(page)).not.toBeNull();
  });

  test('email ya registrado (sin confirmación de email) muestra el error traducido', async ({
    page,
    backend,
  }) => {
    backend.signupError = { status: 422, code: 'user_already_exists', message: 'User already registered' };
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Ana');
    await page.getByRole('textbox', { name: 'Email' }).fill('ana@shory.test');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('Musica2026!');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByText('Ese email ya tiene cuenta. Inicia sesión con él.')).toBeVisible();
  });

  test('email ya registrado con confirmación de email activa muestra el error', async ({ page, backend }) => {
    backend.signupExistingUser = true;
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Ana');
    await page.getByRole('textbox', { name: 'Email' }).fill('ana@shory.test');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('Musica2026!');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByText('Ese email ya tiene cuenta. Inicia sesión con él.')).toBeVisible();
  });

  test('si el servidor rechaza la contraseña por débil lo explica', async ({ page, backend }) => {
    backend.signupError = { status: 422, code: 'weak_password', message: 'Password is known to be weak' };
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Ana');
    await page.getByRole('textbox', { name: 'Email' }).fill('ana@shory.test');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('Musica2026!');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(
      page.getByText(
        'Esa contraseña es muy débil. Usa 8+ caracteres con mayúsculas y minúsculas sin acento y un número.',
      ),
    ).toBeVisible();
  });

  test('registro con confirmación: pide el código, valida el formato y luego entra', async ({
    page,
    backend,
  }) => {
    backend.signupNeedsConfirmation = true;
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Ana');
    await page.getByRole('textbox', { name: 'Email' }).fill('ana@shory.test');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('Musica2026!');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
    await expect(page.getByText('Te mandamos un código a ana@shory.test.', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reenviar en \d+ s/ })).toBeDisabled();

    const code = page.getByRole('textbox', { name: 'Código de verificación' });
    await code.fill('12ab');
    await page.getByRole('button', { name: 'Verificar y entrar' }).click();
    await expect(page.getByText('Escribe el código de 6 dígitos del correo.')).toBeVisible();

    backend.verifyError = { status: 403, code: 'otp_expired', message: 'Token has expired' };
    await code.fill('123456');
    await page.getByRole('button', { name: 'Verificar y entrar' }).click();
    await expect(
      page.getByText('Ese código o enlace ya venció o se usó. Pide un correo nuevo.'),
    ).toBeVisible();

    backend.verifyError = null;
    await page.getByRole('button', { name: 'Verificar y entrar' }).click();
    await expect(page.getByRole('button', HOME_BUTTON)).toBeVisible();
    const verify = backend.calls.filter((c) => c.path.includes('/auth/v1/verify')).at(-1);
    expect(verify?.body).toMatchObject({ email: 'ana@shory.test', token: '123456', type: 'email' });
  });

  test('guarda la fuente preferida recién al verificar el código', async ({ page, backend }) => {
    backend.signupNeedsConfirmation = true;
    await submitSignup(page);
    // No session yet, so nothing to save it to.
    expect(backend.calls.some(isUserUpdate)).toBe(false);

    await page.getByRole('textbox', { name: 'Código de verificación' }).fill('123456');
    await page.getByRole('button', { name: 'Verificar y entrar' }).click();
    await expect(page.getByRole('button', HOME_BUTTON)).toBeVisible();
    await expect
      .poll(() => backend.calls.find(isUserUpdate)?.body)
      .toMatchObject({ data: { preferred_source: 'spotify' } });
  });

  test('iniciar sesión desde el onboarding guarda la fuente elegida', async ({ page, backend }) => {
    await page.getByRole('button', { name: '¿Ya tienes cuenta? Inicia sesión' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill('ana@shory.test');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('Musica2026!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByRole('button', HOME_BUTTON)).toBeVisible();
    await expect
      .poll(() => backend.calls.find(isUserUpdate)?.body)
      .toMatchObject({ data: { preferred_source: 'spotify' } });
  });

  test('cambia a login desde el registro', async ({ page }) => {
    await page.getByRole('button', { name: '¿Ya tienes cuenta? Inicia sesión' }).click();
    await expect(page.getByRole('heading', { name: 'Inicia sesión con tu email' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveCount(0);
  });
});

test.describe('Reenviar el código de confirmación', () => {
  test.beforeEach(async ({ page, signedOut, backend }) => {
    // The resend cooldown runs on timers and Date.now(); a fake clock skips the wait.
    await page.clock.install();
    backend.signupNeedsConfirmation = true;
    await signedOut();
    await openEmailSignup(page);
    await submitSignup(page);
  });

  test('se habilita tras un minuto, reenvía el correo y vuelve a esperar otro minuto', async ({
    page,
    backend,
  }) => {
    const resends = () => backend.calls.filter((c) => c.path.includes('/auth/v1/resend'));
    const waiting = page.getByRole('button', { name: /^Reenviar en \d+ s$/ });
    const resend = page.getByRole('button', { name: 'Reenviar correo', exact: true });
    await expect(waiting).toBeDisabled();

    // The countdown ticks one second at a time and each tick schedules the next after a render, so
    // the clock jumps a second per poll until the button unlocks. fastForward skips the animation
    // frames in between, which runFor would render one by one.
    const unlock = () =>
      expect
        .poll(
          async () => {
            await page.clock.fastForward(1000);
            return resend.isVisible();
          },
          { intervals: [50], timeout: 30_000 },
        )
        .toBe(true);

    await unlock();
    await resend.click();
    await expect(page.getByText('Listo, te mandamos un correo nuevo.')).toBeVisible();
    expect(resends()).toHaveLength(1);
    expect(resends()[0].body).toMatchObject({ email: 'ana@shory.test', type: 'signup' });
    expect(resends()[0].path).toContain('redirect_to=');

    // Within the next minute a second one can't be sent.
    await expect(waiting).toBeDisabled();
    await page.clock.fastForward('00:30');
    await expect(waiting).toBeDisabled();

    // After it, one more goes out; the countdown restarts once the server answered it.
    await unlock();
    await resend.click();
    await expect(waiting).toBeDisabled();
    expect(resends()).toHaveLength(2);
  });
});

test.describe('Login con email', () => {
  test.beforeEach(async ({ signedOut, page }) => {
    await signedOut();
    await openEmailLogin(page);
  });

  test('pide la contraseña y un email válido', async ({ page }) => {
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByText('Ese email no se ve bien.')).toBeVisible();
    await expect(page.getByText('Escribe tu contraseña.')).toBeVisible();
  });

  test('credenciales correctas llevan a Home y la sesión sobrevive a una recarga', async ({
    page,
    backend,
  }) => {
    await page.getByRole('textbox', { name: 'Email' }).fill('ana@shory.test');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('cualquiera');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByRole('button', HOME_BUTTON)).toBeVisible();
    expect(backend.calls.some((c) => c.path.includes('grant_type=password'))).toBe(true);
    // Coming straight to login, no source was picked: there's nothing to save.
    expect(backend.calls.some(isUserUpdate)).toBe(false);

    await page.reload();
    await expect(page.getByRole('button', HOME_BUTTON)).toBeVisible({ timeout: 30_000 });
  });

  test('credenciales incorrectas muestran el error y se queda en el formulario', async ({
    page,
    backend,
  }) => {
    backend.loginError = { status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' };
    await page.getByRole('textbox', { name: 'Email' }).fill('ana@shory.test');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('mala');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByText('Email o contraseña incorrectos.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('email sin confirmar muestra cómo seguir', async ({ page, backend }) => {
    backend.loginError = { status: 400, code: 'email_not_confirmed', message: 'Email not confirmed' };
    await page.getByRole('textbox', { name: 'Email' }).fill('ana@shory.test');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('Musica2026!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByText('Primero confirma tu email con el enlace que te mandamos.')).toBeVisible();
  });

  // LOGIN_POLICY (attemptLimiter.ts) allows 5 failures; the 6th locks the email out.
  test('tras 6 fallos (5 de cortesía) bloquea nuevos intentos sin llamar al servidor', async ({
    page,
    backend,
  }) => {
    backend.loginError = { status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' };
    await page.getByRole('textbox', { name: 'Email' }).fill('bloqueo@shory.test');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('mala');
    const submit = page.getByRole('button', { name: 'Iniciar sesión' });
    const loginCalls = () => backend.calls.filter((c) => c.path.includes('grant_type=password')).length;

    for (let attempt = 1; attempt <= 6; attempt++) {
      await submit.click();
      await expect.poll(loginCalls).toBe(attempt);
      await expect(page.getByText('Email o contraseña incorrectos.')).toBeVisible();
    }
    await submit.click();
    await expect(page.getByText(/Demasiados intentos\. Vuelve a intentarlo en \d+ s\./)).toBeVisible();
    expect(loginCalls()).toBe(6);
  });

  test('los fallos por falta de conexión no bloquean el login', async ({ page, backend }) => {
    const offline = (route: Route) => route.abort('internetdisconnected');
    await page.context().route('**/auth/v1/token**', offline);
    await page.getByRole('textbox', { name: 'Email' }).fill('sinred@shory.test');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('Musica2026!');
    const submit = page.getByRole('button', { name: 'Iniciar sesión' });
    const offlineError = page.getByText('Parece que no tienes conexión a internet.');
    for (let attempt = 1; attempt <= 6; attempt++) {
      await submit.click();
      await expect(offlineError).toBeVisible();
      // Wait for the attempt to settle before the next one.
      await expect(submit).toBeEnabled();
    }

    await page.context().unroute('**/auth/v1/token**', offline);
    await submit.click();
    await expect(page.getByRole('button', HOME_BUTTON)).toBeVisible();
    expect(backend.calls.filter((c) => c.path.includes('grant_type=password'))).toHaveLength(1);
  });

  test('un envío de recuperación que no salió no activa la espera', async ({ page, backend }) => {
    const offline = (route: Route) => route.abort('internetdisconnected');
    await page.context().route('**/auth/v1/recover**', offline);
    await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill('ana@shory.test');
    const send = page.getByRole('button', { name: 'Enviar enlace' });
    await send.click();
    await expect(page.getByText('Parece que no tienes conexión a internet.')).toBeVisible();

    await page.context().unroute('**/auth/v1/recover**', offline);
    await send.click();
    await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
    expect(backend.calls.filter((c) => c.path.includes('/auth/v1/recover'))).toHaveLength(1);
  });

  test('recuperar contraseña envía el enlace y confirma sin revelar si la cuenta existe', async ({
    page,
    backend,
  }) => {
    await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
    await expect(page.getByRole('heading', { name: 'Recupera tu cuenta' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Email' }).fill('Ana@Shory.test');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();

    await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
    await expect(
      page.getByText('Si ana@shory.test tiene cuenta, te llega un enlace', { exact: false }),
    ).toBeVisible();
    const recover = backend.calls.find((c) => c.path.includes('/auth/v1/recover'));
    expect(recover?.body).toMatchObject({ email: 'ana@shory.test' });

    await page.getByRole('button', { name: 'Volver a iniciar sesión' }).click();
    await expect(page.getByRole('heading', { name: 'Inicia sesión con tu email' })).toBeVisible();
  });

  test('un segundo enlace de recuperación en el mismo minuto se frena en el cliente', async ({
    page,
    backend,
  }) => {
    const send = async () => {
      await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
      await page.getByRole('textbox', { name: 'Email' }).fill('ana@shory.test');
      await page.getByRole('button', { name: 'Enviar enlace' }).click();
    };
    await send();
    await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
    await page.getByRole('button', { name: 'Volver a iniciar sesión' }).click();
    await send();
    await expect(page.getByText(/Demasiados intentos/)).toBeVisible();
    expect(backend.calls.filter((c) => c.path.includes('/auth/v1/recover'))).toHaveLength(1);
  });

  test('cambia a registro desde el login', async ({ page }) => {
    await page.getByRole('button', { name: '¿No tienes cuenta? Crea una' }).click();
    await expect(page.getByRole('textbox', { name: 'Nombre' })).toBeVisible();
  });
});
