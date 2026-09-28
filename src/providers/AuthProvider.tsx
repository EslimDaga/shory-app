import * as Linking from 'expo-linking';
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { strings } from '@/i18n/es';
import * as authService from '@/services/auth/authService';
import {
  AuthCancelledError,
  type AuthMethod,
  type AuthProviderId,
  type AuthUser,
} from '@/services/auth/types';
import { loadPreferredSource } from '@/services/storage/onboardingStorage';
import { getErrorMessage } from '@/utils/errors';

type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  pendingMethod: AuthMethod | null;
  error: string | null;
  recovering: boolean;
  signIn: (provider: AuthProviderId) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    name: string,
    email: string,
    password: string,
  ) => Promise<'signedIn' | 'confirmEmail' | null>;
  verifyEmailCode: (email: string, code: string) => Promise<boolean>;
  resendConfirmation: (email: string) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  setNewPassword: (password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Token refreshes hand over a new but identical user; keeping the old object stops every screen that
// depends on `user` from re-running its effects each hour.
function sameUser(a: AuthUser | null, b: AuthUser | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.email === b.email &&
    a.avatarUrl === b.avatarUrl &&
    a.provider === b.provider
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pendingMethod, setPendingMethod] = useState<AuthMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  // The in-flight guard lives in a ref: two taps in the same frame both see `pendingMethod` as null.
  const pendingRef = useRef(false);
  const clearError = useCallback(() => setError(null), []);

  const applyUser = useCallback((next: AuthUser | null) => {
    setUser((current) => (sameUser(current, next) ? current : next));
    setStatus(next ? 'signedIn' : 'signedOut');
    if (!next) setRecovering(false);
  }, []);

  useEffect(() => {
    let active = true;
    authService.restoreSession().then((restored) => {
      if (active) applyUser(restored);
    });
    const unsubscribe = authService.subscribeToSession((next) => {
      if (active) applyUser(next);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [applyUser]);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      try {
        const result = await authService.handleAuthUrl(url);
        if (!result) return;
        if (result.kind === 'error') setError(result.message);
        if (result.kind === 'recovery') setRecovering(true);
      } catch (caught) {
        // A malformed link or an unconfigured backend: say so rather than leave an unhandled rejection.
        setError(getErrorMessage(caught));
      }
    };
    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  const run = async <T,>(method: AuthMethod, action: () => Promise<T>): Promise<T | null> => {
    if (pendingRef.current) return null;
    pendingRef.current = true;
    setError(null);
    setPendingMethod(method);
    try {
      return await action();
    } catch (caught) {
      if (!(caught instanceof AuthCancelledError)) setError(getErrorMessage(caught));
      return null;
    } finally {
      pendingRef.current = false;
      setPendingMethod(null);
    }
  };

  const acceptUser = (signedIn: AuthUser) => applyUser(signedIn);

  const signIn = async (provider: AuthProviderId) => {
    const signedIn = await run(provider, async () =>
      authService.signIn(provider, { preferredSource: await loadPreferredSource() }),
    );
    if (signedIn) acceptUser(signedIn);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const signedIn = await run('email', async () =>
      authService.signInEmail(email, password, { preferredSource: await loadPreferredSource() }),
    );
    if (signedIn) acceptUser(signedIn);
  };

  const signUpWithEmail = async (name: string, email: string, password: string) => {
    const result = await run('email', async () =>
      authService.signUpEmail(name, email, password, { preferredSource: await loadPreferredSource() }),
    );
    if (!result) return null;
    if (result === 'confirmEmail') return 'confirmEmail';
    acceptUser(result);
    return 'signedIn';
  };

  const verifyEmailCode = async (email: string, code: string) => {
    const signedIn = await run('email', async () =>
      authService.verifyEmailCode(email, code, { preferredSource: await loadPreferredSource() }),
    );
    if (signedIn) acceptUser(signedIn);
    return signedIn !== null;
  };

  const resendConfirmation = async (email: string) => {
    const sent = await run('email', async () => {
      await authService.resendConfirmation(email);
      return true;
    });
    return sent === true;
  };

  const requestPasswordReset = async (email: string) => {
    const sent = await run('email', async () => {
      await authService.requestPasswordReset(email);
      return true;
    });
    return sent === true;
  };

  const setNewPassword = async (password: string) => {
    const saved = await run('email', async () => {
      await authService.setNewPassword(password);
      return true;
    });
    if (saved) setRecovering(false);
    return saved === true;
  };

  const signOut = async () => {
    try {
      await authService.signOut();
    } finally {
      applyUser(null);
    }
  };

  const deleteAccount = async () => {
    try {
      await authService.deleteAccount();
      applyUser(null);
    } catch (caught) {
      // Backing out of the Apple confirmation just leaves the account as it was.
      if (caught instanceof AuthCancelledError) return;
      throw new Error(strings.auth.errors.deleteFailed(getErrorMessage(caught)));
    }
  };

  const value: AuthContextValue = {
    status,
    user,
    pendingMethod,
    error,
    recovering,
    signIn,
    signInWithEmail,
    signUpWithEmail,
    verifyEmailCode,
    resendConfirmation,
    requestPasswordReset,
    setNewPassword,
    signOut,
    deleteAccount,
    clearError,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
