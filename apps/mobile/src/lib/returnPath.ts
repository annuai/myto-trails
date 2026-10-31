/**
 * Where to go once sign-in finishes. It is kept across the browser round trip, so it is checked again on the way out: only an
 * in-app path is accepted. Anything else (another scheme, a host, a protocol-relative path) falls back to the default.
 */
export function safeReturnPath(v: unknown, fallback = '/you'): string {
  if (typeof v !== 'string') return fallback;
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\') || /[\u0000-\u001f]/.test(v)) return fallback;
  return v;
}
