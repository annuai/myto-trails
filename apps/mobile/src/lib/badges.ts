import { ACHIEVEMENTS, byCategory, evaluateAll, type AchievementCategory, type AchievementStatus, type ProgressSnapshot } from '@moto-trails/domain';
import type { MarkGlyph, MarkRide } from './marks';


/**
 * Different weekends on which the rider recorded a ride, never in a row and never by how far: one ride on a Saturday or a Sunday
 * counts the weekend once. The seeded sample ride is ignored.
 */
export function weekendsRidden(rides: readonly MarkRide[]): number {
  const keys = new Set<string>();
  for (const r of rides) {
    if (r.sample) continue;
    const d = new Date(r.startedAt);
    const day = d.getDay();
    if (day !== 0 && day !== 6) continue;
    // Name the weekend by its Saturday, so a Sunday belongs to the Saturday before it.
    const sat = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (day === 0 ? 1 : 0));
    keys.add(`${sat.getFullYear()}-${sat.getMonth()}-${sat.getDate()}`);
  }
  return keys.size;
}

/** What the phone itself can count. Server numbers (Trailmarks, trails ridden) are merged on top when they are known. */
export const localSnapshot = (rides: readonly MarkRide[]): ProgressSnapshot => ({ weekendsRidden: weekendsRidden(rides) });

export const badgeGroups = (rides: readonly MarkRide[], server: ProgressSnapshot | undefined) => byCategory(evaluateAll({ ...localSnapshot(rides), ...server }));

/** Badges borrow the existing stamp glyphs: one per category, so a badge reads as a Mark and not as a second system. */
const GLYPH: Record<AchievementCategory, MarkGlyph> = { exploration: 'route', community: 'riders', contribution: 'nut', personal: 'dial' };
export const badgeStamp = (s: AchievementStatus) => ({ title: s.def.title, glyph: GLYPH[s.def.category] });
export const BADGE_COUNT = ACHIEVEMENTS.length;
