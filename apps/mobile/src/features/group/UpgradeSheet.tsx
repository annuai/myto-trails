import { useState } from 'react';
import { View } from 'react-native';
import type { GroupCapacity } from '@/api/groups';
import { needsUpgradePrompt, OPTION_TITLE, optionLine } from '@/lib/groupUpgrade';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

/**
 * Shown to the leader, inside the group sheet, once the ride has no room left. It is the point of intention: the leader is
 * trying to bring more riders. Riders never see it, never pay, and the free ride carries on as it is. Purchases are not open
 * yet (no billing provider), so the options are described and the one action is to carry on.
 */
export function RideFullNotice({ capacity }: { capacity: GroupCapacity }) {
  const [open, setOpen] = useState(false);
  if (!needsUpgradePrompt(capacity)) return null;
  return (
    <>
      <Card style={{ gap: space[2] }}>
        <Text variant="bodyMedium">{`This ride is full at ${capacity.limit} riders`}</Text>
        <Text variant="label" tone="muted">More riders can join if you host a larger ride.</Text>
        <Button variant="soft" onCard label="See larger rides" onPress={() => setOpen(true)} />
      </Card>
      <Sheet open={open} title="Host a larger ride" onClose={() => setOpen(false)}>
        <Text variant="label" tone="muted">Riders who join never pay. Only the person hosting does.</Text>
        <View style={{ gap: space[3] }}>
          {capacity.upgrades.map((o) => (
            <Card key={o.plan} style={{ gap: space[1] }}>
              <Text variant="bodyMedium">{OPTION_TITLE[o.plan]}</Text>
              <Text variant="label" tone="muted">{optionLine(o)}</Text>
            </Card>
          ))}
        </View>
        <Text variant="label" tone="muted">Buying is not open yet. Founding clubs and organisers can be given a larger ride by Myto.</Text>
        <Button label={`Carry on with ${capacity.limit} riders`} onPress={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
