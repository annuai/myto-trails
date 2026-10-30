import { countryConfig } from '@moto-trails/domain';
import { countryAt } from './countryBoundaries';

export type EmergencyNumber = {
  number: string;
  /** How it was chosen. The screen says so: a number must never look surer than it is. */
  source: 'position' | 'device_region' | 'fallback';
  iso2: string | null;
  others: { label: string; number: string }[];
  /** A sentence for the rider when the number is a best guess; null when it is certain. */
  note: string | null;
};

/** The general emergency number, dialled from any mobile in the EU, India and many other places. Used only when nothing better is known. */
export const GENERAL_NUMBER = '112';

const NO_POSITION = "Couldn't tell where you are, so this is the general emergency number. Change it if it is wrong here.";
const NO_NUMBER = "We don't have this country's emergency number yet, so this is the general one. Check it before you rely on it.";

/**
 * Which number to dial. Follows where the rider is now (offline, from bundled outlines), not where they live. With no position it
 * uses the phone's region; with neither it falls back to 112 and says so.
 */
export function emergencyNumberFor(position: { lat: number; lng: number } | null, deviceRegion: string | null): EmergencyNumber {
  if (position) {
    const iso2 = countryAt(position.lat, position.lng);
    const cfg = countryConfig(iso2);
    if (cfg) return { number: cfg.emergency.primary, source: 'position', iso2: cfg.iso2, others: cfg.emergency.others, note: null };
    return { number: GENERAL_NUMBER, source: 'fallback', iso2: null, others: [], note: NO_NUMBER };
  }
  const cfg = countryConfig(deviceRegion);
  if (cfg) return { number: cfg.emergency.primary, source: 'device_region', iso2: cfg.iso2, others: cfg.emergency.others, note: "We couldn't find your position, so this is the number for your phone's region." };
  return { number: GENERAL_NUMBER, source: 'fallback', iso2: null, others: [], note: NO_POSITION };
}

/** A number the rider typed: digits with an optional leading + and the * and # a few services use, 2 to 15 long. Null if it is not dialable. */
export function cleanDialNumber(raw: string): string | null {
  const t = raw.replace(/[\s().-]/g, '');
  return /^\+?[0-9*#]{2,15}$/.test(t) ? t : null;
}
