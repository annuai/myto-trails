import { loadServerEnv } from "@/server/env";

/** Runs once when the server starts: a misconfigured deployment fails here, not on the first request. */
export function register(): void {
  if (process.env.NEXT_RUNTIME === "nodejs") loadServerEnv(process.env);
}
