import type { PostReaction } from '@/api/types';

/** The six reactions, in the order they are shown, and the picture each one is. */
export const REACTIONS: { key: PostReaction; glyph: string; label: string }[] = [
  { key: 'like', glyph: '👍', label: 'Like' },
  { key: 'love', glyph: '❤️', label: 'Love' },
  { key: 'fire', glyph: '🔥', label: 'Fire' },
  { key: 'laugh', glyph: '😂', label: 'Haha' },
  { key: 'wow', glyph: '😮', label: 'Wow' },
  { key: 'thanks', glyph: '🙏', label: 'Thanks' },
];

/**
 * The counts after the caller picks `next` (or null to take it back), without waiting for the site: their old reaction goes down by one,
 * the new one goes up by one. The site's answer replaces this a moment later.
 */
export function withMyReaction(counts: Partial<Record<PostReaction, number>>, mine: PostReaction | null, next: PostReaction | null): Partial<Record<PostReaction, number>> {
  const out = { ...counts };
  if (mine) out[mine] = Math.max(0, (out[mine] ?? 0) - 1);
  if (next) out[next] = (out[next] ?? 0) + 1;
  for (const k of Object.keys(out) as PostReaction[]) if (!out[k]) delete out[k];
  return out;
}
