import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
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

export async function signOutOfGoogle() {
  if (!configured) return;
  try {
    await GoogleSignin.signOut();
  } catch {
    return;
  }
}
