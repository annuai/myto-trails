import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { create } from 'zustand';
import { endRide } from '@/features/ride/endRide';
import { followedRouteEnd } from '@/features/ride/followedRouteEnd';
import { ARRIVE_RADIUS_M } from '@/lib/autoArrive';
import { setRecordingProfile } from '@/lib/backgroundLocation';
import { haversine } from '@/lib/geo';
import { startAutoEnd, stepAutoEnd, type AutoEndState } from '@/lib/homeRoute/autoEnd';
import { notifier, useTappedRoute } from '@/lib/notifier';
import { chooseProfile, WAKE_KMH, type RecordingProfile } from '@/lib/recordingProfile';
import { tripStatus } from '@/lib/tripPlan';
import { useBattery } from '@/store/battery';
import { useCompanion } from '@/store/companion';
import { useGuideTarget } from '@/store/guideTarget';
import { useMotion } from '@/store/motion';
import { usePlaces } from '@/store/places';
import type { PlaceKind } from '@/store/places';
import { useRecorder } from '@/store/recorder';
import { useTrips } from '@/store/trips';

export const WARN_ID = 'auto-end-warn';
const ASK_ID = 'auto-end-ask';
const LIVE = '/ride/live';

type Prompt = { kind: PlaceKind; action: 'warn' | 'ask'; text: string };
/** What the live screen shows while auto-end is warning or asking. `ending`: auto-end is saving the ride, so the screen leaves it to the host. */
export const useAutoEndPrompt = create<{ prompt: Prompt | null; ending: boolean; keep: () => void; end: () => void }>(() => ({ prompt: null, ending: false, keep: () => {}, end: () => {} }));

/** The live screen is what the rider sees: its route is on top and the app is in front (a locked phone shows nothing). */
export function liveShowingNow(path: string, app: string | null | undefined = AppState.currentState): boolean {
  return path === LIVE && app === 'active';
}

/** "Arrived home", "Arrived at work", or the rider's own name for the place. */
function arrivedWords(kind: PlaceKind): string {
  const label = usePlaces.getState()[kind]?.label?.trim();
  if (!label || label.toLowerCase() === kind) return kind === 'home' ? 'Arrived home' : 'Arrived at work';
  return `Arrived at ${label}`;
}

type Deps = { now: () => number; liveShowing: () => boolean; replace: (path: string) => void; /** Switches the background task's GPS profile; asked again on every fix, so a failed switch is retried. */ setProfile?: (p: RecordingProfile) => void };

/**
 * Watches the ride for arrival at Home or Work (opt-in, `useCompanion.autoEnd`). Steps the engine only when the recorder hears a fix:
 * no timer and no position of its own. Warns, then ends the ride through the same path as Stop, once. Returns the unsubscribe.
 * On the same fixes it picks the GPS profile (lib/recordingProfile, `useCompanion.batterySaver`) for the background task.
 */
export function watchAutoEnd(d: Deps): () => void {
  let state: AutoEndState = startAutoEnd;
  let rideKey = useRecorder.getState().startedAt;
  let cancelled: PlaceKind[] = [];
  let ended = false;
  let shownId: string | null = null;
  // How long the bike has stood still, from the same reliable-stop signal auto-pause uses.
  let stoppedSince: number | null = useMotion.getState().stopped ? d.now() : null;
  // The GPS profile: what this ride records with, when it last changed, and since when the fixes have been below walking pace.
  let profile: RecordingProfile = 'full';
  let switchedAt = -Infinity;
  let slowSince: number | null = null;
  const resetProfile = () => { profile = 'full'; switchedAt = -Infinity; slowSince = null; };
  type Rec = ReturnType<typeof useRecorder.getState>;
  /**
   * How long the bike has stood still: by the motion detector or by the recorded fixes, whichever has known longer (the motion signal
   * goes quiet with the screen locked, when only the background task's fixes arrive). One answer for both auto-end and the profile.
   * `resumed`: the rider (or auto-pause) took the ride up again, which counts as moving off. Moves `slowSince` on only when `track`.
   */
  const stopLength = (s: Rec, now: number, resumed: boolean, track: boolean): number => {
    const moving = resumed || (!s.fixPoor && s.speedKmh >= WAKE_KMH);
    if (track) { if (moving) slowSince = null; else if (!s.fixPoor) slowSince ??= now; }
    return moving ? 0 : Math.max(stoppedSince === null ? 0 : now - stoppedSince, slowSince === null ? 0 : now - slowSince);
  };
  /**
   * A fix too poor to judge also leaves idle: idle's low accuracy can give only such fixes away from wifi, and then it could never see
   * the rider ride off.
   */
  const driveProfile = (s: Rec, now: number, resumed: boolean, stoppedForMs: number) => {
    const wake = resumed || (s.fixPoor && profile === 'idle');
    const g = useGuideTarget.getState();
    const bat = useBattery.getState();
    const next = chooseProfile({
      current: profile, lastSwitchAt: switchedAt, now, batteryPct: bat.level, charging: bat.charging,
      navigating: !!g.to || !!g.rescue || !!followedRouteEnd(),
      stoppedForMs,
      speedKmh: wake ? Math.max(s.speedKmh, WAKE_KMH) : s.speedKmh,
      enabled: useCompanion.getState().batterySaver,
    });
    if (next !== profile) { profile = next; switchedAt = now; }
    // Only the background task has a profile to set; the shared on-screen watch stays at full.
    if (s.backgrounded) d.setProfile?.(profile);
  };

  const clearPrompt = () => {
    if (shownId) { void notifier.dismiss?.(shownId).catch(() => undefined); shownId = null; }
    if (useAutoEndPrompt.getState().prompt) useAutoEndPrompt.setState({ prompt: null });
  };
  const keep = () => {
    const p = useAutoEndPrompt.getState().prompt;
    if (!p || ended) return;
    if (!cancelled.includes(p.kind)) cancelled = [...cancelled, p.kind];
    usePlaces.getState().addStrike(p.kind);
    clearPrompt();
  };
  const finish = async (kind: PlaceKind) => {
    if (ended) return;
    ended = true;
    clearPrompt();
    useAutoEndPrompt.setState({ ending: true });
    const id = await endRide();
    if (id) usePlaces.getState().clearStrikes(kind);
    // Saved: a live screen left behind in the stack (or opened later from the warning) goes Home by itself again.
    if (d.liveShowing()) { d.replace(id ? `/story/${id}` : '/'); useAutoEndPrompt.setState({ ending: false }); return; }
    useAutoEndPrompt.setState({ ending: false });
    // If the ride could not be written, Home offers it back for saving: nothing to tap here.
    if (id) void notifier.notifyNow({ id: `auto-end-saved:${id}`, fireAt: d.now(), title: arrivedWords(kind), body: 'Ride saved. Tap to see it', route: `/story/${id}` }).catch(() => undefined);
  };
  const end = () => { const p = useAutoEndPrompt.getState().prompt; if (p) void finish(p.kind); };
  useAutoEndPrompt.setState({ prompt: null, keep, end });

  const unsubMotion = useMotion.subscribe((s, prev) => {
    if (s.stopped && !prev.stopped) stoppedSince = d.now();
    if (!s.stopped) stoppedSince = null;
  });
  const unsubRide = useRecorder.subscribe((s, prev) => {
    if (s.status !== 'running') { if (prev.status === 'running') { clearPrompt(); resetProfile(); } return; }
    if (s.startedAt !== rideKey) { rideKey = s.startedAt; state = startAutoEnd; cancelled = []; ended = false; clearPrompt(); useAutoEndPrompt.setState({ ending: false }); resetProfile(); }
    const now = d.now();
    const resumed = prev.paused && !s.paused;
    const fresh = resumed || (s.lastFixAt !== prev.lastFixAt && !s.paused);
    const stoppedForMs = stopLength(s, now, resumed, fresh);
    if (fresh) driveProfile(s, now, resumed, stoppedForMs);
    // Only a new fix moves the watch on: the engine needs fresh positions, and stepping without one would reset its countdown.
    if (s.lastFixAt === prev.lastFixAt || ended || !useCompanion.getState().autoEnd) return;
    const pos = s.points[s.points.length - 1];
    const { home, work, endStrikes } = usePlaces.getState();
    const routeEnd = followedRouteEnd();
    const step = stepAutoEnd(state, {
      now, pos, posAt: s.lastFixAt,
      places: { ...(home ? { home: { lat: home.lat, lng: home.lng } } : {}), ...(work ? { work: { lat: work.lat, lng: work.lng } } : {}) },
      ride: { running: true, paused: s.paused, startedAt: s.startedAt, meters: s.meters, source: s.source, waypointsAhead: !!routeEnd && !!pos && haversine(pos, routeEnd) > ARRIVE_RADIUS_M },
      inGroupRide: !!useCompanion.getState().group,
      tripActive: useTrips.getState().trips.some((t) => tripStatus(t) === 'active'),
      guideTo: useGuideTarget.getState().to,
      stoppedForMs,
      enabled: true,
      strikes: endStrikes,
      cancelled,
    });
    state = step.state;
    if (step.action === 'end' && step.kind) { void finish(step.kind); return; }
    if ((step.action === 'warn' || step.action === 'ask') && step.kind) {
      const words = arrivedWords(step.kind);
      const text = step.action === 'warn' ? `${words}. Ending the ride in 30 seconds. Tap to keep recording` : `${words}. End the ride?`;
      clearPrompt();
      useAutoEndPrompt.setState({ prompt: { kind: step.kind, action: step.action, text } });
      shownId = step.action === 'warn' ? WARN_ID : ASK_ID;
      void notifier.notifyNow({ id: shownId, fireAt: now, title: words, body: text, route: LIVE }).catch(() => undefined);
      return;
    }
    // Riding off or leaving the circle ends the countdown, and the warning goes with it.
    if (state.warnedAt === null) clearPrompt();
  });
  return () => { unsubMotion(); unsubRide(); clearPrompt(); };
}

/** Auto-end on arrival at Home or Work, and the battery-aware GPS profile. Tapping the warning notification means "keep recording". */
export function AutoEndHost() {
  const router = useRouter();
  const path = usePathname();
  const at = useRef(path);
  const go = useRef(router);
  useEffect(() => { at.current = path; go.current = router; }, [path, router]);
  useEffect(() => watchAutoEnd({ now: Date.now, liveShowing: () => liveShowingNow(at.current), replace: (p) => go.current.replace(p as never), setProfile: (p) => void setRecordingProfile(p) }), []);
  const tap = useTappedRoute();
  useEffect(() => { if (tap?.id === WARN_ID) useAutoEndPrompt.getState().keep(); }, [tap?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
