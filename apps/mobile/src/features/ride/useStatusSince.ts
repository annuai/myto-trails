import { useEffect, useRef, useState } from 'react';
import { nowMs } from '@/lib/clock';
import type { GroupRiderView } from '@/lib/groupCore';

/**
 * When this phone first saw each rider's current signal, by rider id, so that of two riders who both need a fuel stop the one who asked first is
 * listed first. A rider with no signal is not in it, and one who changes signal starts over. A signal already there when the screen opens counts
 * from then.
 */
export function useStatusSince(riders: GroupRiderView[]): Record<string, number> {
  const seen = useRef<Record<string, { status: string; at: number }>>({});
  const [since, setSince] = useState<Record<string, number>>({});
  const key = riders.map((r) => `${r.id}:${r.status}`).join(',');
  useEffect(() => {
    const now = nowMs();
    const next: Record<string, { status: string; at: number }> = {};
    for (const r of riders) if (r.status !== 'ok') next[r.id] = seen.current[r.id]?.status === r.status ? seen.current[r.id]! : { status: r.status, at: now };
    seen.current = next;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from the group's signals, which arrive outside React
    setSince(Object.fromEntries(Object.entries(next).map(([id, v]) => [id, v.at])));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return since;
}
