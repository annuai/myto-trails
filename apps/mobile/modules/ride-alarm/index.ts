import { requireOptionalNativeModule } from 'expo';

/** One ring as the phone's alarm code keeps it (see src/lib/alarm/ladder.ts). */
export type NativeAlarmStep = { id: string; group: string; index: number; fireAt: number; title: string; body: string; snooze: boolean; route: string };
/** Whether the rider has allowed alarms: granted, denied, or not asked yet. */
export type AlarmAuthorization = 'granted' | 'denied' | 'undetermined';

type Native = {
  /** Android always; iOS from 26, where AlarmKit exists. */
  isSupported(): boolean;
  authorization(): Promise<AlarmAuthorization>;
  requestAuthorization(): Promise<boolean>;
  /** Cancels every ride alarm this app set and sets these. JSON, so the native side keeps it as one string. */
  replaceAll(stepsJson: string): Promise<void>;
  /** The groups the rider pressed "I'm up" on since the last call, as JSON `[{ group, at }]`; emptied by the call. */
  takeWoken(): Promise<string>;
  /** Android 12+: whether exact alarms are allowed (off by default from 14). */
  canScheduleExact?(): boolean;
  openExactAlarmSettings?(): void;
  /** Android 14+: whether the alarm may cover the lock screen. */
  canUseFullScreen?(): boolean;
  openFullScreenSettings?(): void;
};

/** Missing in Expo Go, on the web and in tests: the app then falls back to notifications. */
export const RideAlarmNative = requireOptionalNativeModule<Native>('RideAlarm');
