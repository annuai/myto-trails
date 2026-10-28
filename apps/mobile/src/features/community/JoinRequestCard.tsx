import { Linking, View } from 'react-native';
import { Phone } from 'lucide-react-native';
import type { ClubJoinRequest } from '@/api/types';
import { formatPosted } from '@/lib/community';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { size, space } from '@/theme/tokens';

/** One join request, for the club's admins. The number can be tapped to call; it is only shown while the club may keep it. */
export function JoinRequestCard({ request: r, busy, onDecide }: { request: ClubJoinRequest; busy: boolean; onDecide: (d: 'accept' | 'decline') => void }) {
  return (
    <Card style={{ gap: space[3] }}>
      <Text variant="bodyMedium">{r.name}<Text variant="label" tone="muted">{`  ·  ${formatPosted(r.createdAt)}  ·  ${r.status}`}</Text></Text>
      {r.message ? <Text variant="body">{r.message}</Text> : null}
      {r.phone ? (
        <View accessibilityRole="link" accessibilityLabel={`Call ${r.phone}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: size.target }}>
          <Icon icon={Phone} size={18} tone="accent" />
          <Text variant="data" onPress={() => void Linking.openURL(`tel:${r.phone}`)}>{r.phone}</Text>
        </View>
      ) : <Text variant="label" tone="muted">Phone number deleted.</Text>}
      {r.status === 'pending' ? (
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          <Button flex label="Accept" disabled={busy} onPress={() => onDecide('accept')} />
          <Button flex variant="soft" label="Decline" disabled={busy} onPress={() => onDecide('decline')} />
        </View>
      ) : null}
    </Card>
  );
}
