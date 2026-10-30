# 0010. Ride engine fixes, trail guide, and the fuel estimate

Date: 2026-10-30. Status: built; GPS fixes are tested by unit tests and not yet by a ride on a phone.

## 1. Why the ride showed wrong things

| Symptom | Cause (in code) | Fix |
|---|---|---|
| "Lost GPS signal" many times | Background task used `distanceInterval: 5`, so a stopped bike got no fixes. `moving` stayed true from before the stop, so after 15 s the banner fired at every light. One late fix cleared it, the next gap raised it again. | Distance filter 0 so fixes keep coming. `lib/gpsHealth`: 20 s of silence to raise, 5 s of fresh fixes to clear, app-resume grace. Weak accuracy is its own message. |
| 5 to 6 km/h while standing | (a) Fixes inside the drift radius returned before `speedKmh` was set, so the last riding speed stayed. (b) A parked phone's own speed reading (often 1 to 2 m/s) was trusted. | `lib/liveSpeed`: inside the radius the position must agree with the reading, otherwise 0. Speed older than 4 s shows "–". |
| Top speed 162 km/h | `trackStats` took the fastest single fix-to-fix step. One 45 m jump in a second is 162 km/h. Live max had the same weakness. | `lib/topSpeed`: median of 5 steps, poor-accuracy fixes and sub-0.5 s steps dropped. A reading far above what the track shows is replaced by the track. |

## 2. Engine shape (what is built, what is next)

Every fix is journaled first (unchanged), then passes: gate (accuracy, time order) -> speed (`fixSpeedKmh`) -> drift lock (`driftRadius`) -> distance and top speed (median) -> health (`stepGpsHealth`). Each stage is a pure function with tests, so a recorded ride can be replayed through it.
Next, not built: replay real rides from `motionTraceFile` to tune the thresholds; a Kalman smoother for the drawn line only if replay shows zigzag.

## 3. Trail guide (`lib/trailGuide`)

Phases move forward only: `to_start` -> `on_trail` -> `finished`. On the trail it gives distance to go and the next turn within 400 m, read from the line's shape (heading change of 40 degrees or more). To the start it gives distance and compass direction, plus a link that opens Google Maps for the road. Off-route alerts now run only on the trail (they used to buzz on the way to the start). A loop's end is not its finish: 60 percent must be ridden first.
Trips need nothing new: `chooseDayRoute` already hands the day's trail to the ride screen.
Limit: no road routing, because that costs money. Turns come from the GPX shape, so they are as good as the file's detail.

## 4. Fuel

- `/mileage` (opened from Fuel and costs, Mileage): fill to full, ride, fill to full, divide. Several fill-ups are added, not averaged.
- Ride cost on the ride story: the rider's mileage times `speedFactor(average speed)`, relative to 45 km/h, clamped to 0.7 to 1.1. Average speed is distance over time including stops, worked out at the end, never shown while riding. The Fuel costs page uses the same function, so totals agree.
- The curve is a typical-bike guess, not measured. The better signal is the rider's own fill-ups; if they matter, the next step is fitting the curve from several fill-ups of different ride types.
