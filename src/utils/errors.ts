import { strings } from '@/i18n/es';

// Low-level failures whose raw text means nothing to a person ("Network request failed",
// "Aborted", "JSON Parse error…") get a plain explanation instead.
function friendlyMessage(error: Error): string | null {
  if (error.name === 'AbortError' || /aborted/i.test(error.message)) return strings.errors.timeout;
  if (/network request failed|failed to fetch|load failed/i.test(error.message))
    return strings.errors.offline;
  if (error instanceof SyntaxError || /json parse/i.test(error.message)) return strings.errors.unknown;
  return null;
}

export function getErrorMessage(error: unknown, fallback: string = strings.errors.unknown): string {
  if (!(error instanceof Error)) return fallback;
  return friendlyMessage(error) ?? (error.message || fallback);
}
