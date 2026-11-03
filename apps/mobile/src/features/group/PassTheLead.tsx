import { useState } from 'react';
import { View } from 'react-native';
import { Crown, Route as RouteIcon } from 'lucide-react-native';
import { ROLE_LABEL } from '@/lib/eventCore';
import { inOrder, leadCandidates } from '@/lib/leadCore';
import type { RiderTile } from '@/lib/groupCore';
import { useTheme } from '@/theme/ThemeProvider';
import { size, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { HoldButton } from '@/ui/HoldButton';
import { ListCard, Row } from '@/ui/ListCard';
import { Text } from '@/ui/Text';

/**
 * Who the lead goes to. The riders are listed with the one to suggest first (the backup leader, else a marshal, a captain, the nearest), marked
 * "Suggested". Choosing one does nothing yet: the sheet goes on to a confirmation (LeadConfirm), in the same sheet and not a second one on top.
 */
export function LeadPicker({ tiles, successorId, onPick }: { tiles: RiderTile[]; successorId?: string | null; onPick: (t: RiderTile) => void }) {
  // Who is suggested, and the order, are chosen when the list opens and then held: in a moving group the nearest rider changes every few seconds, and a list that reshuffles under a thumb is worse than a slightly old suggestion. The distances shown keep updating.
  const [order] = useState(() => leadCandidates(tiles, successorId).map((t) => t.id));
  const list = inOrder(tiles, order);
  if (!list.length) return <Text variant="label" tone="muted">There is nobody else in the group yet.</Text>;
  return (
    <ListCard>
      {list.map((t, i) => (
        <Row key={t.id} icon={Crown} label={t.name} sub={[...t.titles.map((x) => ROLE_LABEL[x]), t.distance ?? t.seen].join(' · ')} right={i === 0 ? <Text variant="labelMedium" tone="accent">Suggested</Text> : undefined} onPress={() => onPick(t)} />
      ))}
    </ListCard>
  );
}

/**
 * The step after choosing: say what will happen, and ask once. Nothing here is a second popup: it replaces the list in the same sheet.
 * While the bike is moving the button must be held, like Stop and SOS, so a bump cannot pass the lead.
 */
export function LeadConfirm({ name, leaving, moving, busy, onConfirm, onBack }: { name: string; /** Also leaves the group. */ leaving?: boolean; moving?: boolean; busy?: boolean; onConfirm: () => void; onBack: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space[3] }}>
      <Text variant="body">{leaving ? `${name} will lead the group from now on, and you will leave it.` : `${name} will lead the group from now on. You will ride as a rider.`}</Text>
      <Text variant="label" tone="muted">{`Everyone in the group is told straight away. ${leaving ? '' : 'They can pass the lead back to you.'}`.trim()}</Text>
      {moving
        ? <HoldButton label={leaving ? 'Hold to pass the lead and leave' : 'Hold to pass the lead'} icon={RouteIcon} color={c.accent} borderOnly row ms={700} minHeight={size.button} onComplete={onConfirm} />
        : <Button label={leaving ? 'Pass the lead and leave' : 'Pass the lead'} disabled={busy} onPress={onConfirm} />}
      <Button variant="soft" label="Cancel" onPress={onBack} />
    </View>
  );
}
