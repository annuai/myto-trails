import { Vibration } from 'react-native';
import { BUZZ_MS, BUZZ_STARTS_MS } from './buzzPlan';

/** Three buzzes, for something the rider has to notice through gloves and wind: the break reminder. */
export function buzzThrice(): void {
  for (const start of BUZZ_STARTS_MS) setTimeout(() => Vibration.vibrate(BUZZ_MS), start);
}
