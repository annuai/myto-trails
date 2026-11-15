import { Platform } from 'react-native';
import { RideAlarmNative } from '../../../modules/ride-alarm';
import type { AlarmStep } from './ladder';

/**
 * Where the rings go. `native`: Android's alarm clock, or AlarmKit on iOS 26+, which ring through silent mode and keep working with the
 * app closed. `notifications`: plain time-sensitive notifications with Snooze and I'm up buttons (older iOS, AlarmKit refused, Expo Go).
 */
export type AlarmBackend = 'native' | 'notifications';

export const nativeSupported = () => !!RideAlarmNative?.isSupported();

let cached: AlarmBackend | undefined;
/** The backend to use now. Native needs the rider's yes on iOS; on Android notification permission covers it. */
export async function alarmBackend(): Promise<AlarmBackend> {
  if (!RideAlarmNative?.isSupported()) return (cached = 'notifications');
  return (cached = (await RideAlarmNative.authorization()) === 'granted' ? 'native' : 'notifications');
}
export const lastBackend = () => cached;

/** Asks for alarms on iOS (AlarmKit's own prompt). Resolves the backend that will be used. */
export async function requestAlarms(): Promise<AlarmBackend> {
  if (RideAlarmNative?.isSupported() && Platform.OS === 'ios' && (await RideAlarmNative.authorization()) === 'undetermined') await RideAlarmNative.requestAuthorization();
  return alarmBackend();
}

/** What Android still needs from the rider for a proper alarm: exact timing, and the lock-screen alarm. Empty elsewhere. */
export function androidGaps(): ('exact' | 'fullScreen')[] {
  if (Platform.OS !== 'android' || !RideAlarmNative) return [];
  const gaps: ('exact' | 'fullScreen')[] = [];
  if (RideAlarmNative.canScheduleExact && !RideAlarmNative.canScheduleExact()) gaps.push('exact');
  if (RideAlarmNative.canUseFullScreen && !RideAlarmNative.canUseFullScreen()) gaps.push('fullScreen');
  return gaps;
}
export const openAndroidSetting = (gap: 'exact' | 'fullScreen') => (gap === 'exact' ? RideAlarmNative?.openExactAlarmSettings?.() : RideAlarmNative?.openFullScreenSettings?.());

let sent: string | undefined;
/** Hands the rings to the phone's alarm code, only when they changed. An empty list clears what was set. */
export async function setNativeAlarms(steps: AlarmStep[]): Promise<void> {
  if (!RideAlarmNative?.isSupported()) return;
  const json = JSON.stringify(steps);
  if (json === sent) return;
  await RideAlarmNative.replaceAll(json);
  sent = json;
}

/** The groups the rider got up for from the alarm itself, since the last call. */
export async function takeWoken(): Promise<{ group: string; at: number }[]> {
  if (!RideAlarmNative?.isSupported()) return [];
  try {
    const list = JSON.parse(await RideAlarmNative.takeWoken()) as unknown;
    return Array.isArray(list) ? list.filter((x): x is { group: string; at: number } => typeof x?.group === 'string' && typeof x?.at === 'number') : [];
  } catch { return []; }
}
