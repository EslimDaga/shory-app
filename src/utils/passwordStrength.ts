const MIN_PASSWORD_LENGTH = 8;

export type PasswordRequirement = 'length' | 'mixedCase' | 'number' | 'symbol';

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  missing: PasswordRequirement[];
};

const CHECKS: { id: PasswordRequirement; test: (password: string) => boolean }[] = [
  { id: 'length', test: (password) => password.length >= MIN_PASSWORD_LENGTH },
  // ASCII only, like the server's required characters: an accented letter doesn't count as either case.
  { id: 'mixedCase', test: (password) => /[a-z]/.test(password) && /[A-Z]/.test(password) },
  { id: 'number', test: (password) => /\d/.test(password) },
  { id: 'symbol', test: (password) => /[^A-Za-zÀ-ÖØ-öø-ÿ0-9\s]/.test(password) },
];

export function evaluatePassword(password: string): PasswordStrength {
  if (!password) return { score: 0, missing: CHECKS.map((check) => check.id) };
  const missing = CHECKS.filter((check) => !check.test(password)).map((check) => check.id);
  const met = CHECKS.length - missing.length;
  // A short password is never better than "weak", however varied its characters are.
  const score = missing.includes('length') ? Math.min(met, 1) : met;
  return { score: Math.max(1, score) as PasswordStrength['score'], missing };
}

// Mirrors the server rule (Supabase: 8+ characters with lower- and uppercase letters and digits,
// set by scripts/supabase/harden-auth.sh), so the app never accepts a password the server refuses.
// A symbol only makes the meter show "strong".
const REQUIRED: PasswordRequirement[] = ['length', 'mixedCase', 'number'];

export function isPasswordStrongEnough(password: string): boolean {
  const { missing } = evaluatePassword(password);
  return REQUIRED.every((requirement) => !missing.includes(requirement));
}
