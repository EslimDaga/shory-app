import type { User } from '@supabase/supabase-js';
import { strings } from '@/i18n/es';
import { clearHistory } from '@/services/storage/historyStorage';
import { clearPreferredSource } from '@/services/storage/onboardingStorage';
import { keyValue } from '@/services/storage/keyValue';
import type { MusicSource } from '@/types/music';
import { EMAIL_POLICY, limited, LOGIN_POLICY } from './attemptLimiter';
import { requestAppleAuthorizationCode, signInWithApple } from './appleAuth';
import {
  handleAuthCallbackUrl,
  resendSignupEmail,
  sendPasswordReset,
  signInWithEmail,
  signUpWithEmail,
  updatePassword,
  verifySignupCode,
  type AuthCallback,
} from './emailAuth';
import { isPreviewAuth } from './authConfig';
import { signInWithGoogle, signOutOfGoogle } from './googleAuth';
import { getSupabase } from './supabase';
import type { AuthMethod, AuthProviderId, AuthUser } from './types';

const PREVIEW_USER_KEY = 'shory.auth.previewUser';
const METHODS: AuthMethod[] = ['apple', 'google', 'email'];
const PREVIEW_DELAY_MS = 650;

type SignInOptions = { preferredSource: MusicSource | null };

function toAuthUser(user: User): AuthUser {
  const meta = user.user_metadata ?? {};
  const provider = user.app_metadata?.provider as AuthMethod | undefined;
  return {
    id: user.id,
    name: meta.full_name ?? meta.name ?? meta.username ?? null,
    email: user.email ?? null,
    avatarUrl: meta.avatar_url ?? meta.picture ?? null,
    provider: provider && METHODS.includes(provider) ? provider : 'email',
  };
}

async function savePreferredSource(preferredSource: MusicSource | null) {
  if (!preferredSource) return;
  try {
    await getSupabase().auth.updateUser({ data: { preferred_source: preferredSource } });
  } catch {
    return;
  }
}

function signInWithProvider(provider: AuthProviderId): Promise<User> {
  return provider === 'apple' ? signInWithApple() : signInWithGoogle();
}

export async function restoreSession(): Promise<AuthUser | null> {
  if (isPreviewAuth) {
    const stored = await keyValue.getItem(PREVIEW_USER_KEY);
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  }
  try {
    const { data } = await getSupabase().auth.getSession();
    return data.session ? toAuthUser(data.session.user) : null;
  } catch {
    return null;
  }
}

export function subscribeToSession(onChange: (user: AuthUser | null) => void): () => void {
  if (isPreviewAuth) return () => {};
  try {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      onChange(session ? toAuthUser(session.user) : null);
    });
    return () => data.subscription.unsubscribe();
  } catch {
    return () => {};
  }
}

async function signInPreview(id: string, name: string, email: string | null): Promise<AuthUser> {
  await new Promise((resolve) => setTimeout(resolve, PREVIEW_DELAY_MS));
  const user: AuthUser = { id: `preview-${id}`, name, email, avatarUrl: null, provider: 'preview' };
  await keyValue.setItem(PREVIEW_USER_KEY, JSON.stringify(user));
  return user;
}

export async function signIn(provider: AuthProviderId, options: SignInOptions): Promise<AuthUser> {
  if (isPreviewAuth) return signInPreview(provider, strings.auth.previewUserName, null);
  const user = await signInWithProvider(provider);
  await savePreferredSource(options.preferredSource);
  return toAuthUser(user);
}

// What this device keeps about the signed-in person. Cleared on sign-out and account deletion, so
// the next person on the phone doesn't see someone else's songs.
async function clearLocalUserData(): Promise<void> {
  await Promise.all([clearHistory(), clearPreferredSource()]);
}

export async function signOut(): Promise<void> {
  if (isPreviewAuth) {
    await keyValue.removeItem(PREVIEW_USER_KEY);
    await clearLocalUserData();
    return;
  }
  await signOutOfGoogle();
  const supabase = getSupabase();
  // Global sign-out revokes the refresh token on the server. If that call fails (offline, server
  // down), supabase-js keeps the local session, so it's dropped locally instead: signing out must
  // always leave this device signed out.
  const { error } = await supabase.auth.signOut();
  if (error) await supabase.auth.signOut({ scope: 'local' });
  await clearLocalUserData();
}

export async function deleteAccount(): Promise<void> {
  if (isPreviewAuth) {
    await keyValue.removeItem(PREVIEW_USER_KEY);
    return;
  }
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  // Apple requires apps with Sign in with Apple to revoke the user's Apple tokens on deletion; that
  // needs a fresh authorization code, so an Apple user confirms with Apple once more here.
  const appleAuthorizationCode =
    data.session?.user.app_metadata?.provider === 'apple' ? await requestAppleAuthorizationCode() : null;
  const { error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
    body: appleAuthorizationCode ? { appleAuthorizationCode } : {},
  });
  if (error) throw error;
  await signOutOfGoogle();
  await supabase.auth.signOut({ scope: 'local' });
  await clearLocalUserData();
}

export async function signInEmail(
  email: string,
  password: string,
  options: SignInOptions,
): Promise<AuthUser> {
  if (isPreviewAuth) return signInPreview('email', email.split('@')[0], email);
  const user = await limited('login', email, LOGIN_POLICY, () => signInWithEmail(email, password));
  await savePreferredSource(options.preferredSource);
  return toAuthUser(user);
}

export async function signUpEmail(
  name: string,
  email: string,
  password: string,
  options: SignInOptions,
): Promise<AuthUser | 'confirmEmail'> {
  if (isPreviewAuth) return signInPreview('email', name, email);
  const { user, needsConfirmation } = await signUpWithEmail(name, email, password);
  if (needsConfirmation || !user) return 'confirmEmail';
  await savePreferredSource(options.preferredSource);
  return toAuthUser(user);
}

export async function verifyEmailCode(
  email: string,
  code: string,
  options: SignInOptions,
): Promise<AuthUser> {
  if (isPreviewAuth) return signInPreview('email', email.split('@')[0], email);
  const user = await limited('verify', email, LOGIN_POLICY, () => verifySignupCode(email, code));
  await savePreferredSource(options.preferredSource);
  return toAuthUser(user);
}

export async function resendConfirmation(email: string): Promise<void> {
  if (isPreviewAuth) {
    await new Promise((resolve) => setTimeout(resolve, PREVIEW_DELAY_MS));
    return;
  }
  await limited('resend', email, EMAIL_POLICY, () => resendSignupEmail(email));
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (isPreviewAuth) {
    await new Promise((resolve) => setTimeout(resolve, PREVIEW_DELAY_MS));
    return;
  }
  await limited('reset', email, EMAIL_POLICY, () => sendPasswordReset(email));
}

export async function setNewPassword(password: string): Promise<void> {
  if (isPreviewAuth) return;
  await updatePassword(password);
}

export async function handleAuthUrl(url: string): Promise<AuthCallback | null> {
  if (isPreviewAuth) return null;
  return handleAuthCallbackUrl(url);
}
