/** State-changing API calls must come from our own pages: the Origin header (when present) must match the Host. */
export function isSameOrigin(headers: { get(name: string): string | null }): boolean {
  const origin = headers.get("origin");
  if (!origin) return true; // non-browser clients and same-origin GETs send none; the session cookie is SameSite=Lax anyway
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}
