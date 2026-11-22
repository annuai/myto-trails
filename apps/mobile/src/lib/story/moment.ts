import { TITLES, type TitleId } from './titles';

/** Which Pillion pose a Moment is drawn with. The art comes later; a Moment only names the pose. */
export type PillionPose = 'hello' | 'waiting' | 'map' | 'paw-up' | 'standing-up' | 'tired-happy' | 'campfire' | 'asleep' | 'waiting-for-a-ride' | 'time-to-rest' | 'map-reading';

/** Something worth telling the rider: a mark, a title, a standing, their year or a visit, with the Pillion pose that goes with it. */
export type Moment = { id: string; kind: 'mark' | 'title' | 'standing' | 'year' | 'visit'; title: string; body: string; pose: PillionPose };

/** Where a moment can be shown. */
export type Surface = 'ride-end' | 'dash' | 'year' | 'ride' | 'navigate' | 'error';

/** Surfaces where the rider is busy or something went wrong: a Moment never appears there. */
const QUIET: readonly Surface[] = ['ride', 'navigate', 'error'];

/** The governor: at most one Moment per session, never on a quiet surface, never one the rider has already seen. */
export function pickMoment(candidates: readonly Moment[], ctx: { surface: Surface; shownThisSession: readonly string[]; seen: readonly string[] }): Moment | undefined {
  if (QUIET.includes(ctx.surface) || ctx.shownThisSession.length > 0) return undefined;
  return candidates.find((c) => !ctx.seen.includes(c.id));
}

/** The moment for a newly earned mark. */
export const markMoment = (markId: string, markTitle: string): Moment => ({ id: `mark:${markId}`, kind: 'mark', title: `${markTitle}. A new mark.`, body: '', pose: 'paw-up' });

/** The moment for reaching a new title. */
export const titleMoment = (id: TitleId): Moment => ({ id: `title:${id}`, kind: 'title', title: `You are a ${TITLES.find((t) => t.id === id)?.name ?? 'rider'} now.`, body: '', pose: 'standing-up' });
