import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { strings } from '@/i18n/es';
import { isAppleSignInEnabled } from './authConfig';
import { getSupabase } from './supabase';
import { AuthCancelledError } from './types';

export async function isAppleAuthAvailable(): Promise<boolean> {
  if (!isAppleSignInEnabled || Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function requestAppleCredential() {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ');
    return { identityToken: credential.identityToken, rawNonce, fullName: fullName || null };
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new AuthCancelledError();
    throw error;
  }
}

// A one-time authorization code for the signed-in Apple ID, used server-side to revoke its tokens
// when the account is deleted.
export async function requestAppleAuthorizationCode(): Promise<string> {
  try {
    const credential = await AppleAuthentication.signInAsync({ requestedScopes: [] });
    if (!credential.authorizationCode) throw new Error(strings.auth.errors.noIdToken('Apple'));
    return credential.authorizationCode;
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new AuthCancelledError();
    throw error;
  }
}

export async function signInWithApple() {
  const { identityToken, rawNonce, fullName } = await requestAppleCredential();
  if (!identityToken) throw new Error(strings.auth.errors.noIdToken('Apple'));

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  if (fullName && !data.user.user_metadata?.full_name) {
    await supabase.auth.updateUser({ data: { full_name: fullName } });
  }
  return data.user;
}
