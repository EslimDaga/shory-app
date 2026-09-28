import { strings } from '@/i18n/es';

// Low-level failures whose raw text means nothing to a person ("Network request failed",
// "Aborted", "JSON Parse error…") get a plain explanation instead. On iOS/Android fetch is
// expo/fetch, whose errors read "fetch failed: <reason>"; the only thing that cancels a request is
// fetchWithTimeout's deadline, so a canceled request means it timed out.
function friendlyMessage(error: Error): string | null {
  if (
    error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    /aborted|timed out|request has been canceled/i.test(error.message)
  )
    return strings.errors.timeout;
  if (/network request failed|failed to fetch|load failed|networkerror|^fetch failed:/i.test(error.message))
    return strings.errors.offline;
  if (error instanceof SyntaxError || /json parse/i.test(error.message)) return strings.errors.unknown;
  return null;
}

export function getErrorMessage(error: unknown, fallback: string = strings.errors.unknown): string {
  if (!(error instanceof Error)) return fallback;
  return friendlyMessage(error) ?? (error.message || fallback);
}
