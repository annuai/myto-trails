# Adding a trail by hand

How a trail goes from phone photos, videos and a GPX recording to the live site. Every step has a script; this page
is the order to run them in and what to check. Worked example: `apps/web/data/trails/manchanabele-dam.json`.

All commands run from `apps/web` unless they start with `npm run ... -w @moto-trails/web` (those run from anywhere).

## 0. One-time setup

- `ffmpeg` installed (`brew install ffmpeg`), and Python 3 with numpy (`pip install numpy`) for the video plate blur.
- `apps/web/.env.local` has the database and the media bucket. This file is git-ignored; never paste its values in chat or commit them:

```bash
DATABASE_URL=postgresql://...        # the Supabase connection string (the live database)
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=...  R2_ACCESS_KEY_ID=...  R2_SECRET_ACCESS_KEY=...  R2_BUCKET=...
R2_PUBLIC_BASE_URL=https://media.myto-moto.com
```

`npm run storage:smoke -w @moto-trails/web` should print `PASS provider=r2`.

## 1. What to get from the contributor

Name of the trail; start coordinates (latitude, longitude, as in Google Maps: `12.878434, 77.344270`); the place and
district; distance (km), ride time, difficulty (easy / moderate / hard / expert) and surface (dirt, gravel, mud, sand,
rock, forest track, mountain road, riverbed, mixed); best months and season notes; **who may ride it and any closure**
(public, permission needed, private, restricted; what is closed, to whom); hazards (slippery after rain, river
crossing, steep descent, loose rock, wildlife, no mobile signal, no fuel, low branches); what makes it worth riding;
how to find it; the credit name; photos, videos and the GPX recording. Look the place up online and add a few lines of
background, saying where a fact comes from and leaving out anything you cannot confirm.

## 2. Privacy checks, before anything is published

| Look for | What to do |
|---|---|
| A **number plate** in a photo | `npx tsx scripts/blur-photo-region.mts in.jpg out.jpg --box left,top,width,height` (fractions of the upright photo, 0 to 1). Open the `.check.jpg` it writes. HEIC: convert first with `sips -s format jpeg in.HEIC --out in.jpg`. |
| A number plate in a **video** | `python3 scripts/redact-video-plate.py in.MOV out.mp4 --time 3.5 --x 318 --y 1341 --from 1.6 --to 4.2`. Pick a time where the plate is clear, give its centre in pixels (`ffmpeg -ss 3.5 -i in.MOV -frames:v 1 frame.png`, then look at the picture), and the times the vehicle is in view. Check several frames of the result. |
| **Faces**, house numbers, people's names | Blur, crop, or leave the photo out. |
| A **GPX** that starts or ends at home | `npx tsx scripts/trim-gpx.mts in.gpx data/trails/gpx/<slug>.gpx --start-km 2 --end-km 2`. The importer already drops timestamps; it does not trim the ends. Look at the first and last point it prints. |
| Voices in a video | The audio is kept. Mute or leave out clips with conversations. |

EXIF and GPS are removed from photos and videos automatically by the scripts below.

## 3. Make the web files

```bash
# photos and videos in the order you want them shown (HEIC is converted for you); blurred files here, not originals
scripts/prepare-trail-media.sh <slug> -p ~/Downloads/a.HEIC ~/Downloads/b.jpg -v ~/Downloads/c.MOV ~/Downloads/d.mp4
```

It writes `public/photos/<slug>/` and `public/videos/<slug>/` and prints the `media` and `videos` JSON. To add more
later: `--start-photo 3 --start-video 5`.

## 4. Write the data file

Copy `data/trails/_template.json` to `data/trails/<slug>.json`, fill it in, paste the printed `media` and `videos`
(then add `altText` and `description` for each: say what is in the picture, for people who cannot see it), and set
`"gpxFile": "gpx/<slug>.gpx"` if there is a GPX. Rules worth knowing:

- Access has no "closed area" value. State a closure in `access.permissionInstructions`, `safetyNotes` and
  `condition.note`; keep `accessClass: "public"` only if the riding itself is open to everyone.
- Everything a contributor reports and a moderator has not checked is `level: "community_reported"`, `basis: "rider_observed"`.
- `distanceKm` is the contributor's stated distance; the route line (from the GPX) is measured separately.
- Check it: `npm run trail:validate -w @moto-trails/web -- data/trails/<slug>.json`

## 5. Upload and import

```bash
npm run media:upload -w @moto-trails/web -- <slug> --dry-run     # lists what would go
npm run media:upload -w @moto-trails/web -- <slug>               # copies photos and videos to the bucket
npm run db:import     -w @moto-trails/web -- data/trails/<slug>.json   # writes the trail to the database
```

The import runs in one transaction (all or nothing) and refuses a slug that already exists. It points the photo and
video links at `R2_PUBLIC_BASE_URL`.

## 6. After it is live

1. Pages are saved for up to an hour. To show the new trail at once: sign in as admin, open `/moderate`, press **Clear site cache**.
2. Open `/trails/<slug>` on a computer and a phone: photos, videos, map line, start coordinates, access note.
3. Download the GPX from the page and check its first point is not private.
4. Commit the data file and the trimmed GPX (never the raw GPX or the originals): `git add apps/web/data`.

## 7. Known gaps

- There is no edit screen or delete script for an imported trail. To change one, ask for a removal script or unpublish it at `/moderate/trails/<slug>`.
- Photos and videos are made in `public/photos/<slug>` and `public/videos/<slug>`, uploaded to the bucket, and left out of git (they are in `.gitignore`; the first three trails were committed before that). The bucket is then the only copy, so keep the original phone files.
- Contributor video upload from the site is not supported yet; videos come in through this runbook.

## Script reference

| Script | What it does |
|---|---|
| `scripts/prepare-trail-media.sh` | HEIC to JPEG, photos to WebP sizes, videos to 720p MP4 with posters, metadata removed |
| `scripts/make-trail-photos.mts`, `make-trail-video.mts` | The two steps the script above runs; use them directly for one file |
| `scripts/blur-photo-region.mts` | Blur a rectangle in a photo |
| `scripts/redact-video-plate.py` | Track and pixelate a plate in a video |
| `scripts/trim-gpx.mts` | Cut the first and last km off a GPX |
| `scripts/validate-trail.mts` (`npm run trail:validate`) | Check a data file and its files |
| `scripts/upload-trail-media.mts` (`npm run media:upload`) | Copy one trail's media to the bucket |
| `scripts/import-trails.mts` (`npm run db:import`) | Write a trail to the database |
| `scripts/migrate-media-to-r2.mts` (`npm run media:migrate`) | One-off: move all media to the bucket and repoint the database |
