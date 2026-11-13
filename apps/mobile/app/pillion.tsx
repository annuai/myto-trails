import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { nowMs } from '@/lib/clock';
import { isVisitId, visitOf } from '@/lib/story/visits';
import { usePillion } from '@/store/pillion';

/**
 * Where a notification about Pillion lands (`/pillion?visit=waiting`). It shows that visit in the dialog over Home and steps out of the way,
 * so the rider is never left on an empty screen. An unknown visit just goes Home.
 */
export default function PillionLink() {
  const { visit } = useLocalSearchParams<{ visit?: string }>();
  const router = useRouter();
  useEffect(() => {
    if (isVisitId(visit)) usePillion.getState().show(visitOf(visit), `link:${visit}:${nowMs()}`, nowMs());
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [visit, router]);
  return null;
}
