import { useCallback, useEffect, useState } from 'react';
import { ApiFailure } from '@/api/client';
import { listMyRidden, type RiddenTrail } from '@/api/ridden';
import { useAuth } from '@/store/auth';

/** The trails the signed-in rider has marked as ridden. `items` is undefined until the first answer; `reload` asks again. */
export function useRidden() {
  const token = useAuth((s) => s.token);
  const [items, setItems] = useState<RiddenTrail[]>();
  const [error, setError] = useState<string>();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!token) return;
    let on = true;
    listMyRidden(token).then((r) => { if (on) { setItems(r); setError(undefined); } }).catch((e: unknown) => { if (on) setError(e instanceof ApiFailure ? e.message : 'Something went wrong.'); });
    return () => { on = false; };
  }, [token, tick]);
  return { items: token ? items : undefined, error, reload: useCallback(() => setTick((n) => n + 1), []) };
}
