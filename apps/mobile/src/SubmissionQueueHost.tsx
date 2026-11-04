import { useEffect } from 'react';
import { AppState } from 'react-native';
import { ApiFailure } from '@/api/client';
import { trimEnds } from '@/lib/geo';
import { submitRide } from '@/lib/submit';
import { dueSubmission, removeSubmission, retryLater } from '@/lib/submissionQueue';
import { useAuth } from '@/store/auth';
import { useRides } from '@/store/rides';
import { useSubmissionQueue } from '@/store/submissionQueue';

/** The server said no for good (a bad form, not a bad signal): trying again would only repeat the answer. */
const permanent = (e: unknown) => e instanceof ApiFailure && e.status >= 400 && e.status < 500 && ![401, 403, 408, 429].includes(e.status);

let running = false;

/** Sends the next queued submission if it is due. Safe to call often: only one runs at a time. */
async function flush() {
  if (running) return;
  const token = useAuth.getState().token;
  if (!token) return;
  running = true;
  try {
    const set = (q: ReturnType<typeof removeSubmission>) => useSubmissionQueue.getState().setItems(q);
    for (let item = dueSubmission(useSubmissionQueue.getState().items, Date.now()); item; item = dueSubmission(useSubmissionQueue.getState().items, Date.now())) {
      const ride = useRides.getState().rides.find((r) => r.id === item.rideId);
      if (!ride) { set(removeSubmission(useSubmissionQueue.getState().items, item.rideId)); continue; }
      try {
        const res = await submitRide(token, { ...item.form, clientId: item.clientId, points: trimEnds(ride.points, item.trim), waypoints: ride.waypoints });
        useRides.getState().setSubmission(ride.id, { status: 'submitted', at: Date.now(), trailName: item.form.name, slug: res.slug, clientId: item.clientId });
        set(removeSubmission(useSubmissionQueue.getState().items, item.rideId));
      } catch (e) {
        if (permanent(e)) {
          useRides.getState().setSubmission(ride.id, { status: 'failed', at: Date.now(), trailName: item.form.name, slug: '', clientId: item.clientId, error: e instanceof Error ? e.message : 'The site did not accept it.' });
          set(removeSubmission(useSubmissionQueue.getState().items, item.rideId));
        } else {
          set(retryLater(useSubmissionQueue.getState().items, item.rideId, Date.now()));
          if (e instanceof ApiFailure && e.status === 0) break; // no signal: the rest would fail too
        }
      }
    }
  } finally { running = false; }
}

/** Sends trail submissions that were queued without a signal: on start, when the app comes back, every half minute, and as soon as one is queued. */
export function SubmissionQueueHost() {
  useEffect(() => {
    void flush();
    const timer = setInterval(() => void flush(), 30_000);
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') void flush(); });
    const unsub = useSubmissionQueue.subscribe((s, prev) => { if (s.items.length > prev.items.length) void flush(); });
    return () => { clearInterval(timer); app.remove(); unsub(); };
  }, []);
  return null;
}
