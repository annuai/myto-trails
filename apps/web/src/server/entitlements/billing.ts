import type { BillingEvent } from "./decide";

/**
 * The seam where a payment provider plugs in. There is NO implementation and none is faked: until one exists,
 * billingEnabled() is false, nothing offers a purchase, and entitlements come only from grants (entitlements.ts).
 *
 * Which provider is used is decided by store rules, not by us. Digital features unlocked and used inside the app
 * (a Large Ride Pass, Myto Organiser) must be sold through Apple In-App Purchase on iOS (App Store Review Guideline 3.1.1)
 * and Google Play Billing on Android (Play Payments policy), unless an exception applies. A web or gateway provider
 * can serve the website only, and the app must not steer people to it. Details and the date checked: docs/13-risks-and-open-decisions.md, D-20.
 * So expect one BillingProvider per platform, each mapping its own notifications (App Store Server Notifications,
 * Play real-time developer notifications, a gateway webhook) onto BillingEvent.
 */
export interface BillingProvider {
  readonly name: string;
  /** Start a purchase for the signed-in rider and return what the client needs to complete it. The server grants nothing here. */
  createCheckout(i: { userId: string; kind: BillingEvent["kind"]; rideId?: string }): Promise<{ checkoutRef: string; url?: string }>;
  /** Check the provider's signature on a raw notification and map it to an event. Throw if it does not verify; never return an unverified event. */
  verifyWebhook(i: { headers: Record<string, string | undefined>; rawBody: string }): Promise<BillingEvent>;
}

export function billingEnabled(): boolean {
  return false;
}
