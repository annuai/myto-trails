const MAX_LENGTH = 2000;
const HOST = "http://placeholder.invalid";

/** Only same-site paths may be used as a post-sign-in destination; anything else becomes the fallback. */
export function safeNextPath(input: string | null | undefined, fallback = "/"): string {
  if (typeof input !== "string" || input.length === 0 || input.length > MAX_LENGTH) return fallback;
  if (!input.startsWith("/") || input.startsWith("//") || input.startsWith("/\\")) return fallback;
  if (/[\u0000- \u007f\\]/.test(input)) return fallback;
  let decoded: string;
  try {
    decoded = decodeURIComponent(input);
  } catch {
    return fallback;
  }
  if (decoded.startsWith("//") || /[\u0000-\u001f\u007f\\]/.test(decoded)) return fallback;
  try {
    if (new URL(input, HOST).origin !== HOST) return fallback;
  } catch {
    return fallback;
  }
  return input;
}
