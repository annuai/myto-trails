/** The text sent by "Share my position" in the SOS actions: a map link when the phone has a position, plain words when it has none. */
export function sosMessage(position?: { lat: number; lng: number } | null): string {
  return position ? `I need help. My position: https://maps.google.com/?q=${position.lat.toFixed(5)},${position.lng.toFixed(5)}` : 'I need help. My position is not available.';
}
