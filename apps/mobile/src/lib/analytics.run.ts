import { useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useSegments } from 'expo-router';
import PostHog from 'posthog-react-native';
import { screenPattern } from '@moto-trails/domain';
import { useAppearance } from '@/store/appearance';
import { hasAnalyticsClient, setAnalyticsClient, track } from './analytics';

/**
 * Starts usage statistics (PostHog, EU). Off in a development build, on the web build and without EXPO_PUBLIC_POSTHOG_KEY; on for riders
 * unless they turn "Usage statistics" off (You, Others). A random id kept on the phone, no person profile, no location lookup, no replay,
 * no tap capture.
 */
const isDevBuild = () => typeof __DEV__ !== 'undefined' && __DEV__;

/** Starts usage statistics when a PostHog key is set and this is not a development build. Returns whether it started. */
export function startAnalytics(key: string | undefined = process.env.EXPO_PUBLIC_POSTHOG_KEY, dev: boolean = isDevBuild()): boolean {
  if (hasAnalyticsClient()) return true;
  if (dev || Platform.OS === 'web' || !key?.trim()) return false;
  setAnalyticsClient(new PostHog(key.trim(), {
    host: 'https://eu.i.posthog.com',
    personProfiles: 'never',
    disableGeoip: true,
    captureAppLifecycleEvents: false,
    enableSessionReplay: false,
    defaultOptIn: useAppearance.getState().usageStats,
    customStorage: AsyncStorage,
    customAppProperties: (p) => ({ ...p, $app_version: Constants.expoConfig?.version ?? p.$app_version, $device_name: null }),
    flushAt: 20,
    flushInterval: 30_000,
  }));
  return true;
}

/** Sends `app_opened` once and `screen_viewed` with the route pattern (never a real id) on each screen change. Mounted in the root layout. */
export function useScreenTracking(): void {
  const screen = screenPattern(useSegments());
  useEffect(() => { track('app_opened'); }, []);
  useEffect(() => { track('screen_viewed', { screen }); }, [screen]);
}
