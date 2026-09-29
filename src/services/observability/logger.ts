import { addBreadcrumb, captureException, logger as sentryLogger } from '@sentry/react-native';
import { isExpectedError } from '@/utils/errors';
import { scrubAttributes, scrubText, type LogAttributes } from './scrub';
import { observabilityEnabled } from './sentry';

export type { LogAttributes } from './scrub';

export type Logger = {
  // Development only: never sent.
  debug: (message: string, attributes?: LogAttributes) => void;
  info: (message: string, attributes?: LogAttributes) => void;
  warn: (message: string, attributes?: LogAttributes) => void;
  // A failure worth fixing: becomes an issue in Sentry with the stack trace. A lost connection, a
  // timeout or a denied permission isn't a bug (isExpectedError), so it's logged as a warning.
  error: (message: string, error?: unknown, attributes?: LogAttributes) => void;
};

type Level = 'info' | 'warn' | 'error';

const describe = (error: unknown) =>
  error instanceof Error
    ? { errorName: error.name, errorMessage: scrubText(error.message) }
    : error === undefined
      ? {}
      : { errorMessage: scrubText(String(error)) };

// One logger per area of the app (auth, purchases, export…): its scope prefixes the console
// line and tags everything sent, so Sentry can be filtered by area.
export function createLogger(scope: string): Logger {
  const prefix = `[${scope}]`;

  // console.log at every level: console.warn and console.error would cover the app with LogBox in
  // development, over failures the app already handles and shows.
  const print = (level: string, message: string, attributes: LogAttributes) => {
    if (__DEV__) console.log(`${prefix} ${level}`, message, attributes);
  };

  const send = (level: Level, message: string, attributes: LogAttributes) => {
    if (!observabilityEnabled) return;
    const clean = { scope, ...scrubAttributes(attributes) };
    const line = `${prefix} ${message}`;
    if (level === 'info') sentryLogger.info(line, clean);
    else if (level === 'warn') sentryLogger.warn(line, clean);
    else sentryLogger.error(line, clean);
    // Breadcrumbs travel with the next issue, so it shows what led up to it.
    addBreadcrumb({
      category: scope,
      message,
      level: level === 'warn' ? 'warning' : level,
      data: clean,
    });
  };

  return {
    debug(message, attributes = {}) {
      print('debug', message, attributes);
    },
    info(message, attributes = {}) {
      print('info', message, attributes);
      send('info', message, attributes);
    },
    warn(message, attributes = {}) {
      print('warn', message, attributes);
      send('warn', message, attributes);
    },
    error(message, error, attributes = {}) {
      const details = { ...attributes, ...describe(error) };
      if (isExpectedError(error)) {
        print('warn', message, details);
        send('warn', message, { ...details, expected: true });
        return;
      }
      print('error', message, details);
      send('error', message, details);
      if (!observabilityEnabled) return;
      captureException(error instanceof Error ? error : new Error(`${prefix} ${message}`), {
        tags: { scope },
        extra: { message, ...scrubAttributes(details) },
      });
    },
  };
}
