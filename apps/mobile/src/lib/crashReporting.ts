import type React from 'react';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { scrubCrashEvent } from '@moto-trails/domain';
import { useAppearance } from '@/store/appearance';

/**
 * Starts crash reporting. Off in a development build and without EXPO_PUBLIC_SENTRY_DSN, so running the app from Xcode or Metro never fills
 * the real project with the developer's own errors. Every report is scrubbed of personal data
 * (`scrubCrashEvent`) and dropped when the rider has turned "Crash reports" off, checked when the report is made, so the switch
 * works at once.
 */
const isDevBuild = () => typeof __DEV__ !== 'undefined' && __DEV__;

export function startCrashReporting(dsn: string | undefined = process.env.EXPO_PUBLIC_SENTRY_DSN, dev: boolean = isDevBuild()): boolean {
  if (dev || !dsn?.trim()) return false;
  Sentry.init({
    dsn: dsn.trim(),
    release: Constants.expoConfig?.version,
    environment: 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    enableAutoSessionTracking: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    beforeSend: (event) => (useAppearance.getState().crashReports ? (scrubCrashEvent(event as unknown as Record<string, unknown>) as unknown as typeof event) : null),
    beforeBreadcrumb: (b) => (b.category === 'console' || b.category === 'xhr' || b.category === 'fetch' ? null : b),
  });
  return true;
}

/** Wraps the root component so an error a screen throws is reported before the app's error screen replaces it. A no-op while reporting is off. */
export const withCrashReporting = <T extends React.ComponentType<any>>(root: T): T => Sentry.wrap(root) as unknown as T;
