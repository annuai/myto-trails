import { useEffect } from 'react';
import { AppState } from 'react-native';
import { ApiFailure } from '@/api/client';
import { arriveCheckin, pingCheckin } from '@/api/checkins';
import { postConditionReport } from '@/api/conditionReports';
import { leaveGroupRide, syncGroupRide } from '@/api/groups';
import { shouldPing, type LastPing } from '@/lib/checkinCore';
import { markFailed, markSent, nextBatch } from '@/lib/conditions';
import { pollIntervalMs, signalChanges, signalNotice } from '@/lib/groupCore';
import { notifier } from '@/lib/notifier';
import { startAutoPause, stepAutoPause } from '@/lib/autoPause';
import { startPrompt, stepPrompt } from '@/lib/stoppedPrompt';
import { useAuth } from '@/store/auth';
import { useCompanion } from '@/store/companion';
import { useLocation } from '@/store/location';
import { useMotion } from '@/store/motion';
import { useNotifications } from '@/store/notifications';
import { useRecorder } from '@/store/recorder';

const iso = (t: number) => new Date(t).toISOString();
/**
 * The server refused for good: not a bad signal, not a busy server, and not a sign-in that may be fixed (an expired or revoked
 * token, or a welcome step not finished yet), because the rider can put that right and the report should still be there.
 */
const permanent = (e: unknown) => e instanceof ApiFailure && e.status >= 400 && e.status < 500 && ![401, 403, 408, 429].includes(e.status);

/** The ride paused itself (opt-in auto-pause): it is still the rider's ride, so the "Are you OK?" watch and the group keep going. */
const flags = { autoPaused: false, arrivePending: false };

/** Closes the check-in. If it cannot be reached it stays, on the Dash, and is tried again, so a missed "arrived" is never silent. */
async function arrive() {
  const { checkin } = useCompanion.getState();
  const token = useAuth.getState().token;
  if (!checkin || !token) { flags.arrivePending = false; return; }
  try { await arriveCheckin(token, checkin.id); useCompanion.getState().setCheckin(null); flags.arrivePending = false; }
  catch (e) { if (permanent(e)) { useCompanion.getState().setCheckin(null); flags.arrivePending = false; } else flags.arrivePending = true; }
}

/** Sends the condition reports that were queued without a signal, a few at a time. */
async function flushOutbox() {
  const token = useAuth.getState().token;
  if (!token) return;
  for (const item of nextBatch(useCompanion.getState().outbox, Date.now())) {
    const { slug, tries: _t, nextAt: _n, ...body } = item;
    try {
      await postConditionReport(token, slug, body);
      useCompanion.getState().setOutbox(markSent(useCompanion.getState().outbox, item.clientId));
    } catch (e) {
      useCompanion.getState().setOutbox(markFailed(useCompanion.getState().outbox, item.clientId, Date.now(), permanent(e)));
      if (e instanceof ApiFailure && e.status === 0) break; // no signal: the rest would fail too
    }
  }
}

/**
 * A rider in the group changed their signal: say so, with the rider's name ("Annuai is asking for help"). A call for help always shows
 * its words, even when details are hidden on the lock screen; the others follow that setting. It is also kept in the history.
 * Nothing is sent from the server: this runs when the phone next looks at the group, which is while a ride keeps the app alive.
 */
function tellAboutSignals(changes: ReturnType<typeof signalChanges>) {
  const { prefs, push } = useNotifications.getState();
  if (!prefs.groupSignals) return;
  const now = Date.now();
  const route = useRecorder.getState().status === 'running' ? '/ride/live' : '/ride';
  for (const c of changes) {
    const n = signalNotice(c);
    if (!n) continue;
    const id = `group:${c.rider.id}:${c.to}:${now}`;
    const lock = 'A rider in your group sent a signal';
    push({ id, fireAt: now, title: n.title, body: n.body, lock, route, kind: 'ride' }, now);
    const show = prefs.showDetails || c.to === 'help';
    void notifier.notifyNow({ id, fireAt: now, title: show ? n.title : 'Myto Moto', body: show ? n.body : lock, route }).catch(() => undefined);
  }
}

/**
 * What runs alongside a ride, mounted once at the root: tells the check-in where the rider is and closes it when the ride ends,
 * keeps the group ride's map current, sends queued condition reports, and asks "Are you OK?" after a long stop.
 */
export function CompanionHost() {
  useEffect(() => {
    // Check-in: a position every minute or so while riding, and "arrived" when the ride ends.
    let last: LastPing | null = null;
    const unsubRide = useRecorder.subscribe((s, prev) => {
      const { checkin, group } = useCompanion.getState();
      const token = useAuth.getState().token;
      if (prev.status === 'running' && s.status === 'idle') {
        last = null;
        if (checkin && token) void arrive();
        // A member leaves. The leader keeps the group, so they can still end it from the Dash or the Ride screen.
        if (group && token && group.role !== 'leader') { void leaveGroupRide(token, group.id).catch(() => undefined); useCompanion.getState().setGroup(null); }
        return;
      }
      if (s.status !== 'running' || s.paused || s.points.length === prev.points.length || !checkin || !token) return;
      const p = s.points[s.points.length - 1];
      const now = Date.now();
      if (!shouldPing(now, p, last)) return;
      last = { at: now, position: p };
      void pingCheckin(token, checkin.id, { lat: p.lat, lng: p.lng, at: iso(now) }).catch(() => undefined);
    });

    // Group ride: send my position and signal, get everyone's, then wait as long as the situation allows.
    let groupTimer: ReturnType<typeof setTimeout> | undefined;
    const pollGroup = async () => {
      const { group, live } = useCompanion.getState();
      const token = useAuth.getState().token;
      if (!group || !token) return;
      const rec = useRecorder.getState();
      const p = rec.status === 'running' && (!rec.paused || flags.autoPaused) ? rec.points[rec.points.length - 1] : undefined;
      try {
        const r = await syncGroupRide(token, group.id, { ...(p ? { lat: p.lat, lng: p.lng, at: iso(Date.now()) } : {}), status: live.myStatus });
        const before = useCompanion.getState().live.riders;
        useCompanion.getState().setLive({ riders: r.riders, me: r.me, regroup: r.regroup, error: undefined });
        tellAboutSignals(signalChanges(before, r.riders, r.me));
        if (r.ended) useCompanion.getState().setGroup(null);
      } catch (e) {
        useCompanion.getState().setLive({ error: e instanceof ApiFailure ? e.message : 'Cannot reach the group.' });
        if (e instanceof ApiFailure && (e.status === 403 || e.status === 404)) useCompanion.getState().setGroup(null);
      }
    };
    const loop = () => {
      void pollGroup().finally(() => {
        const { group, live } = useCompanion.getState();
        if (!group) { groupTimer = setTimeout(loop, 5000); return; }
        groupTimer = setTimeout(loop, pollIntervalMs({ moving: useRecorder.getState().moving, anyHelp: live.riders.some((r) => r.status === 'help'), backgrounded: AppState.currentState !== 'active' }));
      });
    };
    loop();

    // Reports queued without a signal.
    const retry = () => { void flushOutbox(); if (flags.arrivePending && useRecorder.getState().status === 'idle') void arrive(); };
    const outboxTimer = setInterval(retry, 30_000);
    const app = AppState.addEventListener('change', (st) => { if (st === 'active') retry(); });
    void flushOutbox();

    // "Are you OK?": ask once when the bike has stood still for ten minutes.
    let prompt = startPrompt;
    const promptTimer = setInterval(() => {
      const rec = useRecorder.getState();
      const r = stepPrompt(prompt, { now: Date.now(), running: rec.status === 'running', paused: rec.paused && !flags.autoPaused, stopped: useMotion.getState().stopped });
      prompt = r.state;
      if (r.ask) void notifier.notifyNow({ id: 'are-you-ok', fireAt: Date.now(), title: 'Are you OK?', body: 'You have been stopped for 10 minutes. Tap to open your ride.', route: '/ride/live' }).catch(() => undefined);
    }, 30_000);

    // Opt-in: pause after five minutes still (saves battery and keeps a tea break out of the time), and carry on when the bike moves.
    let auto = startAutoPause;
    const autoTimer = setInterval(() => {
      const rec = useRecorder.getState();
      const fix = useLocation.getState().fix;
      const now = Date.now();
      const movingFast = !!fix && now - fix.t < 10_000 && (fix.speed ?? 0) * 3.6 >= 8;
      const r = stepAutoPause(auto, { now, enabled: useCompanion.getState().autoPause, running: rec.status === 'running', paused: rec.paused, stopped: useMotion.getState().stopped, movingFast });
      auto = r.state;
      flags.autoPaused = auto.pausedAt !== null;
      if (r.action === 'pause') { void rec.pause(); void notifier.notifyNow({ id: 'auto-pause', fireAt: now, title: 'Ride paused', body: 'You have been still for 5 minutes. It carries on when you move.', route: '/ride/live' }).catch(() => undefined); }
      if (r.action === 'resume') void rec.resume();
    }, 5000);

    return () => { unsubRide(); clearTimeout(groupTimer); clearInterval(outboxTimer); clearInterval(promptTimer); clearInterval(autoTimer); app.remove(); flags.autoPaused = false; };
  }, []);
  return null;
}
