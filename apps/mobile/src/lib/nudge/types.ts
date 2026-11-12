/** The kinds of ride nudge. `cls` groups them for the spacing rules: a "ride" nudge asks the rider to go riding, an "after" nudge follows a ride. */
export type NudgeType = 'first' | 'lapse' | 'weekend' | 'weather' | 'club' | 'milestone' | 'photos' | 'home' | 'standing';
export type NudgeLevel = 'off' | 'occasional' | 'regular';

export const NUDGE_META: Record<NudgeType, { label: string; hint: string; cls: 'ride' | 'after' }> = {
  first: { label: 'Your first ride', hint: 'A nudge or two to take your first ride', cls: 'ride' },
  lapse: { label: 'It\'s been a while', hint: 'After a week, three weeks and two months without a ride, then it stops', cls: 'ride' },
  weekend: { label: 'The weekend', hint: 'A Friday evening idea when the weekend looks free', cls: 'ride' },
  weather: { label: 'Good riding weather', hint: 'The evening before a dry, mild day', cls: 'ride' },
  club: { label: 'Club rides', hint: 'A club ride coming up that you have not answered', cls: 'ride' },
  milestone: { label: 'Milestones', hint: 'When you are close to a round number of kilometres this year', cls: 'ride' },
  photos: { label: 'Photos after a ride', hint: 'A reminder to share your ride photos with your club', cls: 'after' },
  home: { label: 'Ride home', hint: 'A reminder to head home after a ride', cls: 'after' },
  standing: { label: 'Standing', hint: 'How you compare near home, if you chose that', cls: 'ride' },
};
export const NUDGE_TYPES = Object.keys(NUDGE_META) as NudgeType[];

/** A nudge that has come due on the phone. `opened` is when the rider tapped it. */
export type NudgeHistory = { id: string; type: NudgeType; fireAt: number; opened?: number };

export type DayForecast = { iso: string; code: number; tempMax: number; rainPct: number };
/** A club ride coming up that the rider has not answered. */
export type ClubRide = { id: string; title: string; clubName: string; startsAt: number; going: number };

/** Everything the engine reads, as plain values, so it can be tested by pretending to be any rider on any day. */
export type NudgeWorld = {
  now: number;
  level: NudgeLevel;
  muted: NudgeType[];
  /** When the engine first saw this rider: the first-ride nudges count from here. */
  firstSeenAt: number;
  /** Real rides only, newest or oldest in any order. */
  rides: { startedAt: number; endedAt: number; distanceKm: number }[];
  /** Kilometres ridden so far this calendar year. */
  yearKm: number;
  /** Weekdays (0 Sunday to 6) the rider usually rides on, from their habit. */
  usualWeekdays: number[];
  /** From today on, one per day. Empty when it is not known. */
  forecast: DayForecast[];
  clubRides: ClubRide[];
  /** How many clubs the rider is in. */
  clubs: number;
  /** Home, when the rider has saved it. */
  home?: { lat: number; lng: number };
  /** Where the last real ride ended. */
  lastRideEnd?: { lat: number; lng: number };
  /** The last real ride was part of a group ride (the group finds its own way home). */
  lastRideGroup?: boolean;
  nextTrail?: { slug: string; name: string };
  /** Nudges that came due before, with whether they were opened. */
  history: NudgeHistory[];
  /** Every other reminder already planned (to-dos, trips, the usual-time one), which nudges keep clear of. */
  others: { id: string; fireAt: number }[];
  /** Days (YYYY-MM-DD) with a trip planned. */
  tripDays: string[];
  /** Where the rider stands against riders near home this month. Only for a rider who chose to see it. */
  standing?: { aheadOf: number; nextGap?: number; region: string };
};

/** What the engine plans: ready to become a scheduled notification. */
export type Nudge = { id: string; type: NudgeType; fireAt: number; title: string; body: string; lock: string; route: string; score: number };
