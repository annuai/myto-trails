type Entry = { data: unknown; at: number };

/** Entries older than this are not kept: a week-old list of trails is worth showing offline, a month-old one is not. */
export const MAX_AGE_MS = 7 * 86_400_000;
export const MAX_ENTRIES = 40;
const MAX_CHARS = 1_500_000;

/** Only what any visitor would see. Anything tied to an account (saved, clubs, signed-in comments, check-ins) stays in memory. */
export const isPersistable = (key: string): boolean => /^(trail:|search:|bikes:|countries)/.test(key);

/** The newest public entries as text, dropping the oldest until it fits. */
export function snapshotOf(entries: [string, Entry][], now: number, maxChars = MAX_CHARS): string {
  let keep = entries
    .filter(([k, e]) => isPersistable(k) && now - e.at <= MAX_AGE_MS)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, MAX_ENTRIES);
  let text = JSON.stringify(keep);
  while (text.length > maxChars && keep.length > 1) { keep = keep.slice(0, -1); text = JSON.stringify(keep); }
  return text;
}

/** What a saved snapshot holds, skipping anything damaged, too old, or not public. Times are kept, so an old entry still counts as stale and is refetched. */
export function parseSnapshot(text: string, now: number): [string, Entry][] {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return []; }
  if (!Array.isArray(raw)) return [];
  const out: [string, Entry][] = [];
  for (const item of raw) {
    if (!Array.isArray(item) || typeof item[0] !== 'string') continue;
    const e = item[1] as Partial<Entry> | undefined;
    if (!e || typeof e !== 'object' || typeof e.at !== 'number' || !('data' in e)) continue;
    if (!isPersistable(item[0]) || now - e.at > MAX_AGE_MS) continue;
    out.push([item[0], { data: e.data, at: e.at }]);
  }
  return out;
}
