/** The buttons on the ride notification, and what the notification says. No phone code here, so it is tested on its own (see rideNotification.ts). */
export type RideActionId = 'ride.pause' | 'ride.resume' | 'ride.help' | 'ride.undo-help' | 'crash.ok';
export type RideAction = { id: RideActionId; label: string; /** Red on iOS. */ destructive?: boolean };
export type RideCategory = 'ride' | 'ride-paused' | 'ride-group' | 'ride-group-paused' | 'help-sent' | 'crash';

const PAUSE: RideAction = { id: 'ride.pause', label: 'Pause' };
const RESUME: RideAction = { id: 'ride.resume', label: 'Resume' };
const HELP: RideAction = { id: 'ride.help', label: 'Help', destructive: true };
const UNDO: RideAction = { id: 'ride.undo-help', label: 'Undo' };
const CRASH_OK: RideAction = { id: 'crash.ok', label: "I'm OK" };

/** Android shows at most three buttons, so a group ride has two and leaves room. */
export const CATEGORIES: Record<RideCategory, RideAction[]> = {
  ride: [PAUSE],
  'ride-paused': [RESUME],
  'ride-group': [PAUSE, HELP],
  'ride-group-paused': [RESUME, HELP],
  'help-sent': [UNDO],
  crash: [CRASH_OK],
};

export const RIDE_NOTICE_ID = 'ride-controls';
export const HELP_NOTICE_ID = 'help-sent';
export const CRASH_NOTICE_ID = 'crash-alert';

export type RideNotice = { title: string; body: string; category?: RideCategory };

/** What the ride notification shows now: it follows whether the ride is paused and whether it is a group ride. */
export function rideNotice(i: { paused: boolean; group: boolean }): RideNotice & { category: RideCategory } {
  const category: RideCategory = i.group ? (i.paused ? 'ride-group-paused' : 'ride-group') : i.paused ? 'ride-paused' : 'ride';
  return i.paused
    ? { category, title: 'Ride paused', body: 'Nothing is recorded until you resume.' }
    : { category, title: 'Recording your ride', body: i.group ? 'Group ride. Tap to open it.' : 'Tap to open your ride.' };
}

/** Shown after Help is pressed: the group has been told, and Undo is the way out of a slip. */
export const helpSentNotice: RideNotice & { category: RideCategory } = { category: 'help-sent', title: 'Help sent to your group', body: 'Tap Undo if you pressed it by mistake.' };
export const helpUndoneNotice: RideNotice = { title: 'Help cancelled', body: 'Your group sees you as all good.' };

export const isRideAction = (id: string): id is RideActionId => Object.values(CATEGORIES).some((as) => as.some((a) => a.id === id));

/** The countdown after a crash is detected, and what it says once nobody answered. The detector is lib/crashDetect. */
export const crashNotice: RideNotice & { category: RideCategory } = { category: 'crash', title: 'Crash detected. Are you OK?', body: 'Tap I\'m OK now, or your group will be told and you can call for help.' };
export const crashAlertedNotice = (callName?: string): RideNotice & { category: RideCategory } => ({ category: 'crash', title: 'Crash alert sent', body: callName ? `Open Myto Moto to call ${callName} or 112.` : 'Open Myto Moto to call 112.' });

/** Everything the ride card on the lock screen (iOS Live Activity) and in the shade (Android) shows. Plain values only: the card draws them. */
export type RideSurfaceProps = {
  title: string;
  paused: boolean;
  /** When the clock would have started had the ride never paused, in ms. iOS counts up from it by itself; 0 while paused. */
  since: number;
  /** The time riding as 1:05:09, for while paused. */
  clock: string;
  /** The time riding as "1 h 05 min", for Android, which cannot tick by itself. */
  clockShort: string;
  km: string;
  group: boolean;
  /** The first button: Pause, or Resume once paused. */
  primaryId: RideActionId;
  primaryLabel: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** 1:05:09 or 5:09. */
export function clockText(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** "1 h 05 min" or "5 min". */
export function clockShortText(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)} min` : `${m} min`;
}

/** The card for a ride in progress. Solo or group, trip or not, Pause (or Resume) is always its first button. */
export function rideSurfaceProps(i: { paused: boolean; group: boolean; elapsedMs: number; meters: number; now: number }): RideSurfaceProps {
  const first = i.paused ? RESUME : PAUSE;
  return {
    title: i.paused ? 'Ride paused' : 'Recording your ride',
    paused: i.paused,
    since: i.paused ? 0 : i.now - i.elapsedMs,
    clock: clockText(i.elapsedMs),
    clockShort: clockShortText(i.elapsedMs),
    km: (i.meters / 1000).toFixed(1),
    group: i.group,
    primaryId: first.id,
    primaryLabel: first.label,
  };
}
