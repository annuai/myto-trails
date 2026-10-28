# Ride journal: design

Status: **draft for approval. Nothing is built.** Scope: `apps/mobile` only. Phone-local; no server work.

## 1. What you asked for

A ride journal where you can write notes, record voice, and add pictures. It is **ride based**: during a ride you can journal into that ride; afterwards you can add more. It is **kept only on the phone**. It appears on the **dash** (Home) as a list of recent journals, and is reachable from the **You** page.

**Non-goals (v1):** syncing, sharing or uploading journals, voice-to-text, recording voice while the screen is locked, editing photos, tags or search.
**Anti-goals:** anything in a journal reaching the network; a journal screen that asks you to type while moving.

## 2. What exists that this builds on

- `lib/localMedia` already stores photos only on the phone (downscaled JPEG, files named by id, a test that forbids importing `src/api`). The journal copies that pattern for its own folder.
- `store/rides.ts` + `store/persist.ts`: a zustand store persisted in AsyncStorage. Journal entries use the same.
- The backup (`lib/backup`) and "Erase all my data" cover rides, to-dos and document photos. **Journals must join both**, or "kept only locally" would quietly mean "lost on a new phone" and "not erased".
- `expo-image-picker` (camera and library) is installed. **No audio library is installed**: voice needs `expo-audio` and a microphone permission string.
- The recorder already had an unused `notes` counter, which this replaces.

## 3. Design

### 3.1 Data

A journal is not a separate object: it is **all entries that share a ride key**. The key is the ride's `startedAt` (the recording's own start time, which the saved ride also carries), so entries made *during* a ride attach correctly before the ride exists as a saved ride.

```ts
type JournalEntry = {
  id: string;
  rideKey: number;          // = ride.startedAt
  at: number;               // when written
  kind: 'note' | 'voice' | 'photo';
  text?: string;            // note, or an optional caption on a photo
  mediaId?: string;         // file name for voice or photo
  durationSec?: number;     // voice
  width?: number; height?: number; // photo
};
```

- Entry list: zustand store `useJournal` persisted as `myto-journal` (same pattern as rides).
- Files: `journal-media/<id>.m4a` and `<id>.jpg` in the app's private document folder. Photos are downscaled the same way as document photos.
- A ride with entries is "a journal"; its title and date come from the ride. If the ride was never saved (recording discarded), the journal still lists under its date as "Ride on 28 Oct".
- Deleting a ride asks whether to delete its journal too ("Delete this ride and its journal"), default keep-nothing-silently.

### 3.2 Where it appears

| Place | What |
|-------|------|
| **Home (dash)** | New section **Recent journals** under "Your latest ride": a `ListCard` of the last 3 rides that have entries. Row: ride name, sub "2 notes · 1 voice · 3 photos", date. Tap opens that journal. `EmptyState` when none. "All journals" soft button |
| **You** | Row **Ride journal** (with count) in the existing "Keep track" `ListCard` |
| **Ride story** | A "Journal" button on the story screen for that ride |
| **Live ride** | A **Journal** button next to Waypoint (see 3.3) |
| Screens | `/journal` (all journals, grouped by ride) and `/journal/[rideKey]` (one ride's timeline, oldest first, with add buttons) |

### 3.3 Journalling while riding

The live screen's rule is "nothing that needs text input", so the live **Journal** button opens a `Sheet` with two big actions: **Record voice** (tap to start, tap to stop; shows a timer) and **Take photo**. Typing a note is available on the journal screen once you have stopped. Entries made while riding are stamped with the ride's key and the moment they were made, so a timeline shows them in order along the ride.

Voice recording is foreground only (screen on, app open). It stops if the app is backgrounded and keeps what was recorded so far.

### 3.4 Journal screen

Timeline of entries (oldest first). Note = text in a `Card`. Photo = image in a `Card` with optional caption; tap to view full size. Voice = a `Card` with a play/pause `IconButton`, a progress line and the duration. Buttons at the bottom: **Add note** (opens a `Sheet` with a `Field`), **Record voice**, **Add photo** (camera or library). Long-press or an overflow `IconButton` deletes an entry (confirm `Sheet`, deletes the file too).

### 3.5 Privacy and data handling

- `lib/journalMedia` must not import `src/api`; a test enforces it, like `localMedia`.
- **Erase all my data** deletes entries and every file in `journal-media/`.
- **Backup:** notes and photo captions go in the backup payload. Photos are included the same way document photos are. Audio is the question below.
- Microphone permission copy: "Myto records voice notes for your ride journal. They stay on this phone."

### 3.6 Reuse (no new components)

`ListCard`/`Row`, `Card`, `Sheet`, `Field`, `Button`, `IconButton`, `EmptyState`, `SectionTitle`, `BackHeader`, `PageTitle`. The audio player is an `IconButton` plus `Text`; no new component unless it proves unavoidable, in which case I will stop and ask.

## 4. Order and verification

| Step | Delivers | Done when |
|------|----------|-----------|
| 1 | Store, media files, erase, tests | Pure tests: entry add/remove, grouping by ride, "summary" text, deletion removes files (injected file adapter), no `src/api` import |
| 2 | Journal screens, Home section, You row, Story button | Screenshots on web (notes and photos work on web; voice on a device) |
| 3 | Live journal sheet with voice and photo | Device: record 30 s mid-ride, stop, replay it from the journal |
| 4 | Backup and erase coverage | Round-trip test: export, wipe, import, entries and photos return |

It follows phase 1 (recording), on its own branch.

## 5. Open questions (yours to answer)

1. **Text while riding.** I defaulted to voice and photo only on the live screen, with typing after you stop, to match the app's rule of no text input while moving. Do you want a text box on the live screen too?
2. **Backup size.** Voice notes are large (about 0.5 MB a minute). Include audio in the encrypted backup (bigger files, nothing lost on a new phone) or leave audio out of it (small backups, voice notes stay on this phone only)? I recommend including it.
3. **Deleting a ride.** When you delete a ride that has a journal, should its journal be deleted with it (my default, with a clear prompt) or always kept?
