/** How long the quotes on the phone are kept before the site is asked again. */
export const QUOTES_REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
/** After an attempt (good or bad) the app waits this long before trying again, so coming back to the app over and over does not retry in a loop. */
export const QUOTES_RETRY_AFTER_MS = 10 * 60 * 1000;
/** The longest line and the most lines taken from a reply; anything beyond is ignored. */
export const QUOTE_MAX_LENGTH = 160;
export const QUOTES_MAX = 500;

/**
 * Whether to ask the site for quotes now: never fetched, or the last good fetch is a week old (or dated in the future, a phone clock that
 * was wrong), and the last attempt was not just now.
 */
export function quotesRefreshDue(fetchedAt: number, lastAttemptAt: number, now: number): boolean {
  if (lastAttemptAt && now >= lastAttemptAt && now - lastAttemptAt < QUOTES_RETRY_AFTER_MS) return false;
  return !fetchedAt || fetchedAt > now || now - fetchedAt >= QUOTES_REFRESH_AFTER_MS;
}

/**
 * The lines in a reply from /quotes, or null when the reply is not usable (so the phone keeps what it has). Lines that are not text, are
 * empty or too long are skipped and a repeated line appears once; a reply left with no line is not usable.
 */
export function parseQuotes(reply: unknown): string[] | null {
  const raw = (reply as { quotes?: unknown } | null | undefined)?.quotes;
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  for (const q of raw) {
    if (typeof q !== 'string') continue;
    const line = q.trim();
    if (line && line.length <= QUOTE_MAX_LENGTH) seen.add(line);
    if (seen.size >= QUOTES_MAX) break;
  }
  return seen.size ? [...seen] : null;
}
