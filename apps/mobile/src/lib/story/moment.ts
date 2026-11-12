import { TITLES, type TitleId } from './titles';

/** Which Pillion pose a Moment is drawn with. The art comes later; a Moment only names the pose. */
export type PillionPose = 'hello' | 'waiting' | 'map' | 'paw-up' | 'standing-up' | 'tired-happy' | 'campfire' | 'asleep';

export type Moment = { id: string; kind: 'mark' | 'title' | 'standing' | 'year'; title: string; body: string; pose: PillionPose };

export type Surface = 'ride-end' | 'dash' | 'year' | 'ride' | 'navigate' | 'error';

/** Surfaces where the rider is busy or something went wrong: a Moment never appears there. */
const QUIET: readonly Surface[] = ['ride', 'navigate', 'error'];

/** The governor: at most one Moment per session, never on a quiet surface, never one the rider has already seen. */
export function pickMoment(candidates: readonly Moment[], ctx: { surface: Surface; shownThisSession: readonly string[]; seen: readonly string[] }): Moment | undefined {
  if (QUIET.includes(ctx.surface) || ctx.shownThisSession.length > 0) return undefined;
  return candidates.find((c) => !ctx.seen.includes(c.id));
}

export const markMoment = (markId: string, markTitle: string): Moment => ({ id: `mark:${markId}`, kind: 'mark', title: `${markTitle}. A new mark.`, body: '', pose: 'paw-up' });

export const titleMoment = (id: TitleId): Moment => ({ id: `title:${id}`, kind: 'title', title: `You are a ${TITLES.find((t) => t.id === id)!.name} now.`, body: '', pose: 'standing-up' });
