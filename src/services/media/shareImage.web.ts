import { strings } from '@/i18n/es';

export async function shareImage(_fileUri: string): Promise<boolean> {
  throw new Error(strings.errors.shareWebUnsupported);
}
