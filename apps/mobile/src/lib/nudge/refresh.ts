import { api } from '@/api/client';
import type { ClubSummary, RideEvent } from '@/api/types';
import { useNudges } from '@/store/nudges';
import { useRides } from '@/store/rides';
import { DAY, HOUR } from './time';
import { fetchForecast } from './weather';

/** How long what was fetched is kept before it is fetched again. */
export const WEATHER_MAX_AGE_MS = 6 * HOUR;
export const CLUBS_MAX_AGE_MS = 3 * HOUR;
/** The most clubs asked about for their rides, and how far ahead a club ride is worth a nudge. */
const MAX_CLUBS = 4;
const AHEAD_MS = 5 * DAY;

/** Where the rider rides from: the start of their latest real ride, or nothing. */
const home = () => {
  const r = useRides.getState().rides.find((x) => !x.sample && x.points.length);
  const p = r?.points[0];
  return p ? { lat: p.lat, lng: p.lng } : undefined;
};

/**
 * Brings the little data the plan reads up to date, only when the rider has nudges on and only when it has gone stale: a forecast for the place they
 * ride from (the place is rounded to about 11 km before it is sent to the weather service, which is not Myto Moto), and the club rides coming up
 * that they have not answered. A failure leaves what was there. Called when the app opens.
 */
export async function refreshNudgeData(token: string | null, now = Date.now()): Promise<void> {
  const s = useNudges.getState();
  if (!s.level || s.level === 'off') return;
  const here = home();
  if (here && (!s.forecast || now - s.forecast.at > WEATHER_MAX_AGE_MS || Math.abs(s.forecast.lat - here.lat) > 0.3 || Math.abs(s.forecast.lng - here.lng) > 0.3)) {
    try { s.setForecast({ at: now, lat: here.lat, lng: here.lng, days: await fetchForecast(here.lat, here.lng) }); } catch { /* keep the old forecast */ }
  }
  if (token && (!s.clubs || now - s.clubs.at > CLUBS_MAX_AGE_MS)) {
    try {
      const mine = (await api<{ items: ClubSummary[] }>('/clubs?scope=mine&limit=10', { token })).items;
      const rides: NonNullable<typeof s.clubs>['rides'] = [];
      for (const c of mine.slice(0, MAX_CLUBS)) {
        const events = (await api<{ items: RideEvent[] }>(`/events?scope=club&clubId=${c.clubId}`, { token })).items;
        for (const e of events) {
          const startsAt = Date.parse(e.startsAt);
          if (e.status === 'scheduled' && e.myResponse === null && !e.mine && startsAt > now && startsAt - now <= AHEAD_MS) rides.push({ id: e.id, title: e.title, clubName: e.clubName ?? c.name, startsAt, going: e.going });
        }
      }
      s.setClubs({ at: now, count: mine.length, rides });
    } catch { /* keep the old list */ }
  }
}
