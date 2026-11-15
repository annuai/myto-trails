import { useEffect } from 'react';
import { useMe } from '@/api/useApi';
import type { Bike } from '@/api/types';
import { useMyBikeStore } from '@/store/myBike';

/** The rider's bike: the stored copy until the server answers, then the server's, which is saved for next time. `undefined` means not known yet. */
export function useMyBike(): { bike: Bike | null | undefined; me: ReturnType<typeof useMe> } {
  const me = useMe();
  const stored = useMyBikeStore((s) => s.bike);
  const fresh = me.data ? me.data.bike ?? null : undefined;
  useEffect(() => { if (fresh !== undefined) useMyBikeStore.getState().set(fresh); }, [fresh]);
  return { bike: fresh !== undefined ? fresh : stored, me };
}
