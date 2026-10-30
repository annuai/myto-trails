import type { CommentTag } from '@moto-trails/domain';

// Club rides and trail comments, as the phone shows them. Ride times are India time, as on the website.
const IST_MIN = 330;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
/** A UTC date whose UTC fields read as India time. */
const ist = (iso: string) => new Date(new Date(iso).getTime() + IST_MIN * 60_000);

/** A ride's start as the instant the server expects: a date ('YYYY-MM-DD') and minutes after midnight, India time. */
export const rideAtISO = (date: string, minutes: number) => `${date}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00+05:30`;

export const clockLabel = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  return `${h % 12 || 12}:${pad(minutes % 60)} ${h < 12 ? 'AM' : 'PM'}`;
};
/** "Sun, 7 Jun · 6:30 AM" */
export function formatRideWhen(iso: string): string {
  const d = ist(iso);
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} · ${clockLabel(d.getUTCHours() * 60 + d.getUTCMinutes())}`;
}
/** "7 Jun", or "7 Jun 2025" when it is not this year. */
export function formatPosted(iso: string, now: Date = new Date()): string {
  const d = ist(iso);
  const day = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return d.getUTCFullYear() === ist(now.toISOString()).getUTCFullYear() ? day : `${day} ${d.getUTCFullYear()}`;
}

export const COMMENT_TAGS = ['gate_closed', 'water_high', 'blocked', 'good_condition', 'tip'] as const satisfies readonly CommentTag[];
export const TAG_LABEL: Record<CommentTag, string> = { gate_closed: 'Gate closed', water_high: 'Water high', blocked: 'Trail blocked', good_condition: 'Good condition', tip: 'Tip' };
/** The server lets riders edit a comment for ten minutes. */
export const COMMENT_EDIT_MS = 10 * 60_000;
export const canEditComment = (createdAt: string, now: number = Date.now()) => now - new Date(createdAt).getTime() <= COMMENT_EDIT_MS;

/** Club posts and trail comments may not carry web addresses; the server enforces it, this saves a round trip. */
export const hasLink = (s: string) => /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|in|org|net|co|io|app|dev|me|ly)\b\/?)/i.test(s);

/** The same ride plan a week later, as an ISO instant. Ride times here are India time, which has no daylight saving, so seven days is the same clock time. */
export const nextWeek = (iso: string): string => new Date(new Date(iso).getTime() + 7 * 86_400_000).toISOString();
