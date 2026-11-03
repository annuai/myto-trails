# Promo video: "This weekend, ride" (design and screenplay)

## Intent

A 60-second motion-graphics video that makes someone who has never heard of the app want to ride the coming weekend. The feeling is delight, with a quiet sense of safety: easier to explore trails, easier to ride in a group. It shows what the app really does and claims nothing it does not.

## Goals

- Viewer finishes thinking "I could do that this weekend".
- Shows five real capabilities in a calm arc: trusted trails, route planning, group rides, SOS, the ride journal.
- Works with the sound off (Instagram and WhatsApp autoplay muted). Every idea is carried by on-screen text.
- Strong first two seconds.

## Non-goals and anti-goals

- Not a feature tour or a spec sheet. If it reads like a list, it failed.
- No claim beyond what is built. Crash detection is beta and untested on real falls, so it is not shown. SOS is shown as "call for help and share your position", never as a replacement for emergency services.
- No stock-footage montage, no gradients, no loud hype. The tone is warm and unhurried.

## Deliverables

One set of scenes, three renders:

| File | Size | Use |
|---|---|---|
| `promo-9x16.mp4` | 1080×1920 | Instagram Reels and WhatsApp on a phone |
| `promo-4x5.mp4` | 1080×1350 | Instagram feed (optional) |
| `promo-16x9.mp4` | 1920×1080 | Website |

Constraints: 60 s, 30 fps, H.264 AAC. The 9:16 file stays under about 12 MB so WhatsApp does not crush it. Text stays inside Instagram's safe area (about 250 px clear at the top and bottom of the 9:16 frame, 64 px at the sides).

## Look

The app's own "survey sheet" style, from DESIGN.md: paper `#f2ede8`, ink `#1a1a1a`, muted `#6b6560`, survey blue `#1f4a6b` as the one accent, status green `#2d6a3e` / amber `#8a5a00` / red `#a32d1c`, brand red `#be3a23` only for the closing brand moment. Michroma for display words, Geist for text, Geist Mono for data. Hairlines, no cards, no gradients. Motion uses the app's easing `cubic-bezier(.4,0,.2,1)`. Real photographs from `apps/web/public` (the rider on the ridge, the four trail locations) appear sparingly as evidence, not decoration.

The phone screens in the video are rebuilt in code from the app's real screens and tokens, so they stay crisp at any size.

## Screenplay

Rider voice-over lines are in quotes; on-screen text is in CAPS. Voice-over is optional, and the video must read fully without it.

**1. Hook (0:00–0:05).** Warm paper. Thin contour lines draw themselves across the frame. A blue dot starts moving along a line. Cut on the beat to big type.
- ON SCREEN: `This weekend, ride.`
- VO: "Some weekends are meant for the road."

**2. Know before you go (0:05–0:16).** A trail page slides up. A go/no-go strip fills in one word at a time: Access *Open*, Condition *Good*, Verified *2 days ago*, each with a glyph, a word and a colour. A real trail photo settles behind it.
- ON SCREEN: `Know before you go.` then `Open. Good. Verified.`
- VO: "Know it's open. Know it's good. Know how we know."

**3. Plan it in a minute (0:16–0:27).** A search field types a place. A route draws itself along real roads across the map. Distance and time count up in mono type.
- ON SCREEN: `Plan it in a minute.`
- VO: "Pick a place. Get a route along real roads."

**4. Better together (0:27–0:40).** The map fills with coloured dots, one per friend, joining one by one. The leader's dot is ringed. A banner slides in: *Group destination*. A late dot drifts toward it and the group closes up.
- ON SCREEN: `Ride together. Stay together.`
- VO: "See everyone on the map. Never lose the group."

**5. One hold away (0:40–0:50).** The live ride screen, calm. A thumb presses and holds SOS, a ring fills, a sheet rises: *Call for help*, position shared. The moment is reassuring, not dramatic. Music softens.
- ON SCREEN: `Help is one hold away.`
- VO: "If you ever need help, it's one hold away."

**6. Every ride, remembered (0:50–1:00).** The ride journal story draws the day's track. The year recap numbers tick up. Everything settles into a still of the rider on the ridge, then the logo in brand red on paper.
- ON SCREEN: `Every ride, remembered.` then `See you on the trail.`
- VO: "Every ride, remembered. See you on the trail."

Voice-over is about 60 words, which fits the pacing at an unhurried 130 words per minute.

## How it is built (my calls)

- **Remotion** (React and TypeScript, free, renders to MP4 through ffmpeg). It matches the repo's stack, lets the screens reuse the app's colour and type tokens, and renders all three sizes from the same scenes. Lives in `apps/promo-video` so it does not touch the app.
- Voice-over is a separate audio track dropped in at the end, so the muted version is complete without it.
- No paid services. Fonts and tokens come from the repo.

## Open decisions (yours)

1. **Name on the end card.** The app is "Myto Moto" and the website is "Moto Trails". Which name closes the video?
2. **Call to action.** The app is still in testing. Should the end say "Coming soon", a web address, or nothing but the logo?
3. **Music.** I can't download tracks without your say-so. Options: you supply a licensed track, or I compose a simple ambient bed in code (free, plain, safe to use).
4. **Voice-over.** You record the lines above, or I try a generated voice. A generated voice is usually less natural than a person; I'd judge it after hearing it.
5. **Place names and trail shown in beats 2 and 3.** I'd use one of the four trails already in the repo (such as Hesarghatta Wetlands) so the facts are real. Say if you prefer another.
