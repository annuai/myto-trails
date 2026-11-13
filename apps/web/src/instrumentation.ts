import type { Instrumentation } from "next";
import { loadServerEnv } from "@/server/env";

/** Runs once when the server starts: a misconfigured deployment fails here, not on the first request. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  loadServerEnv(process.env);
  (await import("@/server/crash-report")).startCrashReporting();
}

/** Server errors go to crash reporting (a no-op until SENTRY_DSN is set). The request path is the route pattern, never the URL with its query. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  await (await import("@/server/crash-report")).reportServerError(err, request, context.routePath);
};
