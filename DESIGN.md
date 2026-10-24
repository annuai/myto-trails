# Design (concise)

Detail: [docs/08](docs/08-visual-direction.md), [docs/09](docs/09-design-system.md).

**Direction: "Survey sheet."** A cartographic, editorial, information-first interface that inherits Myto's palette and typefaces and drops the marketing site's decorative devices.

**Tone: modern, simple, minimal.** Generous whitespace (64 px section gaps), hairlines only between rows and around notices, one accent, three type sizes per page plus mono, almost no boxes, and a quiet footer with Donate and "Myto Trails is a subsidiary of myto-moto". See [docs/08](docs/08-visual-direction.md) §3b.

**Philosophy:** decision order drives hierarchy (access → condition → verification → difficulty → distance). Maps are functional, photographs are evidence, status is always glyph + word + colour. Few strong decisions, executed with restraint.

**Inherited from Myto (verified):** paper `#f2ede8`, surface `#f2f0ec`, ink `#1a1a1a`, muted `#6b6560`, 8% hairline, dark `#1c1c1a`, Michroma (display) + Geist (text), 4 px spacing base, `cubic-bezier(.4,0,.2,1)` motion, Tailwind v4 CSS tokens.

**Trails-specific:** accent survey blue `#1f4a6b` (8.0:1 on paper); status colours green `#2d6a3e`, amber `#8a5a00`, red `#a32d1c`, unknown `#6b6560` (all ≥ 4.9:1); Geist Mono for data; radii 0/2/4 px (not 16–32); sentence case only; no card-per-item; shadows only for popovers/dialogs/sheets. Brand red `#be3a23` is reserved for brand moments so it doesn't collide with "closed".

**Rules:** semantic tokens only; WCAG 2.2 AA; 44 px targets; visible 2 px focus; reduced-motion respected; maps always have a list/text equivalent; no gradients, no decorative icons, no carousels.
