/**
 * When Pillion first says hi. Not right after the welcome flow: a rider who has just finished it has seen enough, so the greeting comes on a
 * later open, and which one is a little random so it is a surprise rather than a schedule. A rider who already had the app when this was
 * added never met Pillion, so they get it too, on one of their next few opens. It happens once.
 */
export const DAY_MS = 86_400_000;

export type Origin = 'new' | 'existing';
export type GreetingPlan = { /** The open (counted from the first ever) it may appear on, or after. */ opens: number; /** Not before this time. */ at: number };
export type GreetingState = { opens: number; origin?: Origin; onboardedAt?: number; plan?: GreetingPlan; greeted: boolean };

/** `rand` is in [0, 1). A new rider: 2 to 4 opens after the open that set the plan, and at least a day after the welcome flow. An existing rider: 1 to 3 opens on. */
export function planGreeting(origin: Origin, opens: number, onboardedAt: number | undefined, rand: () => number): GreetingPlan {
  if (origin === 'existing') return { opens: opens + 1 + Math.floor(rand() * 3), at: 0 };
  return { opens: opens + 2 + Math.floor(rand() * 3), at: (onboardedAt ?? 0) + DAY_MS };
}

export const greetingDue = (s: GreetingState, now: number): boolean => !s.greeted && !!s.plan && s.opens >= s.plan.opens && now >= s.plan.at;
