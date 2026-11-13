# Film capture: plan

Spec: [2026-11-13-film-capture-design.md](../specs/2026-11-13-film-capture-design.md).

1. `lib/filmLook.ts` + tests (TDD): matrices, blend, grain, vignette.
2. Storage: `journalMedia` keeps `{id}.orig.jpg`; `savePhoto(source, rendered?)`, `applyFilm`, `hasOriginal`; entry `look`; store `patch`.
3. Renderer: `ui/FilmImage` (SVG filters, native) and `.web` twin; `ui/Slider`.
4. `features/film/FilmSheet` + `useBake` (capture at 1600 px); `useJournalActions` opens it after pick and for a saved photo.
5. Journal card: Film and Share buttons; `lib/photoShare` seam to the composer; `app/dev/film` for the browser.
6. Review, checks, docs, PR.
