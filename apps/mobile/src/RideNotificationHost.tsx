import { useEffect } from 'react';
import { Linking } from 'react-native';
import { syncGroupNow } from '@/CompanionHost';
import { HELP_NOTICE_ID, helpSentNotice, helpUndoneNotice, rideNotice, rideSurfaceProps, RIDE_NOTICE_ID, type RideActionId } from '@/lib/rideActions';
import { clearRideNotice, onRideAction, showRideNotice } from '@/lib/rideNotification';
import { clearRideSurface, onSurfaceAction, showRideSurface } from '@/lib/rideSurface';
import { useCompanion } from '@/store/companion';
import { useCrash } from '@/store/crash';
import { useRecorder } from '@/store/recorder';

const quietly = () => undefined;
/** The ride screen with its SOS sheet open. */
const SOS_URL = 'myto://ride/live?sos=1';
/** How often the distance on the card is refreshed. The clock needs no refresh on iPhone; Android shows whole minutes. */
const CARD_REFRESH_MS = 30_000;

/**
 * While a ride is recording, a card carries its controls (a Live Activity on iPhone, an ongoing notification on Android, always on
 * screen). Where the card cannot be shown, an ordinary notification carries them instead: Pause or Resume, and on a group ride Help, so a rider can use them
 * from the lock screen without opening the app. Help tells the group at once and leaves a second notification with Undo. A pause made
 * here is the rider's own, so the ride stays paused until they resume it (auto-pause never undoes it).
 */
export function RideNotificationHost() {
  useEffect(() => {
    let shown = '';
    let helpShown = false;
    // The card is up (and the ordinary notification is not), or the ordinary notification stands in for it.
    const show = () => {
      const rec = useRecorder.getState();
      const group = !!useCompanion.getState().group;
      const now = Date.now();
      void showRideSurface(rideSurfaceProps({ paused: rec.paused, group, elapsedMs: rec.elapsedMs(now), meters: rec.meters, now })).then((up) => {
        if (shown === '') return; // the ride ended while this was in flight
        if (up) void clearRideNotice(RIDE_NOTICE_ID).catch(quietly);
        else void showRideNotice(RIDE_NOTICE_ID, rideNotice({ paused: rec.paused, group }), true).catch(quietly);
      }).catch(quietly);
    };
    const refresh = () => {
      const rec = useRecorder.getState();
      const { group, live } = useCompanion.getState();
      const key = rec.status === 'running' ? `${rec.paused}:${!!group}` : '';
      if (key !== shown) {
        shown = key;
        if (key) show();
        else { void clearRideSurface().catch(quietly); void clearRideNotice(RIDE_NOTICE_ID).catch(quietly); }
      }
      // The Undo notice goes when the ride ends or help is cleared some other way (the group sheet).
      if (helpShown && (!key || live.myStatus !== 'help')) { helpShown = false; void clearRideNotice(HELP_NOTICE_ID).catch(quietly); }
    };
    const tick = setInterval(() => { if (shown) show(); }, CARD_REFRESH_MS);
    refresh();
    const offs = [useRecorder.subscribe(refresh), useCompanion.subscribe(refresh)];
    const act = (id: RideActionId) => {
      const rec = useRecorder.getState();
      const companion = useCompanion.getState();
      if (id === 'crash.ok') useCrash.getState().cancel();
      else if (id === 'ride.pause') void rec.pause();
      else if (id === 'ride.resume') void rec.resume();
      else if (id === 'ride.help' && companion.group) {
        companion.setLive({ myStatus: 'help' });
        helpShown = true;
        syncGroupNow();
        void showRideNotice(HELP_NOTICE_ID, helpSentNotice, false).catch(quietly);
      } else if (id === 'ride.help') {
        // Solo: no group to tell, so the rider gets the SOS sheet.
        void Linking.openURL(SOS_URL).catch(quietly);
      } else if (id === 'ride.undo-help') {
        helpShown = false; // the notice is replaced below, not cleared
        companion.setLive({ myStatus: 'ok' });
        syncGroupNow();
        void showRideNotice(HELP_NOTICE_ID, helpUndoneNotice, false).catch(quietly);
      }
    };
    const offAction = onRideAction(act);
    const offSurface = onSurfaceAction(act);
    return () => { clearInterval(tick); offs.forEach((f) => f()); offAction(); offSurface(); void clearRideSurface().catch(quietly); void clearRideNotice(RIDE_NOTICE_ID).catch(quietly); void clearRideNotice(HELP_NOTICE_ID).catch(quietly); };
  }, []);
  return null;
}
