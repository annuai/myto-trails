import { View } from 'react-native';
import { House } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { DrawnCheck } from '@/ui/DrawnCheck';
import { Text } from '@/ui/Text';
import { tellHome as k } from './TellHome.tokens';
import { useTellHome } from './useTellHome';

/** After a group ride: one button to tell the group you got home, which turns into a check once it is sent. */
export function TellHome({ groupId, title = 'You rode with a group' }: { groupId: string; title?: string }) {
  const { c } = useTheme();
  const { sent, busy, problem, tell } = useTellHome(groupId);
  return (
    <Card style={{ gap: space[3] }}>
      <Text variant="bodyMedium">{title}</Text>
      {sent ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          <DrawnCheck on color={c.good} size={k.check} stroke={k.stroke} />
          <Text variant="label" tone="good">{"The group knows you're home"}</Text>
        </View>
      ) : (
        <>
          <Text variant="label" tone="muted">Let them know you got in safe. Only the fact is sent, never where you are.</Text>
          <Button variant="soft" onCard icon={House} label={busy ? 'Telling the group…' : "Tell the group I'm home"} disabled={busy} onPress={() => void tell()} />
        </>
      )}
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
    </Card>
  );
}
