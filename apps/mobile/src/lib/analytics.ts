import { scrubAnalyticsProps, type AnalyticsEventName, type AnalyticsProps } from '@moto-trails/domain';
import { useAppearance } from '@/store/appearance';

/**
 * Anonymous usage statistics: what the app sends and the rider's switch. PostHog itself is started in `analytics.run.ts`, so code that
 * only tracks an event does not load it. Every prop goes through `scrubAnalyticsProps` first (docs/11-security-and-moderation.md).
 */
export type AnalyticsClient = { capture: (name: string, props: AnalyticsProps) => void; optIn: () => unknown; optOut: () => unknown };
let client: AnalyticsClient | null = null;

export const setAnalyticsClient = (c: AnalyticsClient | null) => { client = c; };
export const hasAnalyticsClient = () => client !== null;

/** Sends one event when statistics are on. Props outside the event's allow-list are dropped. */
export function track(name: AnalyticsEventName, props?: Record<string, unknown>): void {
  if (!client || !useAppearance.getState().usageStats) return;
  client.capture(name, scrubAnalyticsProps(name, props));
}

/** The rider's switch: off stops sending and drops the queue at once; on starts counting again. */
export function setUsageStats(on: boolean): void {
  useAppearance.getState().setUsageStats(on);
  if (!client) return;
  if (on) void client.optIn();
  else void client.optOut();
}
