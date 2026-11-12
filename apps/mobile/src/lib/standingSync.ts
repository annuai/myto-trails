import { setStandingOptIn, uploadSummaries } from '@/api/standing';
import { ApiFailure } from '@/api/client';
import { useAuth } from '@/store/auth';
import { useRides } from '@/store/rides';
import { useStandingPref } from '@/store/standingPref';
import { uploadQueued } from './standingSyncCore';
import { summaryOf } from './story/standing';

const OFFLINE = 'Could not reach Moto Trails. Your choice is saved and will be sent when you are back online.';
let inflight: Promise<void> | undefined;

/** Tells the server the rider turned it off (it deletes the summaries). Kept pending until the server confirms. */
async function flushOptOut(token: string): Promise<boolean> {
  const pref = useStandingPref.getState();
  try { await setStandingOptIn(token, false); pref.clearPendingOptOut(); pref.setError(undefined); return true; }
  catch { useStandingPref.getState().setError(OFFLINE); return false; }
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
  try { await setStandingOptIn(token, true); } catch { useStandingPref.getState().setError(OFFLINE); return; }
  const ok = await uploadQueued({ token, pref: () => useStandingPref.getState(), rides: () => useRides.getState().rides, upload: uploadWithRetry });
  const pref = useStandingPref.getState();
  if (!pref.optIn) return;
  pref.setError(ok ? undefined : OFFLINE);
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
  await syncStanding(); // flushes the pending opt-out
}

/** App open: waits until the saved rides and the choice are read from the phone, so an empty store is never mistaken for the real one. */
export function syncStandingWhenReady(): () => void {
  const stores = [useStandingPref, useRides];
  const go = () => { if (stores.every((s) => s.persist.hasHydrated())) void syncStanding(); };
  const offs = stores.map((s) => s.persist.onFinishHydration(go));
  go();
  return () => offs.forEach((off) => off());
}
