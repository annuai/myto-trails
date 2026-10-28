# Notifications: design

Status: **approved 2026-10-28 with the decisions in section 8.** Scope: `apps/mobile` only. No server work.

## 1. What you asked for

The app should notify the rider when there is a trip plan, when a to-do is pending, "etc". This design covers those, plus the few "etc" cases the app already has the data for.

**Non-goals (v1):** push from a server (trail closures, club news), notification history stored on the phone, notifications while the app has never been opened, rich notifications (images, action buttons).
**Anti-goals:** a notification that nags (the same thing more than a few times), one that fires at night, or one that reveals licence or medical details on a locked screen.

## 2. The key decision: local notifications, no server

Everything a reminder needs (to-dos, due dates, the planned trip, recorded kilometres) is **already on the phone and is kept only there**. So reminders are **local scheduled notifications**: the phone's own clock fires them.

| | Local (chosen) | Server push |
|---|---|---|
| Works offline, in a tunnel, with no sign-in | yes | no |
| Needs a push token, an Apple push certificate, a server job | no | yes |
| Data about the rider leaves the phone | **no** | yes (due dates would have to be uploaded) |
| Can say "the trail you planned is now closed" | no | yes |

The last row is the one thing local cannot do. It is deferred (section 9) and would be a separate, opt-in feature.

## 3. What exists that this builds on

- `lib/todos.ts` `dueInfo(todo, appKm, today)` already says whether a to-do is ok, soon, overdue or done, and for service items works out a date limit (`everyMonths`) and a km limit (`everyKm`).
- `store/todos.ts` (persisted), `store/trails.ts` `nextTrip` (`{slug, name, status, date?}`), `store/rides.ts` (kilometres done), `store/recorder` (ride in progress or paused).
- The Home bell (`ui/FloatingHeader.tsx`) is an `IconButton` that does nothing yet.
- **Not installed:** `expo-notifications`. Adding it is a native change (pod install and a new build), like the audio and SQLite packages.

## 4. Design

### 4.1 Three parts, each testable alone

```
 stores (todos, nextTrip, rides, settings)
        │
        ▼
 planReminders(snapshot, now, prefs)  ──►  Reminder[]        pure; the whole policy lives here
        │
        ▼
 syncReminders(reminders, scheduler)                          cancels ours, schedules the next 60
        │
        ▼
 scheduler adapter (expo-notifications)   .web.ts is a no-op  the only file that touches the native module
```

```ts
type Reminder = {
  id: string;            // stable, e.g. "todo:<id>:due-1d", so a re-sync replaces rather than duplicates
  fireAt: number;        // ms, always in the future and inside the allowed hours
  title: string; body: string;
  route: string;         // where a tap goes: '/todos', '/trail/<slug>', '/ride'
  kind: 'todo' | 'trip' | 'ride';
};
```

`planReminders` is a pure function of its inputs and a fixed `now`, so every rule below is a unit test with no phone.

### 4.2 When it re-syncs

On app start, when the app comes to the foreground, and (debounced, about 1 s) when to-dos, the planned trip, the ride total or the settings change. Re-syncing means: cancel every reminder this app scheduled, schedule the next 60. iOS keeps at most 64 pending local notifications, so the soonest 60 are scheduled and the rest are picked up at the next foreground.

Because it always rebuilds from the stores, restoring a backup, erasing data, deleting a to-do or cancelling a trip all fix the schedule with no extra code. "Erase all my data" also cancels everything.

### 4.3 The rules (defaults; section 8 asks you to confirm)

Reminders fire at **9:00 local** unless stated. Nothing fires between 21:00 and 07:00.

**To-dos with a date** (documents such as licence, insurance, PUC; any to-do with a due date; skipped when done):

| When | Message |
|------|---------|
| 7 days before (documents only) | "PUC certificate is due in a week" |
| 1 day before | "PUC certificate is due tomorrow" |
| On the day | "PUC certificate is due today" |
| 1 day after | "PUC certificate is overdue" |

Then silence. An overdue to-do is not repeated; it stays on the Home banner and in the bell list.

**Service to-dos** (chain lube): the date limit gets the same four reminders. The kilometre limit cannot be scheduled in advance, because it depends on riding that has not happened. So **right after a ride is saved**, if a service item has just become due by km, one notification says so ("Chain lube is due: about 500 km since the last one").

**Trip plan** (`nextTrip` with a date):

| When | Message |
|------|---------|
| Evening before, 21:00 | "Tomorrow: Nandi Hills. 2 of 5 things still to pack" (or "All packed" with no count) |
| Morning of, 7:30 | "Ride day: Nandi Hills" |

A trip with **no date** gets one nudge three days after planning ("Pick a date for Nandi Hills") and nothing more.

**Ride paused** (only during a recording): if paused for 30 minutes, "Your ride is paused. Resume or finish it." Cancelled the moment it resumes or finishes. This protects the ride from being forgotten and lost, the failure that started the recording work.

### 4.4 Privacy on the lock screen

Titles use the to-do's title and the trail's name only. They never include licence numbers, registration, blood group or contact details. A setting hides even the title ("Myto reminder") for riders who do not want to see "Insurance overdue" on a locked screen.

### 4.5 Permission

The app does not ask at first launch. It asks **at the moment it has something to say**: the first time a trip is planned or a to-do with a date is added, a `Sheet` explains ("Myto can remind you before a to-do is due or the day before a ride. Reminders are scheduled on this phone.") with Allow and Not now, the same pattern as the "Always location" explainer. If the rider refuses, nothing nags; **You, Notifications** shows "Off in Settings" with a button that opens the system settings.

### 4.6 Where it appears

| Place | What |
|-------|------|
| **You** | New row **Notifications** (value On or Off) in the "Keep track" list |
| **You, Notifications** (new screen) | Three toggles built from `ListCard`, `Row` and `Checkbox`: To-dos and documents, Trip plans, Ride paused. A "Hide details on the lock screen" toggle. A **Send a test notification** button (proves the permission and sound on this phone). Shows the permission state |
| **Home bell** | Opens a `Sheet` listing what needs attention right now (overdue to-dos, due this week, the trip) with the same wording, tap to go there. A small dot on the bell when something is overdue. It is computed live from the stores, **not stored**, so there is no history to manage |
| **Tapping a notification** | Opens the screen in `route` |

No new components: `Sheet`, `ListCard`, `Row`, `Checkbox`, `Button`, `IconButton`, `Banner`, `EmptyState`. If one proves unavoidable I stop and ask.

### 4.7 Platforms

- **iOS:** local notifications need no extra capability or Apple certificate. The plugin entry and the usage text go in `app.json`.
- **Android:** a "Reminders" channel (default importance); the Android 13 notification permission; **no exact alarms** (an inexact 9:00 is fine and avoids a restricted permission). Same code as iOS, as with the recorder.
- **Web:** the adapter has a no-op `.web.ts`, so the web build and preview keep working.

## 5. Phases

| Phase | Delivers | Done when |
|-------|----------|-----------|
| N1 | `planReminders` and its tests | Unit tests pass: each rule, hours window, done to-dos, past times skipped, ids stable, cap at 60 |
| N2 | Adapter, `syncReminders`, permission flow, settings store, You screen, test button, wiring to stores, erase | Reconciler tests with a fake scheduler (cancel then schedule, no duplicates, cap, denied permission schedules nothing); web preview screenshot |
| N3 | Bell sheet and dot, tap routing, ride-saved service reminder, paused-ride reminder | Tests for the pure parts; screenshot on web |
| N4 | `pod install`, device build, device protocol | You see a test notification, a to-do due tomorrow fires at 9:00, a tap opens the right screen |

N1 to N3 are testable here. Only N4 needs your phone.

## 6. Testing

- Pure planner: fixed `now` and a fixed time zone; boundary cases (due today after 9:00, due in an hour, month ends, daylight changes are not a concern in India but the code uses local dates).
- Reconciler: fake scheduler records `cancelAll` and `schedule` calls.
- Not testable here: real delivery, sounds, lock-screen text, Android channels. They go in the device protocol next to the recording cases.

## 7. Risks

- **iOS 64-notification cap:** handled by scheduling the soonest 60 and re-syncing on every open. A rider who never opens the app for months stops getting reminders past the 60th; unlikely with this many rules.
- **The app being killed does not stop local notifications**, but force-quitting is fine too. Rebooting the phone does not clear them either.
- **Service km reminders only fire when the app is open or a ride is saved.** Stated plainly in the screen's help text.

## 8. Decisions (from you, 2026-10-28) and how they change the sections above

1. **Trip reminder at 9 pm the evening before** (not 18:00). Quiet hours therefore run 21:00 to 07:00 (21:00 itself is allowed); the ride-day reminder stays 07:30.
2. **All the events:** to-dos and documents, trip plan, service by km, ride paused. (I read "all" as the four listed; "no ride logged in 30 days" was only an example and is not included.)
3. **A Notifications page with history.** This replaces the "bell sheet" and the "nothing is stored" idea in 4.6. The bell opens `/notifications`: a list of every reminder that came due, newest first, each **clearable on its own** (trash button). It is kept on the phone. A dot on the bell shows unread ones. Settings are one tap away from that page and from You.
   - **How history is recorded without a server:** the app keeps the list of reminders it has scheduled. At every open, any whose time has passed move into the history. So history also fills when the rider has refused the system permission, so the page works as an in-app inbox either way.
   - A to-do finished before its reminder time is rebuilt out of the schedule first, so it never appears.
   - Service-by-km notices are created at the moment a ride is saved (or the app is opened) and go straight into history.
4. **Lock screen shows "Myto reminder"** as the title with a body that does not name the item (for example "A to-do is due tomorrow"). The history page and the setting "Show details on the lock screen" (off by default) show the full text.
5. **Server push: later.** Not built; the adapter stays a thin file so it can be added.

**Permission ask:** a Home banner "Turn on reminders" (only while the system permission is undecided and the rider has not said Not now) opens the explainer sheet. This replaces asking on the first to-do or trip, because the explainer sheet must live inside a screen and the banner puts it in one place. The Notifications settings screen has the same button.
**Trip date:** the trip stores an ISO date as well as the label shown on Home, because reminders need the real date.

## 9. Later

Server push for trail condition changes and club activity (needs a token table, an Apple push key, a send job, and an opt-in); a stored notification history; "do not disturb while riding".
