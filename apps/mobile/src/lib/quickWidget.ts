import { distanceKm } from './units';

/** Everything the home-screen quick-actions widget draws. Plain values only: the widget cannot run app code. */
export type QuickWidgetProps = {
  recording: boolean;
  paused: boolean;
  /** Distance so far, in `unit`; empty when not recording. */
  km: string;
  unit: string;
  /** Time riding as "1 h 05 min"; empty when not recording. */
  clock: string;
  /** In a group ride (the Group button then says so). */
  group: boolean;
};

/** The widget's state for the recorder and group now. A phone that is not recording shows the idle widget. */
export function quickWidgetProps(i: { recording: boolean; paused: boolean; group: boolean; elapsedMs: number; meters: number }): QuickWidgetProps {
  const d = distanceKm(i.recording ? i.meters / 1000 : 0);
  const min = Math.floor(i.elapsedMs / 60_000);
  const clock = !i.recording ? '' : min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
  return { recording: i.recording, paused: i.recording && i.paused, km: i.recording ? d.value : '', unit: d.unit, clock, group: i.group };
}

/** Where each quick action goes. The ride buttons while recording are events, handled by RideNotificationHost like the ride card's. */
export const QUICK_LINKS = {
  start: 'myto://ride?autostart=1',
  group: 'myto://ride?mode=group',
  checkin: 'myto://ride?checkin=1',
  /** While recording, SOS opens the ride's SOS sheet; the sheet only exists there, so otherwise the rider's emergency contacts. */
  sosRecording: 'myto://ride/live?sos=1',
  sosIdle: 'myto://documents/contacts',
} as const;
