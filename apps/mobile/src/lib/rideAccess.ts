export type RideAccessState = 'always' | 'foreground' | 'denied' | 'unknown';

/**
 * Whether the rider has to finish in the phone's Settings after the app asked for Always location.
 * iOS asks once and then leaves it to Settings, so a second answer of "foreground" means it will not ask again. Android 11 and newer
 * never shows the "all the time" question at all: it answers at once and the rider must choose "Allow all the time" in Settings.
 * Treating that answer as good enough is how a first ride began without background access and stopped recording when the screen locked.
 */
export function needsSettings(before: RideAccessState, now: RideAccessState, os: string): boolean {
  if (now === 'always') return false;
  if (now === 'denied') return true;
  return os === 'android' || before === 'foreground';
}
