import type { AuthError } from '@supabase/supabase-js';
import { strings } from '@/i18n/es';
import { authConfig } from './authConfig';
import { getSupabase } from './supabase';

export type SignUpResult = 'signedIn' | 'confirmEmail';

const RECOVERY_REDIRECT = `${authConfig.appRedirectUri}?type=recovery`;

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: strings.auth.email.errors.invalidCredentials,
  email_not_confirmed: strings.auth.email.errors.emailNotConfirmed,
  user_already_exists: strings.auth.email.errors.userExists,
  email_exists: strings.auth.email.errors.userExists,
  weak_password: strings.auth.email.errors.weakPassword,
  over_email_send_rate_limit: strings.auth.email.errors.rateLimited,
  over_request_rate_limit: strings.auth.email.errors.rateLimited,
  same_password: strings.auth.email.errors.samePassword,
  otp_expired: strings.auth.email.errors.codeExpired,
  // The link already confirmed the email server-side; only this device couldn't finish the sign-in
  // (e.g. it was opened on another phone or the computer), so the password login will work.
  flow_state_not_found: strings.auth.email.errors.verifiedElsewhere,
  flow_state_expired: strings.auth.email.errors.verifiedElsewhere,
  bad_code_verifier: strings.auth.email.errors.verifiedElsewhere,
};

function toFriendlyError(error: AuthError): Error {
  return new Error((error.code && ERROR_MESSAGES[error.code]) || error.message);
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw toFriendlyError(error);
  return data.user;
}

export async function signUpWithEmail(name: string, email: string, password: string) {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: { data: { full_name: name }, emailRedirectTo: authConfig.appRedirectUri },
  });
  if (error) throw toFriendlyError(error);
  return { user: data.user, needsConfirmation: !data.session };
}

export async function verifySignupCode(email: string, token: string) {
  const { data, error } = await getSupabase().auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw toFriendlyError(error);
  if (!data.user) throw new Error(strings.auth.email.errors.codeExpired);
  return data.user;
}

export async function resendSignupEmail(email: string) {
  const { error } = await getSupabase().auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: authConfig.appRedirectUri },
  });
  if (error) throw toFriendlyError(error);
}

export async function sendPasswordReset(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo: RECOVERY_REDIRECT });
  if (error) throw toFriendlyError(error);
}

export async function updatePassword(password: string) {
  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) throw toFriendlyError(error);
}

export type AuthCallback = { kind: 'recovery' | 'signIn' } | { kind: 'error'; message: string };

export async function handleAuthCallbackUrl(url: string): Promise<AuthCallback | null> {
  if (!url.startsWith(authConfig.appRedirectUri)) return null;
  const parsed = new URL(url.replace('#', url.includes('?') ? '&' : '?'));
  const params = parsed.searchParams;
  const description = params.get('error_description');
  if (description) {
    const code = params.get('error_code');
    return {
      kind: 'error',
      message: (code && ERROR_MESSAGES[code]) || description.replace(/\+/g, ' '),
    };
  }

  const code = params.get('code');
  if (!code) return null;
  const { error } = await getSupabase().auth.exchangeCodeForSession(code);
  if (error) return { kind: 'error', message: toFriendlyError(error).message };
  return { kind: params.get('type') === 'recovery' ? 'recovery' : 'signIn' };
}
