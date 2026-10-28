import { View } from 'react-native';
import { CalendarClock, MapPin, Users } from 'lucide-react-native';
import type { ClubPost } from '@/api/types';
import { formatPosted, formatRideWhen } from '@/lib/community';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ChoiceChip } from '@/ui/Chip';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { size, space } from '@/theme/tokens';

/** A club post or ride plan, with its replies and Going / Maybe. Replies are rows inside the card, never cards of their own. */
export function ClubPostCard({ post, canRemove, busy, group, onRespond, onReply, onRemove }: {
  post: ClubPost; canRemove: boolean; busy: boolean;
  /** Start the group ride for this plan, or join the one that is on. Only shown on a ride plan. */
  group?: { label: string; onPress: () => void };
  onRespond: (r: 'going' | 'maybe' | null) => void; onReply: () => void; onRemove: () => void;
}) {
  const { c } = useTheme();
  const plan = post.kind === 'ride_plan' && post.at;
  return (
    <Card style={{ gap: space[3] }}>
      <Text variant="label" tone="muted">{post.authorName}{post.mine ? ' (you)' : ''} · {formatPosted(post.createdAt)}{plan ? ' · Ride plan' : ''}</Text>
      {plan ? (
        <View style={{ gap: space[1] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}><Icon icon={CalendarClock} size={20} tone="accent" /><Text variant="bodyMedium">{formatRideWhen(post.at!)}</Text></View>
          {post.place ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}><Icon icon={MapPin} size={20} tone="muted" /><Text variant="label" tone="muted" style={{ flex: 1 }}>{post.place}</Text></View> : null}
        </View>
      ) : null}
      <Text variant="body">{post.body}</Text>
      {plan ? (
        <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
          <ChoiceChip label={`Going (${post.going})`} selected={post.myResponse === 'going'} onPress={() => !busy && onRespond(post.myResponse === 'going' ? null : 'going')} />
          <ChoiceChip label={`Maybe (${post.maybe})`} selected={post.myResponse === 'maybe'} onPress={() => !busy && onRespond(post.myResponse === 'maybe' ? null : 'maybe')} />
        </View>
      ) : null}
      {plan && group ? <Button variant="soft" icon={Users} label={group.label} disabled={busy} onPress={group.onPress} /> : null}
      {post.replies.length ? (
        <View style={{ gap: space[3], borderLeftWidth: size.rule, borderLeftColor: c.line, paddingLeft: space[4] }}>
          {post.replies.map((r) => (
            <View key={r.id} style={{ gap: space.half }}>
              <Text variant="caption" tone="muted">{r.authorName}{r.mine ? ' (you)' : ''} · {formatPosted(r.createdAt)}</Text>
              <Text variant="label">{r.body}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: space[5] }}>
        <Text variant="labelMedium" tone="accent" accessibilityRole="button" onPress={onReply} style={{ paddingVertical: space[3] }}>Reply</Text>
        {canRemove ? <Text variant="labelMedium" tone="muted" accessibilityRole="button" onPress={onRemove} style={{ paddingVertical: space[3] }}>Remove post</Text> : null}
      </View>
    </Card>
  );
}
