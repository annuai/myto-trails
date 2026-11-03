import { View } from 'react-native';
import type { BatteryStage } from '@/lib/leadCore';
import { BATTERY_WORDS } from '@/lib/leadCore';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Text } from '@/ui/Text';

/** A short question over the map with one or two answers: the leader's battery, a leader out of contact, a leader back. */
function Ask({ text, yes, onYes, no, onNo }: { text: string; yes: string; onYes: () => void; no?: string; onNo?: () => void }) {
  return (
    <Card padded={false} style={{ padding: space[3], gap: space[2] }}>
      <Text variant="bodyMedium">{text}</Text>
      <View style={{ gap: space[2] }}>
        <Button label={yes} onPress={onYes} />
        {no ? <Button variant="soft" label={no} onPress={onNo} /> : null}
      </View>
    </Card>
  );
}

/**
 * The questions about the lead that float over the map, most urgent first, one at a time:
 *  - you were out of contact and the lead was taken from you: take it back
 *  - the leader is out of contact and you may take over (you are the backup, a marshal or a captain)
 *  - you lead and your battery is low: choose who leads if your phone turns off
 */
export function LeadCards({ battery, level, leaderName, canTakeBack, canTakeLead, onTakeBack, onTakeLead, onChoose, onDismiss }: {
  battery: BatteryStage; level: number | null; leaderName?: string; canTakeBack?: boolean; canTakeLead?: boolean;
  onTakeBack: () => void; onTakeLead: () => void; onChoose: () => void; onDismiss: () => void;
}) {
  if (canTakeBack) return <Ask text={`${leaderName ?? 'A rider'} leads while you were out of contact. Take the lead back?`} yes="Take the lead back" onYes={onTakeBack} />;
  if (canTakeLead) return <Ask text={`${leaderName ?? 'The leader'} is out of contact. Take the lead?`} yes="Take the lead" onYes={onTakeLead} />;
  if ((battery === 'low' || battery === 'lower') && level !== null) return <Ask text={BATTERY_WORDS[battery](level)} yes="Choose who leads" onYes={onChoose} no="Dismiss" onNo={onDismiss} />;
  return null;
}
