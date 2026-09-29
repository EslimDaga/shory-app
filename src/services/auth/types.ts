export type AuthProviderId = 'apple' | 'google';

export type AuthMethod = AuthProviderId | 'email';

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  provider: AuthMethod | 'preview';
};

export class AuthCancelledError extends Error {
  constructor() {
    super('cancelled');
    this.name = 'AuthCancelledError';
  }
}
