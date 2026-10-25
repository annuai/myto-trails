import type { Status } from '@/ui/Chip';
import type { TrailLike } from '@/ui/TrailRow';
import type { Tint } from '@/theme/tokens';
import type { TrailSummary } from './types';

// Same words and tones as the website (apps/web/src/ui/StatusBadge/status-map.ts).
// TODO: move that file into a shared package so the two cannot drift.
export const access: Record<string, { status: Status; label: string }> = {
  public: { status: 'good', label: 'Publicly accessible' },
  permission_required: { status: 'caution', label: 'Permission required' },
  private_no_access: { status: 'stop', label: 'Private, no public access' },
  restricted: { status: 'stop', label: 'Restricted access' },
  unknown: { status: 'unknown', label: 'Access unknown' },
};
export const condition: Record<string, { status: Status; label: string }> = {
  open: { status: 'good', label: 'Open' },
  seasonal: { status: 'caution', label: 'Seasonal access' },
  temporarily_closed: { status: 'stop', label: 'Temporarily closed' },
  permanently_closed: { status: 'stop', label: 'Permanently closed' },
  unknown: { status: 'unknown', label: 'Condition unknown' },
};
export const verification: Record<string, { status: Status; label: string }> = {
  officially_verified: { status: 'good', label: 'Officially verified' },
  moderator_verified: { status: 'good', label: 'Moderator verified' },
  community_reported: { status: 'caution', label: 'Community reported' },
  unverified: { status: 'unknown', label: 'Unverified' },
};
const unknown = { status: 'unknown' as Status, label: 'Unknown' };
export const accessOf = (v: string) => access[v] ?? unknown;
export const conditionOf = (v: string) => condition[v] ?? unknown;
export const verificationOf = (v: string) => verification[v] ?? unknown;

const rank: Record<Status, number> = { stop: 3, caution: 2, unknown: 1, good: 0 };
/** The one chip a list shows: whichever of access and condition is worse, so a closed trail never reads as open. */
export function headline(t: Pick<TrailSummary, 'accessClass' | 'condition'>): { status: Status; label: string } {
  const a = accessOf(t.accessClass), c = conditionOf(t.condition);
  return rank[c.status] > rank[a.status] ? c : a;
}

const TINTS: Tint[] = ['sand', 'sage', 'clay', 'sky'];
const hash = (s: string) => [...s].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
const dur = (min: number | null) => (min == null ? '' : min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ''}` : `${min} min`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function toTrailLike(t: TrailSummary): TrailLike {
  const h = headline(t);
  return { id: t.slug, name: t.name, km: t.distanceKm ?? 0, time: dur(t.estDurationMin) || 'n/a', difficulty: cap(t.difficulty), status: h.status, statusLabel: h.label, seed: hash(t.slug) % 5, tint: TINTS[hash(t.slug) % 4]!, cover: t.cover?.variants['400'], coverAlt: t.cover?.altText };
}
