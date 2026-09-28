import {
  isAuthRetryableFetchError,
  type Session,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';
import { Platform } from 'react-native';
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
import { secureSessionStorage } from './sessionStorage';
import { getAuthStorageKey, getSupabase } from './supabase';
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

function hasAppleIdentity(user: User): boolean {
  const providers = user.app_metadata?.providers as string[] | undefined;
  return (
    user.app_metadata?.provider === 'apple' ||
    Boolean(providers?.includes('apple')) ||
    Boolean(user.identities?.some((identity) => identity.provider === 'apple'))
  );
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
    const { data, error } = await getSupabase().auth.getSession();
    if (data.session) return toAuthUser(data.session.user);
    // Offline with an expired access token, supabase-js can't refresh it and reports no session, but
    // keeps it stored and refreshes it once the network is back: the person is still signed in.
    return isAuthRetryableFetchError(error) ? await readStoredUser() : null;
  } catch {
    return null;
  }
}

async function readStoredUser(): Promise<AuthUser | null> {
  try {
    const stored = await secureSessionStorage.getItem(getAuthStorageKey());
    const session = stored ? (JSON.parse(stored) as Partial<Session>) : null;
    return session?.refresh_token && session.user ? toAuthUser(session.user) : null;
  } catch {
    return null;
  }
}

export function subscribeToSession(onChange: (user: AuthUser | null) => void): () => void {
  if (isPreviewAuth) return () => {};
  try {
    const { data } = getSupabase().auth.onAuthStateChange((event, session) => {
      // restoreSession owns the starting state. Offline, INITIAL_SESSION reports no session for one
      // that is only waiting to be refreshed, which would sign the person out.
      if (event === 'INITIAL_SESSION') return;
      // supabase-js also signs out by itself (refresh token revoked or expired): the device must forget
      // that person's data then too. Clearing is idempotent, so an explicit sign-out clearing again is fine.
      if (event === 'SIGNED_OUT') void clearLocalUserData();
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

// Drops the session from this device. supabase-js can't when it fails to read the session first
// (offline with an expired access token), so it's then removed from storage directly.
async function dropLocalSession(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) await secureSessionStorage.removeItem(getAuthStorageKey());
}

export async function signOut(): Promise<void> {
  if (isPreviewAuth) {
    await keyValue.removeItem(PREVIEW_USER_KEY);
    await clearLocalUserData();
    return;
  }
  await signOutOfGoogle();
  const supabase = getSupabase();
  // Global sign-out revokes the refresh token on the server. When it fails, supabase-js usually drops
  // the local session anyway, but not when it couldn't refresh an expired one first (offline); then
  // it's dropped here, or auto-refresh would sign the person back in once the network returns.
  const { error } = await supabase.auth.signOut();
  if (error) await dropLocalSession(supabase);
  await clearLocalUserData();
}

export async function deleteAccount(): Promise<void> {
  if (isPreviewAuth) {
    await keyValue.removeItem(PREVIEW_USER_KEY);
    await clearLocalUserData();
    return;
  }
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  // Apple requires apps with Sign in with Apple to revoke the user's Apple tokens on deletion; that
  // needs a fresh authorization code, so an Apple user confirms with Apple once more here. Apple may
  // be linked to an account first created another way, so every linked provider is checked.
  let appleAuthorizationCode: string | null = null;
  if (data.session && hasAppleIdentity(data.session.user)) {
    // The code can only be requested through the native iOS sheet.
    if (Platform.OS !== 'ios') throw new Error(strings.auth.errors.appleDeleteNeedsIos);
    appleAuthorizationCode = await requestAppleAuthorizationCode();
  }
  const { error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
    body: appleAuthorizationCode ? { appleAuthorizationCode } : {},
  });
  if (error) throw error;
  await signOutOfGoogle({ revoke: true });
  await dropLocalSession(supabase);
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
