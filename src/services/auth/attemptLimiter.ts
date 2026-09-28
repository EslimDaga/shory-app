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
  // First lockout; each further failure doubles it, up to `maxLockMs`.
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
export async function assertAllowed(scope: string, subject: string): Promise<void> {
  const { lockedUntil } = await load(storageKey(scope, subject));
  const wait = lockedUntil - Date.now();
  if (wait > 0) throw new TooManyAttemptsError(wait);
}

export async function recordFailure(scope: string, subject: string, policy: Policy): Promise<void> {
  const key = storageKey(scope, subject);
  const now = Date.now();
  const state = await load(key);
  const failures = [...state.failures.filter((at) => now - at < policy.windowMs), now];
  if (failures.length <= policy.freeAttempts) {
    await save(key, { ...state, failures });
    return;
  }
  const lockMs = Math.min(policy.maxLockMs, state.lockMs ? state.lockMs * 2 : policy.lockMs);
  await save(key, { failures, lockedUntil: now + lockMs, lockMs });
}

export async function recordSuccess(scope: string, subject: string): Promise<void> {
  try {
    await keyValue.removeItem(storageKey(scope, subject));
  } catch {}
}

// Runs `action` under `policy`: refused while locked out, and every failure counts towards one.
export async function limited<T>(
  scope: string,
  subject: string,
  policy: Policy,
  action: () => Promise<T>,
): Promise<T> {
  await assertAllowed(scope, subject);
  try {
    const result = await action();
    // A policy with no free attempts is a cooldown: every send, successful or not, starts it.
    if (policy.freeAttempts > 0) await recordSuccess(scope, subject);
    else await recordFailure(scope, subject, policy);
    return result;
  } catch (error) {
    await recordFailure(scope, subject, policy);
    throw error;
  }
}
