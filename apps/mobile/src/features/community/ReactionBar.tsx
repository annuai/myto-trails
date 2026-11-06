import { Pressable, View } from 'react-native';
import type { PostReaction } from '@/api/types';
import { REACTIONS } from '@/lib/reactions';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { photoPost } from './photos.tokens';

/** The six reactions under a post. One per person: tap another to change it, tap yours again to take it back. */
export function ReactionBar({ counts, mine, onReact }: { counts: Partial<Record<PostReaction, number>>; mine: PostReaction | null; onReact: (r: PostReaction | null) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
      {REACTIONS.map(({ key, glyph, label }) => {
        const n = counts[key] ?? 0;
        const picked = mine === key;
        return (
          <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${label}${n ? `, ${n}` : ''}${picked ? ', yours' : ''}`} accessibilityState={{ selected: picked }} onPress={() => onReact(picked ? null : key)}
            style={{ minHeight: photoPost.chipHeight, minWidth: photoPost.chipMin, paddingHorizontal: space[3], borderRadius: radius.chip, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[1], backgroundColor: picked ? c.accentSubtle : c.raised }}>
            <Text variant="label">{glyph}</Text>
            {n ? <Text variant="labelMedium" tone={picked ? 'accent' : 'muted'}>{n}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
