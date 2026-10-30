/**
 * The Rider OS structure (new tabs, Home and ride workspace) is behind this flag so the 0.8 app can be restored by turning it off
 * (docs/adr/0008). It is chosen when the app is built, not by the rider or the server: set EXPO_PUBLIC_RIDER_OS=1 for a build.
 */
export const riderOsOn = (env: { EXPO_PUBLIC_RIDER_OS?: string }): boolean => env.EXPO_PUBLIC_RIDER_OS === '1';

export const RIDER_OS = riderOsOn({ EXPO_PUBLIC_RIDER_OS: process.env.EXPO_PUBLIC_RIDER_OS });
