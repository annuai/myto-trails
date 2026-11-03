import { View } from 'react-native';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Text } from '@/ui/Text';

/** A short question over the map with one answer: a leader out of contact, a leader back. */
function Ask({ text, yes, onYes }: { text: string; yes: string; onYes: () => void }) {
  return (
    <Card padded={false} style={{ padding: space[3], gap: space[2] }}>
      <Text variant="bodyMedium">{text}</Text>
      <View style={{ gap: space[2] }}><Button label={yes} onPress={onYes} /></View>
    </Card>
  );
}

/**
 * The questions about the lead that float over the map, one at a time:
 *  - you were out of contact and the lead was taken from you: take it back
 *  - the leader is out of contact and you may take over (you are the backup, a marshal or a captain)
 * A leader's low battery is not one of them: that opens its own sheet (BackupLeadSheet), because it needs a real choice.
 */
export function LeadCards({ leaderName, canTakeBack, canTakeLead, onTakeBack, onTakeLead }: { leaderName?: string; canTakeBack?: boolean; canTakeLead?: boolean; onTakeBack: () => void; onTakeLead: () => void }) {
  if (canTakeBack) return <Ask text={`${leaderName ?? 'A rider'} leads while you were out of contact. Take the lead back?`} yes="Take the lead back" onYes={onTakeBack} />;
  if (canTakeLead) return <Ask text={`${leaderName ?? 'The leader'} is out of contact. Take the lead?`} yes="Take the lead" onYes={onTakeLead} />;
  return null;
}
