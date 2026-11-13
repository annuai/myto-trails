import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/react-native', () => ({ init: vi.fn(), wrap: (c: unknown) => c }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '1.0.0' } } }));
vi.mock('@/store/appearance', () => ({ useAppearance: { getState: () => ({ crashReports: true }) } }));

import * as Sentry from '@sentry/react-native';
import { startCrashReporting, withCrashReporting } from './crashReporting';

describe('crash reporting', () => {
  beforeEach(() => vi.clearAllMocks());
  it('stays off without a DSN', () => {
    expect(startCrashReporting('')).toBe(false);
    expect(startCrashReporting(undefined)).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });
  it('starts with a DSN and never sends default personal data', () => {
    expect(startCrashReporting('https://k@o0.ingest.sentry.io/1', false)).toBe(true);
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ sendDefaultPii: false, tracesSampleRate: 0 }));
  });
  it('stays off in a development build even with a DSN', () => {
    expect(startCrashReporting('https://k@o0.ingest.sentry.io/1', true)).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });
  it('hands the root component back', () => {
    const Root = () => null;
    expect(withCrashReporting(Root)).toBe(Root);
  });
});
