# Photo share card

Status: approved by the owner's request ("build it completely with your own decisions", 2026-11-13). Decisions below are the builder's, made with the owner's brief: a Strava-like way to put a transparent overlay with ride stats on top of a photo the rider took.

## Intent

Riders post a ride as a photo, not as a map card. Today the Share ride sheet (`features/ShareRideSheet.tsx`) only makes the dark ride card (Story, Post or Square, route over map tiles, opaque picture). Add a **Photo** mode inside that sheet: pick or take a photo, lay the stats and route over it, place and size the overlay, share the finished picture, or save the overlay alone with a transparent background.

**Goals:** one tap from the ride story to a photo they would post; free to run (all on the phone, nothing uploaded); the same privacy trim as the existing card.
**Non-goals:** filters, stickers, text editing, several photos, video, Pillion, a new screen or tab, uploading a photo anywhere.
**Anti-goals:** a stats overlay that is unreadable on a bright or dark photo; leaking the start or end of a ride; the photo's own location data leaving in the shared file.

## Decisions

- **Where:** a `Card | Photo` choice at the top of the existing sheet. Card mode is unchanged.
- **Photo source:** the phone's library or its camera through `expo-image-picker`, with the system crop (`allowsEditing`, aspect = the chosen format), `exif: false`. Changing the format afterwards re-covers the same photo (centre crop); re-pick for an exact crop.
- **Overlay content:** the privacy-trimmed route line (no map tiles, so no tile attribution and no clutter) and 2 to 4 of the same stats as the card, from `buildRideCard`. Hide route and the stat chips work as before.
- **Layouts:** `bar` (stats in a row along the bottom, small route above them) and `corner` (route above a stacked stat list, top left). Placement is the overlay's centre as a fraction of the picture plus a scale; one finger drags, two fingers pinch (scale 0.6 to 2.2); the overlay always stays inside the picture. Changing layout resets placement.
- **Legibility:** `ink` is `light` or `dark`; text and route get a soft shadow so either is readable on most photos. The rider chooses; no automatic detection.
- **Share picture:** capture the full-size picture (same 1080 wide canvases as the card) with `react-native-view-shot` and the existing `shareCard`. The capture is a new bitmap, so the photo's EXIF never travels.
- **Save overlay only:** the overlay alone at scale 1 on a transparent background, as a PNG through the same share sheet (for pasting over a photo in another app).
- **Remembered:** `layout` and `ink` join `companion.card` (persisted); the photo and placement are not.
- **Web:** capture is phone-only; `shareCard` already says so. A dev-only screen (`app/dev/photo-card.tsx`, like `app/dev/motion`) shows the composer with a bundled photo and sample ride so it can be checked without a phone.

## Constraints

Free tier only. Tokens only (no raw spacing, colour or type values; `check:tokens`, `check:colors`). Sentence-case copy, no exclamation marks. A ride with no route (hidden, or too short to trim) shows stats only. A rider with zero stats selected gets the defaults, as the card does. Lean docs: about 5 lines in the owning doc.

## Tests

Pure placement and layout maths (`lib/photoCard.ts`), the picker wrapper with the picker mocked, the persisted store merge, and a dev screen for the eye. No new native module.
