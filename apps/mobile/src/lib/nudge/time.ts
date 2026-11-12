export const MIN = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

/** Local midnight of the day `t` falls on. */
export const dayStart = (t: number): number => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
/** `days` calendar days after the day of `t`, at `h`:`m` local time (so a clock change never moves it). */
export const at = (t: number, days: number, h: number, m = 0): number => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, h, m).getTime(); };
export const isoOf = (t: number): string => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/** ISO year and week of `t`, as YYYY-Www. */
export const isoWeekOf = (t: number): string => {
  const d = new Date(t);
  const u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  u.setUTCDate(u.getUTCDate() + 4 - (u.getUTCDay() || 7));
  const week = Math.ceil(((u.getTime() - Date.UTC(u.getUTCFullYear(), 0, 1)) / DAY + 1) / 7);
  return `${u.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};
export const weekdayOf = (t: number): number => new Date(t).getDay();
export const minuteOfDay = (t: number): number => { const d = new Date(t); return d.getHours() * 60 + d.getMinutes(); };
export const sameDay = (a: number, b: number): boolean => dayStart(a) === dayStart(b);
