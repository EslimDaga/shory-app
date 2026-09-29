// What leaves the phone is limited to the account id: the privacy policy promises no email, no
// name and no tokens reach a third party, so every log attribute and event passes through here.

export type LogAttributes = Record<string, string | number | boolean | null | undefined>;

// Anywhere in the key (refreshToken, userEmail…), or the whole key for words that are also parts
// of harmless ones (errorName, storeCode).
const SENSITIVE_KEY = /password|token|secret|cookie|email|^(name|phone|code|otp)$/i;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const FILTERED = '[filtered]';

export function scrubText(text: string): string {
  return text.replace(EMAIL, FILTERED);
}

// Query strings and fragments carry auth callbacks (access_token=…, code=…): keep only the path.
export function scrubUrl(url: string): string {
  return url.replace(/[?#].*$/, '');
}

export function scrubAttributes(attributes: LogAttributes = {}): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined || value === null) continue;
    if (SENSITIVE_KEY.test(key)) clean[key] = FILTERED;
    else clean[key] = typeof value === 'string' ? scrubText(value) : value;
  }
  return clean;
}
