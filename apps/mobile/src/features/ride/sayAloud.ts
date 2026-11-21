import * as Speech from 'expo-speech';
import { deviceLocale } from '@/lib/locale';
import { useRoutePrefs } from '@/store/routePrefs';

/** Says a short line aloud when the rider has voice on. No speech engine is not an error: the screen already shows the words. */
export function sayAloud(text: string): void {
  if (!useRoutePrefs.getState().voice) return;
  try { Speech.speak(text, { language: deviceLocale(), rate: 1.0 }); } catch { /* the card shows it */ }
}
