import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { scrubCrashEvent } from '@moto-trails/domain';
import { useAppearance } from '@/store/appearance';

/**
 * Starts crash reporting. Off without EXPO_PUBLIC_SENTRY_DSN (development, tests). Every report is scrubbed of personal data
 * (`scrubCrashEvent`) and dropped when the rider has turned "Crash reports" off, checked when the report is made, so the switch
 * works at once.
 */
export function startCrashReporting(dsn: string | undefined = process.env.EXPO_PUBLIC_SENTRY_DSN): boolean {
  if (!dsn?.trim()) return false;
  Sentry.init({
    dsn: dsn.trim(),
    release: Constants.expoConfig?.version,
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
