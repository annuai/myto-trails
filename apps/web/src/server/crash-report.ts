import * as Sentry from "@sentry/node";
import { scrubCrashEvent } from "@moto-trails/domain";

let started = false;

/** Starts crash reporting when SENTRY_DSN is set; with no DSN (local development, tests) nothing is sent. Idempotent. */
export function startCrashReporting(env: Record<string, string | undefined> = process.env): boolean {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn) return false;
  if (started) return true;
  started = true;
  Sentry.init({
    dsn,
    environment: env.VERCEL_ENV ?? env.NODE_ENV,
    release: env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0,
    // Last line of defence: whatever the SDK collected, personal data is removed before it is sent.
    beforeSend: (event) => scrubCrashEvent(event as unknown as Record<string, unknown>) as unknown as typeof event,
  });
  return true;
}

/** Sends a server error from Next's onRequestError hook. Awaited so a serverless function does not freeze before it is sent. */
export async function reportServerError(err: unknown, request: { path: string; method: string }, routePath: string): Promise<void> {
  if (!started) return;
  Sentry.withScope((scope) => {
    scope.setTag("route", routePath);
    scope.setContext("request", { method: request.method, path: routePath });
    Sentry.captureException(err);
  });
  await Sentry.flush(2000);
}
