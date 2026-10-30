import type { LatLng } from './geo';

/** A looping test route (no real place). Used for "Simulate GPS" so recording can be tried on a laptop. */
export function simPoint(i: number, origin: LatLng = { lat: 13.0, lng: 77.6 }, rate = 0.012): LatLng {
  const a = i * rate;
  return { lat: origin.lat + 0.02 * Math.sin(a) * Math.cos(a * 0.5), lng: origin.lng + 0.03 * Math.sin(a * 0.5), t: Date.now(), ele: 900 + 20 * Math.sin(a * 2) };
}

/** The id of the sample ride that test builds saved on every phone. It is no longer added. */
export const SAMPLE_RIDE_ID = 'sample-ride';

/** The rides without that old sample, for phones that saved it. */
export const withoutSampleRide = <T extends { id: string }>(rides: T[]): T[] => rides.filter((r) => r.id !== SAMPLE_RIDE_ID);
