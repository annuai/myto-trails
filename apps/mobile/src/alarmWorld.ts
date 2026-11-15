import { sunsetClock } from '@/lib/daylight';
import { alarmBackend, setNativeAlarms } from '@/lib/alarm/backend';
import { planAlarms, type AlarmWorld } from '@/lib/alarm/plan';
import type { Reminder } from '@/lib/reminders';
import { useAlarms } from '@/store/alarms';
import { useLocation } from '@/store/location';
import { useNudges } from '@/store/nudges';
import { usePlaces } from '@/store/places';
import { useRides } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { useTrips } from '@/store/trips';

/** Where the sun is worked out: home, else where the latest ride began, else where the phone is. */
function place(): AlarmWorld['place'] {
  const home = usePlaces.getState().home;
  if (home) return { lat: home.lat, lng: home.lng };
  const p = useRides.getState().rides.find((r) => !r.sample && !r.simulated && r.points.length)?.points[0];
  if (p) return { lat: p.lat, lng: p.lng };
  const fix = useLocation.getState().fix;
  return fix ? { lat: fix.lat, lng: fix.lng } : undefined;
}

/** What the alarm plan reads, taken from the phone's stores as plain values. */
export function alarmWorld(now: number): AlarmWorld {
  const a = useAlarms.getState();
  const todos = useTodos.getState().todos;
  return {
    now,
    settings: Object.values(a.settings),
    trips: useTrips.getState().trips,
    packLeft: (tripId) => todos.filter((t) => t.category === 'pack' && t.tripId === tripId && !t.done).length,
    forecast: (useNudges.getState().forecast?.days ?? []).map((d) => ({ iso: d.iso, rainPct: d.rainPct, maxC: d.tempMax })),
    place: place(),
    woke: a.woke,
    clock: sunsetClock,
  };
}

/**
 * Plans the alarms and sends them where they ring: to the phone's alarm code (nothing goes to the reminder schedule), or, without it,
 * back to the reminder sync as notifications. Either way the trip start reminders they stand in for are dropped. Called by every sync.
 */
export async function syncAlarms(now: number): Promise<{ add: Reminder[]; drop: string[] }> {
  useAlarms.getState().prune(now);
  const { steps, replaces } = planAlarms(alarmWorld(now));
  if ((await alarmBackend()) === 'native') {
    await setNativeAlarms(steps).catch(() => undefined);
    return { add: [], drop: replaces };
  }
  await setNativeAlarms([]).catch(() => undefined);
  return { add: steps.map((s) => ({ id: s.id, fireAt: s.fireAt, title: s.title, body: s.body, lock: s.title, route: s.route, kind: 'alarm' as const, alarm: { group: s.group, snooze: s.snooze } })), drop: replaces };
}
