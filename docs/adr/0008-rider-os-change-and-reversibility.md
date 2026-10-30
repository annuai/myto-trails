# ADR 0008: Myto becomes a Rider OS, as a reversible large version change

**Status:** accepted (2026-10-30): the owner signed off the 0.9 line and the exit rule. **Source:** [audit](../audit/2026-10-30-rider-ops-audit.md), [phases](../audit/2026-10-30-rider-os-phases.md).

**Context.** The product docs describe a trail directory ([PRODUCT.md](../../PRODUCT.md)). The phone app already records rides, keeps journals, runs group rides and check-ins. The owner has decided the product is a **Rider OS** in which the trail directory is one module and the ride is the central object. This changes the app's navigation (Dash, Trails, Clubs, You become Home, Explore, Rides, Community, with Profile behind an avatar), the shape of Home, the trip screen (it becomes the ride workspace) and, in Phase 1, how rides, journals and to-dos are identified on the device. The owner wants to be able to go back if testing shows it is not working.

**Decision.**

1. **A large version change.** The current product is frozen as the **0.8 line**. The Rider OS is the next capability area and ships as the **0.9 line**, in prerelease builds first (`0.9.0-beta.N`, TestFlight only). Public launch stays `1.0.0` as in [versioning](../versioning.md). The Rider OS replaces the meaning of 0.9 in that document (beta of the directory plus hardening) with "Rider OS beta"; `docs/versioning.md` is updated when `0.9.0` is cut. The number can be changed with a `Release-As:` footer without affecting anything below.
2. **A restore point exists.** Git tag `snapshot/pre-rider-os` and branch `legacy/0.8-companion`, both pointing at a snapshot commit of the working tree on 2026-10-30. It includes uncommitted unit-rollout work and excludes `apps/web/data.sql`, `.claude/` and `docs/audit/`. The snapshot is **not** a tested release: the tree it captures was mid-change. Before relying on it, run lint, typecheck and tests on it.
3. **The old structure stays in the code until the change passes testing** (see exit rule). The new navigation is behind one flag, `riderOs`, read once at app start. Off = today's tabs and screens. The flag is a build-time and local setting, not a server toggle, so it costs nothing and cannot be flipped by anyone else.
4. **Expand, then contract.** Every data change is additive first:
   - On the phone, `rideId` is added **alongside** `rideKey`. Both are written for the whole test period. Nothing is deleted or renamed. Old records keep working with the flag off.
   - Before the first migration runs, the app writes an automatic copy of its local stores to a dated file on the device, and the encrypted backup export stays available. Restoring is the existing import.
   - Server migrations are forward-only in this repo (no down migrations), so they are additive too: new tables and nullable columns only. Dropping or renaming anything waits for the contract step.
5. **Contract step** (remove the old tabs, `rideKey`, the retired stores) happens in a separate release **after** the exit rule below is met, never in the same release that introduces the new structure.
6. **Rollback procedure.**
   - *Soft:* turn the flag off. Riders see the 0.8 structure, with their data intact because of dual writes.
   - *Hard:* build and ship from `legacy/0.8-companion` (hotfixes go to that branch while the Rider OS is in test). New-style records are ignored by the old build, not corrupted.
   - Neither procedure is free after the contract step, which is why that step is separate.

**Exit rule (decided before building, not after).** Testing runs on real rides with real devices. The Rider OS structure is kept only if all of these hold; otherwise the flag stays off and we either iterate or revert:
- A rider can go from a trail to a ready-to-ride plan with no repeated data entry, in no more steps than today (steps measured on a device, today's count recorded first).
- No crash or data-loss case in a ride that was recorded, killed and recovered.
- Finding an old ride, trip or journal takes no more taps than today.
- Test riders can find Profile, Garage and Safety setup without being told where they went.
- Check-ins, SOS and recording behave identically with the flag on and off.

**What is not reversible, and how we limit it.** Anything a rider has shared or submitted (a shared route link, a trail submission, a group ride code) lives on the server and is not affected by the flag. Restoring from the snapshot does not restore server data; migrations are additive so nothing is lost.

**Consequences.** More code is carried for a while: two navigation structures and two ID fields. That is the price of a clean way back, and the contract step pays it off. Testing needs a plan that is written down first (the exit rule above), a recorded baseline of today's step counts, and at least one real-device pass before the flag is turned on for anyone else.

## Addendum (2026-10-30): the new navigation was dropped

After trying the flagged build on a phone, the owner chose to keep the 0.8 navigation (four tabs and a Ride button) and keep every new capability. The `riderOs` flag, the Rides tab, the Profile header button and the renamed tabs were removed. See [ADR 0009](0009-keep-four-tabs-fold-in-new-features.md). Everything above about the snapshot, additive data (`rideId` beside `rideKey`) and the rollback paths still holds; the flag no longer exists, so a "soft" rollback is now just the snapshot build.
