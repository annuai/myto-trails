import { setStandingOptIn, uploadSummaries } from '@/api/standing';
import { useAuth } from '@/store/auth';
import { useRides } from '@/store/rides';
import { useStandingPref } from '@/store/standingPref';
import { uploadQueued } from './standingSyncCore';
import { summaryOf } from './story/standing';

/** Queues rides that are not yet sent (every real ride, once the rider opts in), uploads, then refreshes the cohort. Safe to call often; does nothing while off or signed out. */
export async function syncStanding(newRef?: string): Promise<void> {
  const pref = useStandingPref.getState();
  const token = useAuth.getState().token;
  if (!pref.optIn || !token) return;
  if (newRef) pref.enqueue([newRef]);
  await uploadQueued({ token, pref: () => useStandingPref.getState(), rides: () => useRides.getState().rides, upload: uploadSummaries });
  await useStandingPref.getState().refreshStanding(token);
}

/** The rider's switch. Turning on queues the rides already in the log; turning off clears the queue and asks the server to delete what it holds. */
export async function chooseStanding(optIn: boolean): Promise<void> {
  const token = useAuth.getState().token;
  useStandingPref.getState().set(optIn);
  if (optIn) useStandingPref.getState().enqueue(useRides.getState().rides.filter((r) => summaryOf(r)).map((r) => r.id));
  if (token) { try { await setStandingOptIn(token, optIn); } catch { /* the switch is kept; the server learns at the next change */ } }
  if (optIn) await syncStanding();
}
