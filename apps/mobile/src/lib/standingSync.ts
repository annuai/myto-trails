import { setStandingOptIn, uploadSummaries } from '@/api/standing';
import { ApiFailure } from '@/api/client';
import { useAuth } from '@/store/auth';
import { useRides } from '@/store/rides';
import { useStandingPref } from '@/store/standingPref';
import { uploadQueued } from './standingSyncCore';
import { summaryOf } from './story/standing';

const OFFLINE = 'Could not reach Moto Trails. Your choice is saved and will be sent when you are back online.';
const OTHER = 'Could not update this just now. Try again later.';
const errorText = (e: unknown) => (e instanceof ApiFailure && e.code !== 'network' && e.code !== 'timeout' ? OTHER : OFFLINE);
let inflight: Promise<void> | undefined;

/** Tells the server the rider turned it off (it deletes the summaries). Kept pending until the server confirms. */
async function flushOptOut(token: string): Promise<boolean> {
  const pref = useStandingPref.getState();
  try { await setStandingOptIn(token, false); pref.clearPendingOptOut(); pref.setError(undefined); return true; }
  catch (e) { useStandingPref.getState().setError(errorText(e)); return false; }
}

/** One upload that, if the server says the rider is not opted in, sends the opt-in again once and retries. */
async function uploadWithRetry(token: string, rides: Parameters<typeof uploadSummaries>[1]): Promise<void> {
  try { await uploadSummaries(token, rides); }
  catch (e) {
    if (!(e instanceof ApiFailure && e.status === 409 && e.code === 'not_opted_in')) throw e;
    await setStandingOptIn(token, true);
    await uploadSummaries(token, rides);
  }
}

async function run(newRef?: string): Promise<void> {
  const token = useAuth.getState().token;
  if (!token) return;
  if (useStandingPref.getState().pendingOptOut) { await flushOptOut(token); return; }
  if (!useStandingPref.getState().optIn) return;
  if (newRef) useStandingPref.getState().enqueue([newRef]);
  try { await setStandingOptIn(token, true); } catch (e) { useStandingPref.getState().setError(errorText(e)); return; }
  let last: unknown;
  const ok = await uploadQueued({ token, pref: () => useStandingPref.getState(), rides: () => useRides.getState().rides, upload: (t, r) => uploadWithRetry(t, r).catch((e: unknown) => { last = e; throw e; }) });
  const pref = useStandingPref.getState();
  if (!pref.optIn) return;
  pref.setError(ok ? undefined : errorText(last));
  if (ok) await pref.refreshStanding(token);
}

/** Sends a pending opt-out, or (when on) the opt-in, queued rides and a cohort refresh. One at a time; does nothing signed out. Safe to call often. */
export function syncStanding(newRef?: string): Promise<void> {
  const prev = inflight;
  const p = (async () => { await prev?.catch(() => undefined); await run(newRef); })();
  inflight = p;
  return p.finally(() => { if (inflight === p) inflight = undefined; });
}

/** The rider's switch. On: queue the rides already in the log and sync (signed out, it is stored and sent after sign-in). Off: stop at once, wait for any upload in flight, then have the server delete. */
export async function chooseStanding(optIn: boolean): Promise<void> {
  const pref = useStandingPref.getState();
  pref.set(optIn);
  if (optIn) {
    pref.enqueue(useRides.getState().rides.filter((r) => summaryOf(r)).map((r) => r.id));
    await syncStanding();
    return;
  }
  await inflight?.catch(() => undefined);
  // Signed out, nothing ever reached a server, so there is nothing to delete later.
  if (!useAuth.getState().token) { useStandingPref.getState().clearPendingOptOut(); return; }
  await syncStanding(); // flushes the pending opt-out
}

const LEAVE_WAIT_MS = 3000;
/**
 * Before signing out or erasing: wait for any sync run in flight (so its opt-in PUT cannot land after ours), then tell the server "off" with the
 * OLD token, so "turn off and it is deleted" holds even for an offline opt-out. If that cannot be done (offline, or slow beyond a few seconds)
 * leaving is not blocked: that case is accepted, the summaries then stay on the server until the rider signs in again and turns it off.
 */
export async function flushStandingBeforeLeave(token: string | null): Promise<void> {
  const send = async () => {
    await inflight?.catch(() => undefined);
    const p = useStandingPref.getState();
    if (!token || !(p.pendingOptOut || p.optIn)) return;
    await setStandingOptIn(token, false);
  };
  await Promise.race([send().catch(() => undefined), new Promise<void>((r) => setTimeout(r, LEAVE_WAIT_MS))]);
}

/** App open: waits until the saved rides and the choice are read from the phone, so an empty store is never mistaken for the real one. */
export function syncStandingWhenReady(): () => void {
  const stores = [useStandingPref, useRides];
  const go = () => { if (stores.every((s) => s.persist.hasHydrated())) void syncStanding(); };
  const offs = stores.map((s) => s.persist.onFinishHydration(go));
  go();
  return () => offs.forEach((off) => off());
}
