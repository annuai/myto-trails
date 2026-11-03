import { useEffect, useRef } from 'react';
import { useRootNavigationState, useRouter } from 'expo-router';
import { journal } from '@/lib/journalStore';
import { SIM_GROUP_ID } from '@/lib/groupSim';
import { lastFixAt, resumeAction } from '@/lib/resumeRide';
import { useCompanion } from '@/store/companion';
import { useRecorder } from '@/store/recorder';

/**
 * A ride that was under way when the app closed (a kill, a crash, the phone running out of memory) is taken up again as the app opens:
 * the recording, the group, and the live screen. A recording that has been silent for a long time is left for the rider to save or
 * discard from Home instead. Mounted once at the root; it acts once per launch.
 */
export function ResumeHost() {
  const router = useRouter();
  const navReady = !!useRootNavigationState()?.key;
  const done = useRef(false);
  useEffect(() => {
    if (!navReady || done.current) return;
    done.current = true;
    void (async () => {
      const rec = useRecorder.getState();
      if (rec.status === 'running') return;
      const r = await journal.read().catch(() => null);
      if (!r || resumeAction(lastFixAt(r), Date.now()) !== 'resume') return;
      await rec.recover();
      // A simulated group is never saved (it is made up), so it is made again and plays on from where the recording is.
      if (r.meta.source === 'sim' && !useCompanion.getState().group) useCompanion.getState().setGroup({ id: SIM_GROUP_ID, code: 'SIMGRP', name: 'Simulated group ride', role: 'leader' });
      router.replace('/ride/live');
    })();
  }, [navReady, router]);
  return null;
}
