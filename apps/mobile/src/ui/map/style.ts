import { fixed } from '@/theme/tokens';

// The maps come from OpenFreeMap (https://openfreemap.org): free, no key, no limit on views, and it allows an app to download an area
// for offline use (at most 3,000 tiles or 50 MB at a time, 4 requests in parallel). Its attribution is added by MapLibre.
// OpenStreetMap's own tile servers are not used for the app's maps: they forbid bulk downloads and heavy use.
// Set EXPO_PUBLIC_MAP_STYLE_URL to use another provider or our own tiles (docs/runbooks/self-hosted-map-tiles.md).
export const MAP_STYLE_URL = process.env.EXPO_PUBLIC_MAP_STYLE_URL;
export const OPENFREEMAP = 'https://tiles.openfreemap.org/styles';
/** The map style for light screens and for the dark live-ride screen. */
export const mapStyleUrl = (dark?: boolean): string => MAP_STYLE_URL || `${OPENFREEMAP}/${dark ? 'dark' : 'liberty'}`;

export const ROUTE_COLOR = fixed.route;
export const TRACK_COLOR = fixed.track;
