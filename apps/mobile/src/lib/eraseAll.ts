import { arriveCheckin } from '@/api/checkins';
import { deleteSharedRoute } from '@/api/sharedRoutes';
import { traceDelete } from '@/lib/motionTraceFile';
import { eraseDocumentPhotos } from '@/lib/backup/device';
import { sharedIdOf } from '@/lib/shareRoute';
import { signOut } from '@/lib/signIn';
import { useCompanion } from '@/store/companion';
import { useFuel } from '@/store/fuel';
import { useJournal } from '@/store/journal';
import { useMyRoutes } from '@/store/myRoutes';
import { useNotifications } from '@/store/notifications';
import { useProfile } from '@/store/profile';
import { useRides } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { useTrailStore } from '@/store/trails';
import { useTrips } from '@/store/trips';

/**
 * Erase all my data: everything this app keeps on the phone, and what is on the server because of it. An open check-in is closed (so
 * nobody is told the rider is overdue) and shared route links stop working. The account itself stays; deleting that is a separate step.
 */
export function eraseEverything(token: string | null) {
  const checkin = useCompanion.getState().checkin;
  if (token && checkin) void arriveCheckin(token, checkin.id).catch(() => undefined);
  if (token) for (const r of useMyRoutes.getState().routes) if (r.sharedUrl) void deleteSharedRoute(token, sharedIdOf(r.sharedUrl)).catch(() => undefined);
  eraseDocumentPhotos();
  useJournal.getState().wipe();
  useNotifications.getState().wipe();
  useCompanion.getState().wipe();
  useMyRoutes.getState().wipe();
  useTrips.getState().wipe();
  useFuel.getState().wipe();
  traceDelete();
  useProfile.getState().wipe();
  useTodos.setState({ todos: [] });
  useRides.setState({ rides: [] });
  useTrailStore.getState().clear();
  void signOut();
}
