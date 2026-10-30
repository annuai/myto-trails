/** Paging and search terms for the club list. Pure, so it is tested without a database. */
export const CLUB_PAGE_DEFAULT = 20;
export const CLUB_PAGE_MAX = 100;
export const CLUB_QUERY_MAX = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}(:?\d{2})?|Z)?$/;

export type ClubCursor = { at: string; id: string };

/** A place in the newest-first list: the club's creation time as the database wrote it (keeping its microseconds) and its id. */
export const encodeClubCursor = (c: ClubCursor): string => Buffer.from(JSON.stringify([c.at, c.id])).toString("base64url");

/** The cursor from a previous page, undefined for none, or null when what was sent is not one of ours. */
export function decodeClubCursor(raw: string | null | undefined): ClubCursor | undefined | null {
  if (!raw) return undefined;
  try {
    const v: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (Array.isArray(v) && v.length === 2 && typeof v[0] === "string" && typeof v[1] === "string" && TIMESTAMP.test(v[0]) && UUID.test(v[1])) return { at: v[0], id: v[1] };
  } catch { /* not ours */ }
  return null;
}

/** A page size from a request: the default when missing or not a number, never below 1 or above the maximum. */
export function clubPageSize(raw: unknown): number {
  const n = typeof raw === "string" && raw.trim() !== "" ? Math.floor(Number(raw)) : NaN;
  return Number.isFinite(n) ? Math.max(1, Math.min(CLUB_PAGE_MAX, n)) : CLUB_PAGE_DEFAULT;
}

/** The typed words as an ILIKE pattern that matches them anywhere, with % _ and \ taken literally. Null when nothing was typed. */
export function clubSearchPattern(raw: unknown): string | null {
  const q = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, CLUB_QUERY_MAX) : "";
  return q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : null;
}
