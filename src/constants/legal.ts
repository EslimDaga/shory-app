// `||`, not `??`: an empty variable (as copied from .env.example) must fall back too.
export const LEGAL_URLS = {
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL || 'https://shory-legal.vercel.app/privacy',
  terms: process.env.EXPO_PUBLIC_TERMS_URL || 'https://shory-legal.vercel.app/terms',
} as const;
