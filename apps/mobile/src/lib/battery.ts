import { Platform } from 'react-native';
import * as Battery from 'expo-battery';
import { useBattery } from '@/store/battery';

/** Keeps the battery store current while the app runs. Returns the stop function. The web build has no battery to read. */
export function watchBattery(): () => void {
  if (Platform.OS === 'web') return () => undefined;
  let live = true;
  const read = async () => {
    try {
      const [level, state] = await Promise.all([Battery.getBatteryLevelAsync(), Battery.getBatteryStateAsync()]);
      if (!live) return;
      // -1 means the phone does not say.
      useBattery.getState().set(level >= 0 ? Math.round(level * 100) : null, state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL);
    } catch { /* no battery to read: nothing is sent */ }
  };
  void read();
  const level = Battery.addBatteryLevelListener(() => void read());
  const state = Battery.addBatteryStateListener(() => void read());
  return () => { live = false; level.remove(); state.remove(); };
}
