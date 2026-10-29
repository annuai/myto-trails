# Motion detection ("is the rider moving?"): architecture

Status: **proposal, nothing built.** Needs the decisions at the end.

## Why the current one fails
`apps/mobile/src/lib/motion.ts` decides from GPS speed and position alone. In the real world GPS is the weakest signal exactly when the answer matters:
- Under trees, between buildings, in tunnels and in the first seconds after a stop, accuracy is 20 to 50 m and the reported speed jitters between 0 and 5 km/h while the bike is parked.
- Traffic crawl (2 to 6 km/h) looks like "stopped" for 8 s, then "moving", then "stopped": the break reminder, auto-pause and the "are you stopped?" prompt flap.
- A fix older than 5 s turns the answer "unknown", so a phone in a pocket with a throttled GPS reads as "not moving".
- Walking around the bike at a fuel stop (3 to 5 km/h) reads as riding.
- Nothing separates "stopped at a light" (seconds), "stopped for a break" (minutes) and "parked" (hours).

## Approach: fuse cheap signals, decide with a small state machine
One pure module (no React Native imports, like `motion.ts` today) takes timestamped **evidence** and returns a **state with a confidence**. Sensors and the OS sit outside it. That keeps it unit-testable and replayable.

### Evidence
| Signal | Tells us | Cost |
|---|---|---|
| GPS speed + accuracy (already collected) | Moving fast, when accuracy is good | Already running during a ride |
| Distance covered in a sliding window (e.g. 30 s of fixes, accuracy-weighted) | Moving even when speed is noisy; ignores jitter smaller than the accuracy radius | Free |
| Accelerometer variance (engine and road vibration, 1 to 3 Hz sampling, 2 s windows) | Bike running on the road vs. standing still, works without GPS | Very low |
| Step cadence (pedometer, or accelerometer peak at 1.5 to 2.5 Hz) | Rider is **on foot**, not riding | Low |
| OS activity recognition (iOS `CMMotionActivity`: automotive / walking / stationary; Android Activity Recognition) | A second opinion for free, from hardware that is already on | Free, needs the motion permission |
| Time of day, battery, is a ride being recorded | Context for how often to sample | Free |

### States
`RIDING`, `CRAWLING` (slow but making progress: traffic, hairpins), `STOPPED_BRIEF` (under about 2 min: lights, a gate), `STOPPED_PARKED` (long, vibration gone), `ON_FOOT`, `UNKNOWN` (no good evidence).

Rules, in order of strength:
1. Good GPS (accuracy under 25 m) and speed over 15 km/h: RIDING, high confidence.
2. Vibration present and the window distance is growing: RIDING or CRAWLING even if the speed reads 0.
3. No vibration, no net distance for the dwell time: STOPPED. Brief becomes parked after a longer dwell.
4. Step cadence present and no vibration: ON_FOOT. This is what stops a walk around the bike counting as riding.
5. Evidence missing or conflicting: hold the previous state (hysteresis) and lower the confidence. Never flip on a single sample. Never answer "stopped" because data is missing.

Hysteresis is time-based per transition (leaving RIDING needs about 20 s of agreement, entering it about 5 s), so crawl and traffic lights do not flap.

### Consumers keep their meaning, get better inputs
- **Break reminder:** counts RIDING and CRAWLING time; a STOPPED_BRIEF does not reset it, a STOPPED_PARKED of 10 minutes or more does.
- **Auto-pause / resume** of the recording: pause on STOPPED_PARKED or ON_FOOT after the dwell, resume on RIDING.
- **"Are you stopped?" prompt** (and the typing gate): only on STOPPED_*, with confidence above a threshold.
- **Auto-arrive:** needs STOPPED_PARKED near the destination, not just a slow fix.
- **Fuel cost / stats:** moving time vs. stopped time becomes accurate.

### Battery
Duty-cycling: accelerometer at low rate only while a ride is recording or a check-in is open; faster for a few seconds after a state change; off when the app has no reason to know. Android and iOS both allow this in the background alongside the existing location task. Budget target: under 2 % extra per hour.

## Making it trustworthy: trace recorder + replay
The hardest part is not the algorithm, it is knowing it is right. Ship a **developer trace recorder** (a hidden switch that logs evidence, state and the rider's own "I was stopped / riding" taps to a file). Real rides become fixtures; a **replay harness** in vitest runs the pure module over each trace and asserts the state timeline (flap count, delay to detect a stop, false "stopped" while riding). Tune thresholds against those traces rather than guessing.

## Phases
| Phase | What | Effort | Delivers |
|---|---|---|---|
| P0 | Trace recorder + replay harness, record 5 to 10 real rides (city, highway, trail, traffic, fuel stop) | 1 to 2 days + riding | Knowing the current failure rate |
| P1 | Window distance + accuracy-weighted GPS + time-based hysteresis + CRAWLING state, still GPS only | 2 days | Most of the flapping gone |
| P2 | Accelerometer vibration and step cadence, duty-cycled | 3 days | Works without GPS, ON_FOOT |
| P3 | OS activity recognition as a tie-breaker, permission flow and copy | 2 days | Better edge cases |
| P4 | Switch consumers (break, auto-pause, prompt, auto-arrive) to states + confidence, tune on traces | 2 days | User-visible fix |

P0 and P1 alone fix most of it and need no new permission.

## Risks
- **Phone placement** (tank bag, pocket, jacket) changes vibration; thresholds must be learned from several placements.
- **Permission** for motion data on iOS; denying it must degrade to GPS-only, not break.
- **Background limits** on Android OEMs killing sensors; the existing foreground-service notification covers recording but not a bare check-in.
- **No physical-device testing so far**: all of this needs real rides, not the simulator.

## Decisions for the owner
1. Start with P0 + P1 (recommended: no permission, biggest win) or go straight to all phases?
2. Is asking for the iOS motion permission acceptable (needed from P2/P3)?
3. Who rides the 5 to 10 test rides, and in which placements (tank bag, pocket, jacket)?
4. When the evidence is unclear, should the break reminder err toward staying quiet (recommended) or toward reminding?
