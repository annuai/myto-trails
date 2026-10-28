import { createMemoryJournal } from './journal';

/** The web cannot record in the background, so the journal there is memory only (docs/superpowers/specs/2026-10-28-rides-recording-cache-clubs-design.md §3.2). */
export const journal = createMemoryJournal();
