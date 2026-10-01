import * as Sentry from "@sentry/node";

let enabled = false;

/** Error tracking is on only when SENTRY_DSN is set; without it, nothing leaves the server. */
export function initSentry(dsn: string | undefined, environment: string): void {
  if (!dsn) return;
  Sentry.init({ dsn, environment, sendDefaultPii: false, tracesSampleRate: 0 });
  enabled = true;
}

export function captureError(error: unknown): void {
  if (enabled) Sentry.captureException(error);
}
