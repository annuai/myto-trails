import type { LatLng } from './geo';

/** A made-up ride of about 12 km: an out-and-back loop with a bend, near Bengaluru. Used only by the motion preview screen. */
export function demoRoute(points = 160): LatLng[] {
  const centre = { lat: 12.9716, lng: 77.5946 };
  return Array.from({ length: points }, (_, i) => {
    const a = (i / (points - 1)) * Math.PI * 2;
    return { lat: centre.lat + 0.035 * Math.sin(a) * (1 + 0.35 * Math.cos(2 * a)), lng: centre.lng + 0.05 * Math.sin(a) * Math.cos(a) * 2 + 0.03 * Math.sin(a / 2) };
  });
}

/** Stops along the demo route. */
export const demoStops = (route: LatLng[]): LatLng[] => [route[Math.floor(route.length * 0.3)]!, route[Math.floor(route.length * 0.62)]!];
