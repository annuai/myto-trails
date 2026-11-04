/**
 * The headers that name this app to the free map services it asks (the road router, the place search, the distance table). OpenStreetMap's
 * services expect every client to identify itself and may refuse one that does not. iOS adds the app's name on its own; Android's network
 * layer sends a generic client string, which is what blocked the ride card's map tiles. Name the app ourselves, the same on both.
 */
export const APP_HEADERS = { 'User-Agent': 'MytoMoto/0.10 (motorcycle trails app; https://moto-trails.com)' } as const;
