import { strings } from '@/i18n/es';

// Low-level failures whose raw text means nothing to a person ("Network request failed",
// "Aborted", "JSON Parse error…") get a plain explanation instead. On iOS/Android fetch is
// expo/fetch, whose errors read "fetch failed: <reason>"; the only thing that cancels a request is
// fetchWithTimeout's deadline, so a canceled request means it timed out.
const isTimeout = (error: Error) =>
  error.name === 'AbortError' ||
  error.name === 'TimeoutError' ||
  /aborted|timed out|request has been canceled/i.test(error.message);

const isOffline = (error: Error) =>
  /network request failed|failed to fetch|load failed|networkerror|^fetch failed:/i.test(error.message);

// What the person fixes on their phone (a permission, installing Instagram): shown to them, and
// not a bug in the app.
const PERSON_FIXABLE = new Set<string>([
  strings.errors.instagramNotInstalled,
  strings.errors.photosPermission,
  strings.errors.cameraPermission,
  strings.errors.clipboardUnavailable,
]);

// The phone's connection or settings, not a bug: worth a log line, never an issue in Sentry.
export function isExpectedError(error: unknown): boolean {
  return (
    error instanceof Error && (isTimeout(error) || isOffline(error) || PERSON_FIXABLE.has(error.message))
  );
}

function friendlyMessage(error: Error): string | null {
  if (isTimeout(error)) return strings.errors.timeout;
  if (isOffline(error)) return strings.errors.offline;
  if (error instanceof SyntaxError || /json parse/i.test(error.message)) return strings.errors.unknown;
  return null;
}

export function getErrorMessage(error: unknown, fallback: string = strings.errors.unknown): string {
  if (!(error instanceof Error)) return fallback;
  return friendlyMessage(error) ?? (error.message || fallback);
}
