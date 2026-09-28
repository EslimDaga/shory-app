import type { Page } from '@playwright/test';
import { expect, storedSession, test } from './support/fixtures';

const HOME_BUTTON = { name: 'Pegar link de una canción' };

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

  test('valida nombre, email y contraseña antes de llamar al servidor', async ({ page, backend }) => {
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByText('Escribe tu nombre.')).toBeVisible();
    await expect(page.getByText('Ese email no se ve bien.')).toBeVisible();

    await page.getByRole('textbox', { name: 'Nombre' }).fill('Ana');
    await page.getByRole('textbox', { name: 'Email' }).fill('ana@mal');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('corta');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByText('Ese email no se ve bien.')).toBeVisible();
    expect(backend.calls.filter((c) => c.path.includes('/signup'))).toHaveLength(0);
  });

  test('el medidor de contraseña explica qué falta', async ({ page }) => {
    const password = page.getByRole('textbox', { name: 'Contraseña' });
    await expect(page.getByText('Usa 8+ caracteres, mayúsculas, números y un símbolo.')).toBeVisible();
    await password.fill('abc');
    await expect(page.getByText('Necesita al menos 8 caracteres.')).toBeVisible();
    await password.fill('abcdefgh');
    await expect(page.getByText('Combina mayúsculas y minúsculas.')).toBeVisible();
    await password.fill('Abcdefgh');
    await expect(page.getByText('Agrega al menos un número.')).toBeVisible();
    await password.fill('Abcdefg1');
    await expect(page.getByText('Agrega un símbolo, como ! o #.')).toBeVisible();
    await password.fill('Abcdef1!');
    await expect(page.getByText('Contraseña segura.')).toBeVisible();
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

  test('registro sin confirmación entra directo a Home y guarda la fuente preferida', async ({ page, backend }) => {
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Lucía');
    await page.getByRole('textbox', { name: 'Email' }).fill('  Lucia@Shory.Test ');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('Musica2026!');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByRole('button', HOME_BUTTON)).toBeVisible();
    const signup = backend.calls.find((c) => c.path.includes('/auth/v1/signup'));
    expect(signup?.body).toMatchObject({ email: 'lucia@shory.test', password: 'Musica2026!', data: { full_name: 'Lucía' } });
    await expect
      .poll(() => backend.calls.find((c) => c.method === 'PUT' && c.path.endsWith('/auth/v1/user'))?.body)
      .toMatchObject({ data: { preferred_source: 'spotify' } });
    expect(await storedSession(page)).not.toBeNull();
  });

  test('email ya registrado muestra el error traducido', async ({ page, backend }) => {
    backend.signupError = { status: 422, code: 'user_already_exists', message: 'User already registered' };
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Ana');
    await page.getByRole('textbox', { name: 'Email' }).fill('ana@shory.test');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('Musica2026!');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByText('Ese email ya tiene cuenta. Inicia sesión con él.')).toBeVisible();
  });

  test('registro con confirmación: pide el código, valida el formato y luego entra', async ({ page, backend }) => {
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
    await expect(page.getByText('Ese código o enlace ya venció o se usó. Pide un correo nuevo.')).toBeVisible();

    backend.verifyError = null;
    await page.getByRole('button', { name: 'Verificar y entrar' }).click();
    await expect(page.getByRole('button', HOME_BUTTON)).toBeVisible();
    const verify = backend.calls.filter((c) => c.path.includes('/auth/v1/verify')).at(-1);
    expect(verify?.body).toMatchObject({ email: 'ana@shory.test', token: '123456', type: 'email' });
  });

  test('cambia a login desde el registro', async ({ page }) => {
    await page.getByRole('button', { name: '¿Ya tienes cuenta? Inicia sesión' }).click();
    await expect(page.getByRole('heading', { name: 'Inicia sesión con tu email' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveCount(0);
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

  test('credenciales correctas llevan a Home y la sesión sobrevive a una recarga', async ({ page, backend }) => {
    await page.getByRole('textbox', { name: 'Email' }).fill('ana@shory.test');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('cualquiera');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByRole('button', HOME_BUTTON)).toBeVisible();
    expect(backend.calls.some((c) => c.path.includes('grant_type=password'))).toBe(true);

    await page.reload();
    await expect(page.getByRole('button', HOME_BUTTON)).toBeVisible({ timeout: 30_000 });
  });

  test('credenciales incorrectas muestran el error y se queda en el formulario', async ({ page, backend }) => {
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

  test('tras 5 fallos bloquea nuevos intentos sin llamar al servidor', async ({ page, backend }) => {
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

  test('recuperar contraseña envía el enlace y confirma sin revelar si la cuenta existe', async ({ page, backend }) => {
    await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
    await expect(page.getByRole('heading', { name: 'Recupera tu cuenta' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Email' }).fill('Ana@Shory.test');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();

    await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
    await expect(page.getByText('Si ana@shory.test tiene cuenta, te llega un enlace', { exact: false })).toBeVisible();
    const recover = backend.calls.find((c) => c.path.includes('/auth/v1/recover'));
    expect(recover?.body).toMatchObject({ email: 'ana@shory.test' });

    await page.getByRole('button', { name: 'Volver a iniciar sesión' }).click();
    await expect(page.getByRole('heading', { name: 'Inicia sesión con tu email' })).toBeVisible();
  });

  test('un segundo enlace de recuperación en el mismo minuto se frena en el cliente', async ({ page, backend }) => {
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
