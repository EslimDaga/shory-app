import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import { strings } from '@/i18n/es';
import { authConfig } from './authConfig';
import { getSupabase } from './supabase';
import { AuthCancelledError } from './types';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (!authConfig.googleWebClientId) throw new Error(strings.auth.errors.googleNotConfigured);
  GoogleSignin.configure({
    webClientId: authConfig.googleWebClientId,
    iosClientId: authConfig.googleIosClientId || undefined,
  });
  configured = true;
}

export async function signInWithGoogle() {
  ensureConfigured();
  let idToken: string | null;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) throw new AuthCancelledError();
    idToken = response.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new AuthCancelledError();
    }
    throw error;
  }
  if (!idToken) throw new Error(strings.auth.errors.noIdToken('Google'));

  const { data, error } = await getSupabase().auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) throw error;
  return data.user;
}

// The Google SDK keeps its own sign-in in the Keychain across launches, so it's configured on demand
// here: after a restart the app is signed in through Supabase without the SDK ever being set up.
// `revoke` also drops the app's grant with Google (account deletion).
export async function signOutOfGoogle({ revoke = false }: { revoke?: boolean } = {}) {
  if (Platform.OS === 'web') return;
  try {
    ensureConfigured();
    if (revoke && GoogleSignin.hasPreviousSignIn()) {
      // Revoking needs the SDK's current user, which it only loads back after a restart when asked.
      if (!GoogleSignin.getCurrentUser()) await GoogleSignin.signInSilently().catch(() => null);
      await GoogleSignin.revokeAccess().catch(() => null);
    }
    await GoogleSignin.signOut();
  } catch {
    // No Google configuration or no Google session: nothing to clear.
    return;
  }
}
