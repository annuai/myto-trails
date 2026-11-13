# Film looks for journal photos

Status: decided by the builder on the owner's brief ("build this completely with your own decisions", 2026-11-13): a professional, restrained retro look for photos taken or picked in the ride journal.

## Intent

A rider takes or picks a photo in the ride Journal, chooses a film look, and keeps it with the ride. Later the same photo can be shared (with ride stats, through the photo composer). **Non-goals:** stickers, borders, light leaks, text, video, uploading anything. **Anti-goals:** a look that cannot be undone; the photo's EXIF location leaving the phone.

## Decisions

- **Entry:** no new tab or screen. The journal's Take photo / Add photo buttons open a Film step (a sheet) before the photo is saved; a saved photo gets a Film button to change or remove its look.
- **Looks (7):** None, Halftone (high-contrast black and white under a dot screen), Colour negative (warm, soft contrast), Faded slide (lifted blacks, muted), Black and white (high contrast), Sepia (soft), Cross process (cool shadows, warm highlights). Swiping sideways on the picture steps through the looks. Each has an intensity (0 to 100, default 70) that blends the colour matrix from identity, and scales fine grain and a gentle vignette with it. None has no controls.
- **Renderer: `react-native-svg` filters.** `FeColorMatrix` does the colour, `FeTurbulence` the grain, a radial gradient the vignette. `react-native-svg` is already installed and 15.16 renders filters natively and on the web, so there is **no new native module and no dev rebuild**, and the editor can be checked in the web preview. `@shopify/react-native-skia` would be more robust for pixel work but adds a native module, a rebuild and about 6 MB for six matrices; the colour-matrix route is enough. Revisit if a device shows the native filter path is wrong.
- **Look maths:** a pure module (`lib/filmLook.ts`): the six matrices, blend with identity by intensity, grain and vignette strengths. Unit tested; the renderer only turns its output into SVG.
- **Baking:** the rendered picture is a view-shot capture of the same SVG at the photo's pixel size (long side 1600, as `savePhoto`), saved as JPEG. A capture is a new bitmap, so no EXIF travels.
- **Storage (non-destructive):** `{id}.jpg` stays the picture the journal shows and the backup carries (now the rendered one); `{id}.orig.jpg` is the untouched original, kept on the phone only. The entry stores `look: { id, intensity }`. Changing or removing a look re-renders from the original; None puts the original back and deletes the copy. Deleting the entry deletes both. A photo with no look has no copy.
- **Backup:** format unchanged. The original is not in a backup (it would double the size and change the format); a restored photo keeps its look but its Film button is hidden, because there is nothing to re-render from.
- **Capture:** `expo-image-picker` as before (`exif: false`, so location is not even read); no live-camera filter preview, because the system camera is used and the look is applied right after, with a real preview.
- **Share later:** a Share action on a saved photo. The composer (branch `feat/photo-share-card`) is not on `main` yet, so the action goes through one seam, `lib/photoShare.ts`, taking a photo uri and a ride id (the entry's ride, else the latest); today it opens the system share sheet with the picture alone. Swap the seam body for the composer when it merges.
- **Web:** the editor previews live; baking needs a phone (the capture library cannot draw SVG filters in a browser), so on the web the photo saves unfiltered, as the other media there are in-memory previews.

## Tests

`filmLook` (matrices, blending, clamping, grain and vignette scaling, per-look character), the ride-for-entry rule, and the journal store's `patch`. The renderer is checked by eye in the web preview (`/dev/film`, a drawn scene; the web build uses `FilmImage.web.tsx` because `react-native-svg` cannot draw an `Image` in a browser). **Not checked:** the native filter path and the baking capture need a phone.
