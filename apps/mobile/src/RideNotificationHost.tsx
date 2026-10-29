import { useEffect } from 'react';
import { syncGroupNow } from '@/CompanionHost';
import { HELP_NOTICE_ID, helpSentNotice, helpUndoneNotice, rideNotice, RIDE_NOTICE_ID } from '@/lib/rideActions';
import { clearRideNotice, onRideAction, showRideNotice } from '@/lib/rideNotification';
import { useCompanion } from '@/store/companion';
import { useRecorder } from '@/store/recorder';

const quietly = () => undefined;

/**
 * While a ride is recording, a notification carries its controls: Pause or Resume, and on a group ride Help, so a rider can use them
 * from the lock screen without opening the app. Help tells the group at once and leaves a second notification with Undo. A pause made
 * here is the rider's own, so the ride stays paused until they resume it (auto-pause never undoes it).
 */
export function RideNotificationHost() {
  useEffect(() => {
    let shown = '';
    let helpShown = false;
    const refresh = () => {
      const rec = useRecorder.getState();
      const { group, live } = useCompanion.getState();
      const key = rec.status === 'running' ? `${rec.paused}:${!!group}` : '';
      if (key !== shown) {
        shown = key;
        if (key) void showRideNotice(RIDE_NOTICE_ID, rideNotice({ paused: rec.paused, group: !!group }), true).catch(quietly);
        else void clearRideNotice(RIDE_NOTICE_ID).catch(quietly);
      }
      // The Undo notice goes when the ride ends or help is cleared some other way (the group sheet).
      if (helpShown && (!key || live.myStatus !== 'help')) { helpShown = false; void clearRideNotice(HELP_NOTICE_ID).catch(quietly); }
    };
    refresh();
    const offs = [useRecorder.subscribe(refresh), useCompanion.subscribe(refresh)];
    const offAction = onRideAction((id) => {
      const rec = useRecorder.getState();
      const companion = useCompanion.getState();
      if (id === 'ride.pause') void rec.pause();
      else if (id === 'ride.resume') void rec.resume();
      else if (id === 'ride.help' && companion.group) {
        companion.setLive({ myStatus: 'help' });
        helpShown = true;
        syncGroupNow();
        void showRideNotice(HELP_NOTICE_ID, helpSentNotice, false).catch(quietly);
      } else if (id === 'ride.undo-help') {
        helpShown = false; // the notice is replaced below, not cleared
        companion.setLive({ myStatus: 'ok' });
        syncGroupNow();
        void showRideNotice(HELP_NOTICE_ID, helpUndoneNotice, false).catch(quietly);
      }
    });
    return () => { offs.forEach((f) => f()); offAction(); void clearRideNotice(RIDE_NOTICE_ID).catch(quietly); void clearRideNotice(HELP_NOTICE_ID).catch(quietly); };
  }, []);
  return null;
}
