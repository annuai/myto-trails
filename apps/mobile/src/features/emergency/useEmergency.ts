import { emergencyNumberFor, type EmergencyNumber } from '@/lib/emergencyNumber';
import { deviceRegion } from '@/lib/locale';
import { useLocation } from '@/store/location';
import { useRegion } from '@/store/region';

/** A position older than this is not where the rider is now. */
const FRESH_MS = 30 * 60_000;

export type EmergencyChoice = Omit<EmergencyNumber, 'source'> & { source: EmergencyNumber['source'] | 'edited' };

/** The number to dial right now: the rider's own edit if they made one this session, else the number for where they are. */
export function useEmergency(): EmergencyChoice {
  const override = useRegion((s) => s.emergencyOverride);
  // Staleness is decided when the position arrives or the screen next updates, not on every draw.
  const fix = useLocation((s) => (s.fix && Date.now() - s.fix.t < FRESH_MS ? s.fix : undefined));
  const position = fix ? { lat: fix.lat, lng: fix.lng } : null;
  const found = emergencyNumberFor(position, deviceRegion());
  return override ? { ...found, number: override, source: 'edited', note: 'You changed this number. It stays until you close the app.' } : found;
}
