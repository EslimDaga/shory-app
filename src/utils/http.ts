const DEFAULT_TIMEOUT_MS = 10_000;

// fetch with a deadline: without one, a stalled request leaves the app spinning for the system's
// ~60 s timeout. The signal stays armed after the headers arrive, so it also bounds reading the
// body with text() or json(); firing after the body is read does nothing.
export function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

// Shared links sometimes come as http://; App Transport Security only allows HTTPS.
export function toHttps(url: string): string {
  return url.replace(/^http:\/\//i, 'https://');
}
