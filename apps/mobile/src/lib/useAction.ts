import { useCallback, useState } from 'react';
import { ApiFailure } from '@/api/client';

/** Runs one server action at a time and keeps its busy flag and plain-language problem, so a screen shows both. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<{ value: T } | undefined> => {
    setBusy(true); setProblem(undefined);
    try { return { value: await fn() }; }
    catch (e) { setProblem(e instanceof ApiFailure ? e.message : 'Something went wrong.'); return undefined; }
    finally { setBusy(false); }
  }, []);
  const clear = useCallback(() => setProblem(undefined), []);
  return { busy, problem, run, clear };
}
