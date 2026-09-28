import type { AuthError } from '@supabase/supabase-js';
import { strings } from '@/i18n/es';
import { authConfig } from './authConfig';
import { getSupabase } from './supabase';

const RECOVERY_REDIRECT = `${authConfig.appRedirectUri}?type=recovery`;

// An email link this device couldn't finish: opened on another phone or the computer, or already used.
const UNFINISHED_LINK_CODES = [
  'flow_state_not_found',
  'flow_state_expired',
  'bad_code_verifier',
  'pkce_code_verifier_not_found',
];

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
  // A signup link already confirmed the email server-side; only this device couldn't finish the
  // sign-in, so the password login will work.
  ...Object.fromEntries(
    UNFINISHED_LINK_CODES.map((code) => [code, strings.auth.email.errors.verifiedElsewhere]),
  ),
};

// Keeps Supabase's error as the cause, so the attempt limiter can tell a network error from a refusal.
function toFriendlyError(error: AuthError): Error {
  return Object.assign(new Error((error.code && ERROR_MESSAGES[error.code]) || error.message), {
    cause: error,
  });
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
  // With email confirmation on, Supabase answers an already-registered email with a fake user that
  // has no identities (instead of an error, so emails can't be enumerated). No code will ever arrive
  // for it, so this is the one moment to tell the person to sign in instead.
  if (!data.session && data.user?.identities?.length === 0) {
    throw new Error(strings.auth.email.errors.userExists);
  }
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
  const isRecovery = params.get('type') === 'recovery';
  const { error } = await getSupabase().auth.exchangeCodeForSession(code);
  if (error) {
    // Unlike a signup link, a reset link that can't finish here leaves nothing done: the person
    // still needs a new password, so they're sent back for a fresh link.
    if (isRecovery && UNFINISHED_LINK_CODES.includes(error.code ?? '')) {
      return { kind: 'error', message: strings.auth.email.errors.codeExpired };
    }
    return { kind: 'error', message: toFriendlyError(error).message };
  }
  return { kind: isRecovery ? 'recovery' : 'signIn' };
}
