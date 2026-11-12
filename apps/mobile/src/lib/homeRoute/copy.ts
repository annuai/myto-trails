import type { HomeOffer } from './types';

/** What the "Ride home" offer says. Plain, one reason. It never names the saved place or where it is: it is not given either. */
export function homeCopy(o: HomeOffer, i: { etaMin?: number; sunsetClock?: string }): { title: string; body: string } {
  const eta = i.etaMin !== undefined ? `About ${Math.max(1, Math.round(i.etaMin))} min home.` : 'Tap to ride home.';
  switch (o.reason) {
    case 'dusk':
      return { title: 'Daylight is running out', body: `${i.sunsetClock ? `Sunset is at ${i.sunsetClock}. ` : 'Sunset is close. '}${eta}` };
    case 'ride-ended':
      return { title: 'Ride home?', body: `Your ride just ended. ${eta}` };
    case 'usual-time':
      return { title: 'Heading home?', body: `This is about when you usually ride. ${eta}` };
  }
}
