/**
 * Google Maps directions to a point. It needs no key and costs nothing: on a phone the link opens the Google Maps app when it is
 * installed, and the browser version when it is not. The destination is where the rider was last seen, not a live follow.
 */
export const mapsDirectionsUrl = (p: { lat: number; lng: number }): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(6)},${p.lng.toFixed(6)}&travelmode=driving`;
