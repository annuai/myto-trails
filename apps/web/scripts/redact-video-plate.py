#!/usr/bin/env python3
"""Pixelates a number plate that moves through a video, by tracking it from one frame where you point it out.

Use it when a clip shows a plate (yours or anyone's). It tracks the plate frame by frame, pixelates a box around it, and
writes a high-quality MP4 with the original audio. Then run that file through make-trail-video.mts as usual.
Needs: ffmpeg, python3, numpy (pip install numpy).

Usage:
  python3 scripts/redact-video-plate.py IN.MOV OUT.mp4 --time 3.5 --x 318 --y 1341 [--from 1.6] [--to 4.2] [--box 112x84]

  --time  a moment (seconds) where the plate is clearly visible
  --x --y the centre of the plate in that frame, in pixels of the UPRIGHT full-size frame
          (get it with: ffmpeg -ss 3.5 -i IN.MOV -frames:v 1 frame.png  and look at the picture; phone videos are 1080x1920)
  --from --to  only pixelate between these times (stop when the vehicle has left the picture)
  --box   size of the pixelated box in pixels (default 112x84; make it about twice the plate)
Always check the result: ffmpeg -ss T -i OUT.mp4 -frames:v 1 check.png for several T across the clip.
"""
import argparse, json, subprocess
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("out")
ap.add_argument("--time", type=float, required=True); ap.add_argument("--x", type=int, required=True); ap.add_argument("--y", type=int, required=True)
ap.add_argument("--from", dest="t0", type=float, default=0.0); ap.add_argument("--to", dest="t1", type=float, default=1e9)
ap.add_argument("--box", default="112x84")
a = ap.parse_args()
BW, BH = map(int, a.box.lower().split("x"))

info = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "stream=index,codec_name,codec_type,avg_frame_rate", "-of", "json", a.src]))["streams"]
vid = next(s for s in info if s["codec_type"] == "video")
n, d = map(int, vid["avg_frame_rate"].split("/")); fps = n / d
aac = next((s["index"] for s in info if s["codec_type"] == "audio" and s["codec_name"] == "aac"), None)
probe = subprocess.check_output(["ffmpeg", "-v", "error", "-i", a.src, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "bmp", "-"])
W = int.from_bytes(probe[18:22], "little"); H = abs(int.from_bytes(probe[22:26], "little", signed=True))

raw = subprocess.run(["ffmpeg", "-v", "error", "-i", a.src, "-map", "0:v:0", "-vf", "format=rgb24", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
fs = W * H * 3; N = len(raw) // fs
frames = np.frombuffer(raw, dtype=np.uint8).reshape(N, H, W, 3)
gray = [f[::2, ::2].astype(np.float32).mean(axis=2) for f in frames]  # half size, for tracking
i0 = min(N - 1, int(round(a.time * fps))); cx, cy = a.x // 2, a.y // 2; tw, th = 28, 22
patch = lambda g, x, y: g[y - th // 2:y + th // 2, x - tw // 2:x + tw // 2]
pos = {i0: (cx, cy)}

def track(rng):
    x, y = cx, cy
    tpl = patch(gray[i0], x, y).copy()
    for i in rng:
        best = None
        for dy in range(-12, 13):
            for dx in range(-12, 13):
                p = patch(gray[i], x + dx, y + dy)
                if p.shape != tpl.shape: continue
                s = np.abs(p - tpl).mean()
                if best is None or s < best[0]: best = (s, dx, dy)
        x += best[1]; y += best[2]; pos[i] = (x, y)
        tpl = 0.6 * tpl + 0.4 * patch(gray[i], x, y)

track(range(i0 + 1, N)); track(range(i0 - 1, -1, -1))
enc = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-", "-i", a.src,
                        "-map", "0:v", *(["-map", f"1:{aac}", "-c:a", "copy"] if aac is not None else ["-an"]), "-c:v", "libx264", "-preset", "medium", "-crf", "14",
                        "-pix_fmt", "yuv420p", "-shortest", "-map_metadata", "-1", a.out], stdin=subprocess.PIPE)
for i in range(N):
    f = frames[i].copy()
    if a.t0 * fps <= i <= a.t1 * fps:
        X, Y = pos[i][0] * 2, pos[i][1] * 2
        x0, x1, y0, y1 = max(0, X - BW // 2), min(W, X + BW // 2), max(0, Y - BH // 2), min(H, Y + BH // 2)
        if x1 > x0 and y1 > y0:
            reg = f[y0:y1, x0:x1].astype(np.float32); hh, ww = reg.shape[:2]; bh, bw = max(1, hh // 14), max(1, ww // 14)
            small = reg[:hh // bh * bh, :ww // bw * bw].reshape(hh // bh, bh, ww // bw, bw, 3).mean(axis=(1, 3))
            big = np.repeat(np.repeat(small, bh, axis=0), bw, axis=1)
            reg[:big.shape[0], :big.shape[1]] = big
            f[y0:y1, x0:x1] = reg.astype(np.uint8)
    enc.stdin.write(f.tobytes())
enc.stdin.close(); enc.wait()
print(f"done: {N} frames, plate tracked from t={a.time}s, pixelated {a.t0}s to {min(a.t1, N / fps):.1f}s -> {a.out}")
