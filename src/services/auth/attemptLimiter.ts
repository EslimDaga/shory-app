import { isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';
import { strings } from '@/i18n/es';
import { keyValue } from '@/services/storage/keyValue';

// Client-side brake on repeated auth attempts, on top of Supabase's server-side rate limits (which
// are what actually stop an attacker; see docs/AUTH_SETUP.md). It spares the user a wall of
// server errors and stops the app itself from hammering the auth API. Persisted, so closing and
// reopening the app doesn't reset it.

type Policy = {
  // Failures allowed inside `windowMs` before the first lockout.
  freeAttempts: number;
  windowMs: number;
  // First lockout; each further failure doubles it, up to `maxLockMs`. A lockout that ended more than
  // `windowMs` ago no longer counts, so the next one starts from `lockMs` again.
  lockMs: number;
  maxLockMs: number;
};

type State = { failures: number[]; lockedUntil: number; lockMs: number };

export const LOGIN_POLICY: Policy = {
  freeAttempts: 5,
  windowMs: 15 * 60_000,
  lockMs: 30_000,
  maxLockMs: 15 * 60_000,
};

// Sending an email (confirmation, password reset): one per minute per address.
export const EMAIL_POLICY: Policy = { freeAttempts: 0, windowMs: 60_000, lockMs: 60_000, maxLockMs: 60_000 };

export class TooManyAttemptsError extends Error {
  constructor(readonly retryInMs: number) {
    super(strings.auth.email.errors.tooManyAttempts(Math.ceil(retryInMs / 1000)));
    this.name = 'TooManyAttemptsError';
  }
}

const storageKey = (scope: string, subject: string) =>
  `shory.auth.attempts.${scope}.${subject.trim().toLowerCase()}`;

async function load(key: string): Promise<State> {
  try {
    const stored = await keyValue.getItem(key);
    if (stored) return JSON.parse(stored) as State;
  } catch {}
  return { failures: [], lockedUntil: 0, lockMs: 0 };
}

async function save(key: string, state: State): Promise<void> {
  try {
    await keyValue.setItem(key, JSON.stringify(state));
  } catch {}
}

// Throws TooManyAttemptsError while `subject` (usually the email) is locked out for `scope`.
async function assertAllowed(scope: string, subject: string): Promise<void> {
  const { lockedUntil } = await load(storageKey(scope, subject));
  const wait = lockedUntil - Date.now();
  if (wait > 0) throw new TooManyAttemptsError(wait);
}

async function recordFailure(scope: string, subject: string, policy: Policy): Promise<void> {
  const key = storageKey(scope, subject);
  const now = Date.now();
  const state = await load(key);
  const failures = [...state.failures.filter((at) => now - at < policy.windowMs), now];
  if (failures.length <= policy.freeAttempts) {
    await save(key, { ...state, failures });
    return;
  }
  const previousLockMs = now - state.lockedUntil < policy.windowMs ? state.lockMs : 0;
  const lockMs = Math.min(policy.maxLockMs, previousLockMs ? previousLockMs * 2 : policy.lockMs);
  await save(key, { failures, lockedUntil: now + lockMs, lockMs });
}

async function recordSuccess(scope: string, subject: string): Promise<void> {
  try {
    await keyValue.removeItem(storageKey(scope, subject));
  } catch {}
}

// Only an answer about the attempt itself counts as a failure. A network error or a server outage
// (AuthRetryableFetchError) says nothing about it, and an unconfirmed email means the password was
// right. The auth calls wrap Supabase's error as the `cause` of the one they throw.
function countsAsFailure(error: unknown): boolean {
  const cause = error instanceof Error && error.cause !== undefined ? error.cause : error;
  if (isAuthRetryableFetchError(cause)) return false;
  return !(isAuthError(cause) && cause.code === 'email_not_confirmed');
}

// Runs `action` under `policy`: refused while locked out, and every failed attempt counts towards one.
export async function limited<T>(
  scope: string,
  subject: string,
  policy: Policy,
  action: () => Promise<T>,
): Promise<T> {
  await assertAllowed(scope, subject);
  try {
    const result = await action();
    // A policy with no free attempts is a cooldown: every send, successful or refused, starts it.
    if (policy.freeAttempts > 0) await recordSuccess(scope, subject);
    else await recordFailure(scope, subject, policy);
    return result;
  } catch (error) {
    if (countsAsFailure(error)) await recordFailure(scope, subject, policy);
    throw error;
  }
}
