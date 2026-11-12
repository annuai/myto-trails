import { skyWord } from './weather';
import type { NudgeType } from './types';

/** What a nudge says. Friendly, one concrete reason, never guilt. The lock-screen line (shown when details are hidden) never says what the reason is. */
export type Words = { title: string; body: string; lock: string };
export const LOCK = 'A ride idea';

/** The facts a nudge can mention. */
export type CopyData = {
  /** Days since the last ride (lapse). */
  daysSince?: number;
  trail?: string;
  /** Weather: the day's name ("tomorrow", "Saturday"), the sky, the temperature. */
  day?: string; sky?: number; temp?: number;
  club?: string; rideTitle?: string; going?: number; when?: string;
  /** Milestone: the kilometres to go and the target. */
  toGo?: number; target?: number;
  /** Standing: whole percent of riders near home the rider is ahead of, the place, and the kilometres to the next band. */
  aheadOf?: number; region?: string; nextGap?: number;
};

const km = (n: number) => `${Math.max(1, Math.round(n))} km`;
const since = (d = 7) => (d >= 50 ? 'a couple of months' : d >= 18 ? 'three weeks' : 'a week');

const LINES: Record<NudgeType, ((d: CopyData) => [string, string])[]> = {
  first: [
    () => ['Your first ride is waiting', 'Tap Ride and go. We keep the route, the distance and what it cost.'],
    () => ['Ten minutes is enough to start', 'Open Myto Moto, tap Ride, and see where the road goes.'],
  ],
  lapse: [
    (d) => [`It's been ${since(d.daysSince)}`, d.daysSince && d.daysSince >= 50 ? 'Whenever you are ready, tap Ride for an easy one.' : 'A short spin is enough to shake off the dust.'],
    (d) => [`${since(d.daysSince)[0]!.toUpperCase()}${since(d.daysSince).slice(1)} since your last ride`, 'Even a short loop counts. Your bike is still there.'],
    () => ['Fancy a short ride?', 'Thirty minutes on the bike beats thirty on the sofa.'],
  ],
  weekend: [
    (d) => ['The weekend is here', d.trail ? `${d.trail} is on your list. Tap to see it.` : 'Got a route in mind? Tap Ride to record it.'],
    (d) => ['Plans for the weekend?', d.temp !== undefined && d.sky !== undefined ? `${skyWord(d.sky)} and ${d.temp}°C. A good time to be out.` : 'A ride would suit it.'],
    () => ['Free this weekend?', 'Pick a trail or just ride. We will keep the route.'],
  ],
  weather: [
    (d) => [`Good riding weather ${d.day ?? 'tomorrow'}`, `${skyWord(d.sky ?? 0)}, ${d.temp ?? 25}°C and dry.`],
    (d) => [`${d.day === 'tomorrow' ? 'Tomorrow' : d.day ?? 'Tomorrow'} looks dry`, `${d.temp ?? 25}°C. A good day for a ride.`],
  ],
  club: [
    (d) => [`${d.club ?? 'Your club'} ride ${d.when ?? 'soon'}`, `${d.rideTitle ?? 'A ride'}${d.going ? `, ${d.going} going` : ''}. You in?`],
    (d) => [`${d.rideTitle ?? 'A club ride'} ${d.when ?? 'soon'}`, `${d.club ?? 'Your club'} would like to see you there. Going?`],
  ],
  milestone: [
    (d) => [`${km(d.toGo ?? 0)} to ${d.target ?? 0} km this year`, 'One good ride gets you there.'],
    (d) => [`Nearly at ${d.target ?? 0} km for the year`, `${km(d.toGo ?? 0)} to go.`],
  ],
  photos: [
    () => ['Share today\'s ride', 'Add a few photos for your club.'],
    () => ['Any good photos from the ride?', 'Your club would like to see them.'],
  ],
  standing: [
    (d) => [`You are ahead of ${d.aheadOf ?? 50}% of riders near ${d.region ?? 'your area'}`, d.nextGap !== undefined ? `${km(d.nextGap)} more this month moves you up a band. A short loop does it.` : 'Nice riding this month.'],
  ],
};

/** How many wordings a type has. */
export const variants = (type: NudgeType): number => LINES[type].length;

/** The words for a nudge, using wording `variant` (any whole number; it wraps). */
export function write(type: NudgeType, data: CopyData, variant: number): Words {
  const lines = LINES[type];
  const [title, body] = lines[((variant % lines.length) + lines.length) % lines.length]!(data);
  return { title, body, lock: LOCK };
}
