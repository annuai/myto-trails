import { buildRide } from './buildRide';
import type { Journal } from './journal';
import type { Ride } from '@/store/rides';

export type FinishDeps = {
  journal: Journal;
  stopBackground: () => Promise<void>;
  /** Waits for fixes still being written to the journal. */
  flush: () => Promise<void>;
  /** Clears the live recorder's screen state. */
  reset: () => void;
  /** The id of an already saved ride that started at this time, if any. */
  findSaved: (startedAt: number) => string | undefined;
  addRide: (r: Omit<Ride, 'id'>) => string;
  /** Resolves once the saved rides are written to the phone's storage. */
  persist: () => Promise<void>;
  now: () => number;
};

/**
 * Turns the recording on disk into a saved ride. Recording is stopped and pending writes drained first. The journal
 * is emptied only after the ride is written to storage, so a failure leaves the ride recoverable. Calling it again
 * while it runs (a double tap) joins the same run, and a ride that is already saved is never saved twice.
 */
export function createFinisher(d: FinishDeps): () => Promise<string | undefined> {
  let running: Promise<string | undefined> | undefined;
  const run = async () => {
    await d.stopBackground();
    await d.flush();
    d.reset();
    const raw = await d.journal.read();
    if (!raw) return undefined;
    const ride = buildRide(raw, d.now());
    let id: string | undefined;
    if (ride) {
      id = d.findSaved(raw.meta.startedAt);
      if (!id) { id = d.addRide(ride); await d.persist(); }
    }
    await d.journal.clear();
    return id;
  };
  return () => {
    running ??= run().finally(() => { running = undefined; });
    return running;
  };
}
