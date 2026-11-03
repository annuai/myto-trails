import type { Habit } from './habit';

/**
 * The one line that greets the rider on the Ride page, chosen from what the app knows: a commute it has noticed, the day, the hour,
 * and whether they have ridden before. Exactly one is shown. Every title fits on two lines of the page's wide display type (the test holds
 * them to {@link TITLE_MAX} characters), because a title that wraps to a third would push the choices off the screen.
 */
export const TITLE_MAX = 32;

export type TitleContext = {
  now: Date;
  /** The rider's usual ride times (see findHabits). */
  habits: Habit[];
  /** How many rides they have recorded. */
  rides: number;
  /** Something is planned for today: a trip day, a trail or a route of their own. */
  planned: boolean;
};

const MIN = 60;
/** A usual time counts as "now" within this many minutes either side. */
const NEAR_MIN = 120;
const WEEKDAYS = [1, 2, 3, 4, 5];

const GENERIC = ['Where’s the road taking you?', 'Ready to ride?', 'Where to today?'];

/** Every title this can return, for the length test. */
export const ALL_TITLES: readonly string[] = [
  'Ready for your first ride?', 'Back to office?', 'Off to the office?', 'Heading home?', 'Heading home for the weekend?',
  'Your ride is planned.', 'Weekend. Where to?', 'Sunday ride?', 'Golden hour ride?', 'Riding after dark?', 'Chasing the sunrise?', ...GENERIC,
];

/** A commute the rider has: their usual time (on weekdays only, three or more of them) that falls near the time now, today. */
function commute(c: TitleContext): { morning: boolean } | undefined {
  const weekday = c.now.getDay(), minute = c.now.getHours() * 60 + c.now.getMinutes();
  const h = c.habits.find((x) => x.weekdays.includes(weekday) && x.weekdays.filter((d) => WEEKDAYS.includes(d)).length >= 3 && x.weekdays.every((d) => WEEKDAYS.includes(d)) && Math.abs(x.startMin - minute) <= NEAR_MIN);
  return h ? { morning: h.startMin < 12 * MIN } : undefined;
}

export function rideTitle(c: TitleContext): string {
  const day = c.now.getDay(), hour = c.now.getHours();
  if (c.rides === 0) return 'Ready for your first ride?';
  const trip = commute(c);
  if (trip) {
    if (!trip.morning) return day === 5 ? 'Heading home for the weekend?' : 'Heading home?';
    return day === 1 ? 'Back to office?' : 'Off to the office?';
  }
  if (c.planned) return 'Your ride is planned.';
  if (hour >= 21 || hour < 4) return 'Riding after dark?';
  if (hour >= 4 && hour < 7) return 'Chasing the sunrise?';
  if (day === 0 || day === 6) return hour < 11 ? 'Weekend. Where to?' : hour >= 16 ? 'Golden hour ride?' : day === 0 ? 'Sunday ride?' : GENERIC[0]!;
  // Nothing in particular: one of the plain greetings, the same all day and different from day to day.
  const dayNumber = Math.floor(c.now.getTime() / 86_400_000);
  return GENERIC[dayNumber % GENERIC.length]!;
}
