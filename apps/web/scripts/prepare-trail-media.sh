#!/usr/bin/env bash
# Turns phone photos and videos into the site's web files, in one go. HEIC photos are converted first; EXIF and GPS are
# removed from everything; videos become 720p MP4s with posters. Prints the "media" and "videos" JSON to paste into the
# trail's data file.  Needs: ffmpeg (brew install ffmpeg), and macOS `sips` for HEIC.
#
# Usage: scripts/prepare-trail-media.sh <slug> [--start-photo N] [--start-video N] -p photo... -v video...
#   e.g. scripts/prepare-trail-media.sh my-trail -p ~/Downloads/IMG_1.HEIC ~/Downloads/IMG_2.HEIC -v ~/Downloads/IMG_3.MOV
#   --start-photo / --start-video: number files from N+1, to add to a trail that already has some.
# Blur number plates FIRST (scripts/blur-photo-region.mts, scripts/redact-video-plate.py) and pass the blurred files here.
set -euo pipefail
cd "$(dirname "$0")/.."

slug="${1:-}"; shift || true
[[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { sed -n '2,10p' "$0"; exit 1; }
start_photo=0; start_video=0; mode=""; photos=(); videos=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --start-photo) start_photo="$2"; shift 2 ;;
    --start-video) start_video="$2"; shift 2 ;;
    -p) mode=p; shift ;;
    -v) mode=v; shift ;;
    *) if [[ "$mode" == p ]]; then photos+=("$1"); elif [[ "$mode" == v ]]; then videos+=("$1"); else echo "put -p before photos and -v before videos"; exit 1; fi; shift ;;
  esac
done
[[ ${#photos[@]} -gt 0 || ${#videos[@]} -gt 0 ]] || { echo "nothing to do: give -p photos and/or -v videos"; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg is needed: brew install ffmpeg"; exit 1; }

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
if [[ ${#photos[@]} -gt 0 ]]; then
  jpgs=()
  for f in "${photos[@]}"; do
    [[ -f "$f" ]] || { echo "not found: $f"; exit 1; }
    case "$(printf '%s' "${f##*.}" | tr '[:upper:]' '[:lower:]')" in
      heic|heif) out="$tmp/$(basename "${f%.*}").jpg"; sips -s format jpeg -s formatOptions 90 "$f" --out "$out" >/dev/null; jpgs+=("$out") ;;
      *) jpgs+=("$f") ;;
    esac
  done
  echo "== photos" >&2
  START="$start_photo" npx tsx scripts/make-trail-photos.mts "$slug" "${jpgs[@]}"
fi
n="$start_video"
for f in "${videos[@]+"${videos[@]}"}"; do
  [[ -f "$f" ]] || { echo "not found: $f"; exit 1; }
  n=$((n + 1))
  echo "== video $n ($(basename "$f"))" >&2
  npx tsx scripts/make-trail-video.mts "$slug" "$n" "$f"
done
echo "" >&2
echo "Done. Files are in public/photos/$slug and public/videos/$slug. Next: write the data file, then upload (npm run media:upload -w @moto-trails/web -- $slug)." >&2
