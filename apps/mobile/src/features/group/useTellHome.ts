import { useState } from 'react';
import { ApiFailure } from '@/api/client';
import { tellGroupHome } from '@/api/groups';
import { syncGroupNow } from '@/CompanionHost';
import { buzz } from '@/lib/haptics';
import { useAuth } from '@/store/auth';
import { useSeen } from '@/store/seen';

/** The key under which "I told this group I'm home" is remembered on this phone. */
export const homeKey = (groupId: string) => `home:${groupId}`;

/**
 * Telling a group you got home. Remembered per group, so the button turns into a check and stays that way. The server keeps only the moment:
 * no position. It works after the ride has ended and the rider has left the group.
 */
export function useTellHome(groupId: string) {
  const sent = useSeen((s) => !!s.played[homeKey(groupId)]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const tell = async () => {
    const token = useAuth.getState().token;
    if (!token) { setProblem('Sign in to tell the group.'); return; }
    setBusy(true); setProblem(undefined);
    try {
      await tellGroupHome(token, groupId);
      useSeen.getState().mark(homeKey(groupId));
      buzz.confirm();
      syncGroupNow();
    } catch (e) {
      setProblem(e instanceof ApiFailure ? (e.status === 404 ? 'That group ride has ended, so there is no one to tell.' : e.message) : 'Something went wrong.');
    } finally { setBusy(false); }
  };
  return { sent, busy, problem, tell };
}
