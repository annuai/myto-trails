import { Image, View } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';
import type { ClubMember } from '@/api/types';
import { Avatar } from '@/ui/Avatar';
import { Card } from '@/ui/Card';
import { IconButton } from '@/ui/IconButton';
import { Text } from '@/ui/Text';
import { media, radius, space } from '@/theme/tokens';

/** A club member with their bike. Admins get a menu to change the member's role or remove them. */
export function MemberCard({ member: m, onManage }: { member: ClubMember; onManage?: () => void }) {
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[4], padding: space[4] }}>
      <Avatar name={m.name} url={m.avatarUrl} size={media.avatarMd} />
      <View style={{ flex: 1, gap: space.half }}>
        <Text variant="bodyMedium">{m.name}{m.role === 'admin' ? ' · Admin' : ''}</Text>
        {m.bike ? <Text variant="label" tone="muted">{m.bike.name}{m.bike.modelYear ? ` · ${m.bike.modelYear}` : ''}</Text> : <Text variant="label" tone="muted">No bike added</Text>}
      </View>
      {m.bike?.photoUrl ? <Image source={{ uri: m.bike.photoUrl }} accessibilityLabel={`${m.name}'s ${m.bike.name}`} style={{ width: media.bikeThumbW, height: media.bikeThumbH, borderRadius: radius.thumb - 6 }} resizeMode="cover" /> : null}
      {onManage ? <IconButton icon={MoreHorizontal} label={`Manage ${m.name}`} onPress={onManage} plain /> : null}
    </Card>
  );
}
