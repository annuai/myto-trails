import { evaluateAll, type AchievementCategory, type ProgressSnapshot } from '@moto-trails/domain';
import { badgeStamp, localSnapshot } from '../badges';
import { MARKS, earnedMarks, type MarkGlyph, type MarkInput } from '../marks';

/** One Mark as the screen and the story see it: a local first-time mark or a domain badge, same shape. */
export type MarkView = {
  id: string;
  title: string;
  hint: string;
  glyph: MarkGlyph;
  category: AchievementCategory;
  state: 'earned' | 'in_progress' | 'locked' | 'needs_data';
  fraction: number;
  /** Badges only: progress counts, and the hint for a badge that waits on server data. */
  current?: number;
  target?: number;
};

/** Local marks first (category `personal`), then badges. `server` is undefined until the rider is signed in and online. */
export function markViews(input: MarkInput, server: ProgressSnapshot | undefined): MarkView[] {
  const got = new Set<string>(earnedMarks(input));
  const local: MarkView[] = MARKS.map((m) => ({
    id: m.id, title: m.title, hint: m.hint, glyph: m.glyph, category: 'personal',
    state: got.has(m.id) ? 'earned' : 'locked', fraction: got.has(m.id) ? 1 : 0,
  }));
  const badges: MarkView[] = evaluateAll({ ...localSnapshot(input.rides), ...server }).map((s) => ({
    id: s.def.id, title: s.def.title, hint: s.state === 'needs_data' ? s.hint : s.def.hint, glyph: badgeStamp(s).glyph,
    category: s.def.category, state: s.state, fraction: s.fraction, current: s.current, target: s.target,
  }));
  return [...local, ...badges];
}
