import type { PillionPose } from './moment';

/**
 * A visit is Pillion turning up with one line to say, and nothing to do about it: a greeting, a gentle "I'm waiting", "I'm resting",
 * a look at the map before a trip, a ride finished, a campfire. Each shows in the same dialog (PillionHost) and each can be opened by a
 * notification (`/pillion?visit=<id>`), so a notification and an in-app moment are the same thing to the rider.
 */
export type VisitId = 'hello' | 'waiting' | 'rest' | 'map' | 'finished' | 'campfire';

export const VISIT_IDS: readonly VisitId[] = ['hello', 'waiting', 'rest', 'map', 'finished', 'campfire'];
export const isVisitId = (v: unknown): v is VisitId => typeof v === 'string' && (VISIT_IDS as readonly string[]).includes(v);

export type Visit = {
  id: VisitId;
  pose: PillionPose;
  title: string;
  body: string;
  /** The button label. A visit that leads somewhere also has a route; the dialog's backdrop and Close always just close it. */
  button: string;
  route?: string;
};

/** The picture each visit is drawn with. `hello` is drawn live as the waving dog; `hello` here is its still fallback. */
export const VISIT_POSE: Record<VisitId, PillionPose> = {
  hello: 'hello',
  waiting: 'waiting-for-a-ride',
  rest: 'time-to-rest',
  map: 'map-reading',
  finished: 'tired-happy',
  campfire: 'campfire',
};

/** Two or three lines for each, so a visit is not word for word the same every time. No guilt and no countdowns: Pillion is glad, not owed. */
const COPY: Record<VisitId, { title: string; body: string }[]> = {
  hello: [
    { title: 'Hi, I am Pillion', body: 'I will ride along whenever you do. Say hi if you see me around.' },
    { title: 'Hi from Pillion', body: 'Good to see you. I keep an eye out for your rides and your marks.' },
    { title: 'Hello, rider', body: 'I am Pillion. Goggles up, bandana on, ready when you are.' },
  ],
  waiting: [
    { title: 'Pillion is waiting', body: 'No rush. The bike and I are right here whenever you feel like a ride.' },
    { title: 'Pillion is by the bike', body: 'Sitting here, watching the road. Come by when you are ready.' },
  ],
  rest: [
    { title: 'Pillion is taking a rest', body: 'That was a long ride. A stretch and some water sound good to both of us.' },
    { title: 'Pillion is curled up', body: 'Long day on the road. Rest up, you earned it too.' },
  ],
  map: [
    { title: 'Pillion is reading the map', body: 'Your trip is coming up. Shall we look the route over together?' },
    { title: 'Pillion has the map out', body: 'A ride is coming up and the route looks good. Want a look?' },
  ],
  finished: [
    { title: 'Tired and happy', body: 'You and Pillion made it back. Good ride.' },
    { title: 'Ride done', body: 'Pillion is tired and happy, and so should you be. Nice riding.' },
  ],
  campfire: [
    { title: 'Pillion is by the campfire', body: 'A good ride to end the day on. Sit a while.' },
    { title: 'Campfire time', body: 'The ride is done and the fire is lit. Pillion saved you a spot.' },
  ],
};

const BUTTON: Record<VisitId, string> = { hello: 'Hi, Pillion', waiting: 'Plan a ride', rest: 'Rest well', map: 'Open the trip', finished: 'Thanks, Pillion', campfire: 'Thanks, Pillion' };

/** What a visit can lead to, when it leads anywhere. */
const ROUTE: Partial<Record<VisitId, string>> = { waiting: '/plan' };

/** The visit as shown. `rand` picks the line (injected so tests are exact); a map visit names the trip it is about. */
export function visitOf(id: VisitId, opts: { rand?: () => number; trip?: { id: string; name: string } } = {}): Visit {
  const lines = COPY[id];
  const line = lines[Math.min(lines.length - 1, Math.floor((opts.rand ?? Math.random)() * lines.length))];
  const trip = id === 'map' ? opts.trip : undefined;
  return {
    id,
    pose: VISIT_POSE[id],
    title: line.title,
    body: trip ? `${trip.name} is coming up. Shall we look the route over together?` : line.body,
    button: BUTTON[id],
    route: trip ? `/trips/${trip.id}` : ROUTE[id],
  };
}
