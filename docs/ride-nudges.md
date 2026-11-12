# Ride nudges

An occasional, on-phone idea to go riding. No server and no push: everything is local notifications scheduled by the app, so it costs nothing and works offline. Remote push for event-driven nudges waits for a paid Apple Developer account (see `docs/todo.md`) and will reuse the same governor.

## Where it lives

`apps/mobile/src/lib/nudge/` is pure and tested: `candidates.ts` (ideas from the rider's situation), `governor.ts` (hard rules), `learning.ts` (what the rider opens), `planner.ts` (best ideas first, the rules decide), `copy.ts` (wording). `src/nudgeWorld.ts` reads the stores; `reminderSync.ts` adds the nudges to the same schedule as to-do and trip reminders; `NudgeHost.tsx` refreshes weather and club rides when the app opens; `refresh.ts` fetches them.

## The kinds

| Kind | When | Example |
|---|---|---|
| first | 2 and 9 days after install, only with no ride yet | "Your first ride is waiting" |
| lapse | 7, 21 and 60 days after the last ride, then it stops | "It's been a week" |
| weekend | Friday 17:30, if the weekend looks free and not wet | "The weekend is here" |
| weather | 18:30 the evening before a dry, mild day | "Good riding weather tomorrow" |
| club | 2 days (or 1) before a club ride not yet answered | "Dust Devils ride on Sunday" |
| milestone | when within 6% (30 km at least) of a round yearly distance | "12 km to 500 km this year" |
| photos | 30 minutes after a ride ends, for club members | "Share today's ride" |
| home | 10 minutes after a ride ends more than 1.5 km from a saved Home (opens the Dash offer), not on a trip day or after a group ride; wins over photos in the shared 4-day after-ride spacing; a ride ending after about 20:50 or before about 07:50 gets none (send window) | "Heading home?" |

The usual-time reminder ("Ready for your next ride?") and the daylight alert already exist as reminders; the engine keeps a day that has one free of nudges.

## The rules (never weighed against a score)

- Send window 08:00 to 21:00. One nudge a day. 3 hours clear of any other reminder.
- "Ride" nudges at least 7 days apart on Occasional (3.5 on Regular); "after a ride" nudges at least 4 days apart.
- When the last 3 nudges were all ignored the gap doubles. A kind ignored 4 times in a row rests for 21 days. A nudge is judged a day later: opened, or a ride within a day, is good.
- Off until the rider chooses, after their first ride (Occasional, Regular or No thanks); changeable in Smart reminders, with a switch for each kind and a "what is planned" screen.
- Without notification permission the same plan shows as a card on the Dash.

## Data

Weather: Open-Meteo (free, no key), asked about the start of the latest ride rounded to 0.1 degree (about 11 km), at most every 6 hours. Club rides: the app's own API, every 3 hours. Both only while nudges are on, both kept on the phone.

## Tests

`nudge.test.ts` (each part), `simulation.test.ts` (six simulated months for riders who ride weekly, ignore everything, never ride, or stop and never return: asserts the window, one a day, the gaps, the totals and the fading), `reminderSync.test.ts` (nudges in the schedule), `store/nudges.test.ts`, `inApp.test.ts`.
