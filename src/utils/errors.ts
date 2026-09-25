import { strings } from '@/i18n/es';

export function getErrorMessage(error: unknown, fallback: string = strings.errors.unknown): string {
  return error instanceof Error ? error.message : fallback;
}
