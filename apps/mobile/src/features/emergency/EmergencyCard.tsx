import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Phone } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { telUrl } from '@/lib/crashAlert';
import type { EmergencyCardData } from '@/lib/emergencyCard';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Text } from '@/ui/Text';

/**
 * What a responder needs to know about the rider, on one calm screen: the name big, blood group and organ donor side by side, then
 * anything medical, the bike and who to call. It shows only what the rider keeps on the phone, so it needs no signal. Opened from
 * the crash screen; "Back" returns to it.
 */
export function EmergencyCard({ data, onClose }: { data: EmergencyCardData; onClose: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, { backgroundColor: c.paper, paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[6], paddingHorizontal: space[6], gap: space[5] }]}>
      <ScrollView contentContainerStyle={{ gap: space[5] }} showsVerticalScrollIndicator={false}>
        <Text variant="section" accessibilityRole="header">Emergency card</Text>
        <Card style={{ gap: space[5] }}>
          <Text variant="title">{data.name}</Text>
          <View style={{ flexDirection: 'row', gap: space[3] }}>
            {data.facts.map((f) => (
              <View key={f.label} accessible accessibilityLabel={`${f.label}: ${f.value}`} style={{ flex: 1, gap: space[1], padding: space[4], borderRadius: radius.control, backgroundColor: c.raised }}>
                {/* Not the monospace face: there the letter O of "O+" reads as a zero. */}
                <Text variant="title" tone={f.set ? 'ink' : 'muted'}>{f.value}</Text>
                <Text variant="caption" tone="muted">{f.label}</Text>
              </View>
            ))}
          </View>
          {data.notes ? (
            <View style={{ gap: space[1] }}>
              <Text variant="labelMedium">Allergies or conditions</Text>
              <Text variant="body">{data.notes}</Text>
            </View>
          ) : null}
          {data.bike ? (
            <View style={{ gap: space[1] }}>
              <Text variant="labelMedium">Bike</Text>
              <Text variant="body">{data.bike}</Text>
            </View>
          ) : null}
        </Card>
        {data.contacts.length ? (
          <View style={{ gap: space[3] }}>
            <Text variant="section">Call someone</Text>
            {data.contacts.map((p) => (
              <Button key={p.phone + p.name} big variant={p.primary ? 'accent' : 'soft'} icon={Phone} label={p.relation ? `Call ${p.name} (${p.relation})` : `Call ${p.name}`} onPress={() => void Linking.openURL(telUrl(p.phone))} />
            ))}
          </View>
        ) : <Text variant="label" tone="muted">No emergency contacts are saved on this phone.</Text>}
      </ScrollView>
      <Button big variant="soft" label="Back" onPress={onClose} />
    </View>
  );
}
