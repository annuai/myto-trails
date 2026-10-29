/** The buttons on the ride notification, and what the notification says. No phone code here, so it is tested on its own (see rideNotification.ts). */
export type RideActionId = 'ride.pause' | 'ride.resume' | 'ride.help' | 'ride.undo-help';
export type RideAction = { id: RideActionId; label: string; /** Red on iOS. */ destructive?: boolean };
export type RideCategory = 'ride' | 'ride-paused' | 'ride-group' | 'ride-group-paused' | 'help-sent';

const PAUSE: RideAction = { id: 'ride.pause', label: 'Pause' };
const RESUME: RideAction = { id: 'ride.resume', label: 'Resume' };
const HELP: RideAction = { id: 'ride.help', label: 'Help', destructive: true };
const UNDO: RideAction = { id: 'ride.undo-help', label: 'Undo' };

/** Android shows at most three buttons, so a group ride has two and leaves room. */
export const CATEGORIES: Record<RideCategory, RideAction[]> = {
  ride: [PAUSE],
  'ride-paused': [RESUME],
  'ride-group': [PAUSE, HELP],
  'ride-group-paused': [RESUME, HELP],
  'help-sent': [UNDO],
};

export const RIDE_NOTICE_ID = 'ride-controls';
export const HELP_NOTICE_ID = 'help-sent';

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
