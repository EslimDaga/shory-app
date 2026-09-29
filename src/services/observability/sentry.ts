import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';
import { scrubText, scrubUrl } from './scrub';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? 'development' : 'production');

// Off without a DSN (local runs, the e2e suite) and on web, which only exists for the e2e suite: the
// logger then only writes to the console, and nothing is sent anywhere.
export const observabilityEnabled = Boolean(DSN) && Platform.OS !== 'web';

let started = false;

export function initObservability() {
  if (!observabilityEnabled || started) return;
  started = true;
  Sentry.init({
    dsn: DSN,
    environment: ENVIRONMENT,
    // Only the account id is attached (setObservabilityUser): no IP, no device name.
    sendDefaultPii: false,
    // A screenshot or view tree would carry the person's photos and song into Sentry.
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableLogs: true,
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.2 : 1,
    beforeBreadcrumb(breadcrumb) {
      const url = breadcrumb.data?.url;
      if (typeof url === 'string') breadcrumb.data = { ...breadcrumb.data, url: scrubUrl(url) };
      if (breadcrumb.message) breadcrumb.message = scrubText(breadcrumb.message);
      return breadcrumb;
    },
    beforeSend(event) {
      if (event.request?.url) event.request.url = scrubUrl(event.request.url);
      for (const exception of event.exception?.values ?? []) {
        if (exception.value) exception.value = scrubText(exception.value);
      }
      return event;
    },
  });
}

export function setObservabilityUser(userId: string | null) {
  if (!observabilityEnabled) return;
  Sentry.setUser(userId ? { id: userId } : null);
}
