const DEFAULT_TIMEOUT_MS = 10_000;

// fetch with a deadline: without one, a stalled request leaves the app spinning for the system's
// ~60 s timeout.
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Shared links sometimes come as http://; App Transport Security only allows HTTPS.
export function toHttps(url: string): string {
  return url.replace(/^http:\/\//i, 'https://');
}
