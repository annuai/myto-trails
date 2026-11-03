import { useEffect, useRef, useState } from 'react';
import { nowMs } from '@/lib/clock';
import { haversine, type LatLng } from '@/lib/geo';
import { answered, askFirst, dropped, failed, isFresh, readAgainst, startReroute, stepReroute } from '@/lib/reroute';
import { fetchDirections, navigateStep, type Directions } from '@/lib/turnByTurn';

/** A place that has moved less than this keeps its road. */
const TARGET_MOVED_M = 100;

export type Motion = { /** The GPS's own error in metres. */ accM?: number; speedMps: number; /** The way the rider is travelling. */ headingDeg?: number };

/**
 * The road from the rider to a place, with its turns: asked for once there is a position, and again from where the rider is when they leave
 * it (decided by lib/reroute: how far is off follows the GPS and the speed, and a missed turn or the wrong way is noticed within seconds).
 * With no `to` nothing is asked and nothing is returned.
 *
 * `failed` is true while the road service cannot be reached; the next question waits longer after each failure. `rerouting` is true from
 * the moment the rider is sure to be off the road until a new way is in hand or they are back on it. `rerouted` counts the new ways found, so
 * the screen can buzz once for each.
 */
export function useDirections(here: LatLng | undefined, to: LatLng | undefined, opts: { /** False before the ride starts: a rider standing still is not off the road. */ reroute?: boolean; motion?: Motion } = {}): { directions?: Directions; failed: boolean; rerouting: boolean; rerouted: number } {
  const [directions, setDirections] = useState<Directions>();
  const [failedFlag, setFailed] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [rerouted, setRerouted] = useState(0);
  const engine = useRef(startReroute);
  const prev = useRef<LatLng | undefined>(undefined);
  const inFlight = useRef<AbortController | undefined>(undefined);
  /** Where the road in hand leads. */
  const askedTo = useRef<LatLng | undefined>(undefined);
  const latest = useRef<{ here?: LatLng; motion?: Motion }>({});
  const toLat = to?.lat, toLng = to?.lng;

  // A new place means a new road. A place that has only crept a little (a rider on the move) keeps the road it has until it is 100 m away.
  useEffect(() => {
    const was = askedTo.current;
    if (was && toLat !== undefined && toLng !== undefined && haversine(was, { lat: toLat, lng: toLng }) < TARGET_MOVED_M) return;
    inFlight.current?.abort();
    askedTo.current = undefined; engine.current = startReroute; prev.current = undefined;
    setDirections(undefined); setFailed(false); setRerouting(false);
  }, [toLat, toLng]);
  useEffect(() => () => inFlight.current?.abort(), []);

  const hereLat = here?.lat, hereLng = here?.lng;
  useEffect(() => {
    if (hereLat === undefined || hereLng === undefined || toLat === undefined || toLng === undefined) return;
    const from = { lat: hereLat, lng: hereLng }, dest = { lat: toLat, lng: toLng };
    latest.current = { here: from, motion: opts.motion };
    const ask = (seq: number, isReroute: boolean) => {
      inFlight.current?.abort();
      const ctl = new AbortController();
      inFlight.current = ctl;
      fetchDirections(from, dest, ctl.signal)
        .then((d) => {
          // An answer for a question that is no longer the one wanted, or for a rider who has since ridden on, is not used.
          if (!isFresh(engine.current, seq, from, latest.current.here ?? from)) { engine.current = dropped(engine.current, nowMs()); return; }
          engine.current = answered(engine.current, nowMs());
          askedTo.current = dest; setDirections(d); setFailed(false);
          if (isReroute) setRerouted((n) => n + 1);
        })
        .catch(() => { if (ctl.signal.aborted) return; engine.current = failed(engine.current, nowMs()); setFailed(true); });
    };
    if (!directions) {
      const first = askFirst(engine.current, nowMs());
      engine.current = first.state;
      if (first.ask) ask(first.seq, false);
      return;
    }
    if (opts.reroute === false) return;
    const nav = navigateStep(directions, from);
    if (nav.arrived) { prev.current = from; return; }
    const m = opts.motion ?? { speedMps: 0 };
    const reading = readAgainst(directions.line, from, prev.current, { now: nowMs(), ...m });
    prev.current = from;
    if (!reading) return;
    const step = stepReroute(engine.current, reading);
    engine.current = step.state;
    const off = step.state.phase === 'off';
    setRerouting((was) => (was === off ? was : off));
    if (step.ask) ask(step.seq, true);
  }, [hereLat, hereLng, toLat, toLng]); // eslint-disable-line react-hooks/exhaustive-deps

  return { directions, failed: failedFlag, rerouting: rerouting && !!directions, rerouted };
}
