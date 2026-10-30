import { useState } from 'react';
import { View } from 'react-native';
import type { EmergencyChoice } from '@/features/emergency/useEmergency';
import { cleanDialNumber } from '@/lib/emergencyNumber';
import { useRegion } from '@/store/region';
import { space } from '@/theme/tokens';
import { Button } from './Button';
import { Field } from './Field';
import { Text } from './Text';

/**
 * Under the emergency call button: why this number was chosen when we are not sure, other lines for the country, and a way to change it.
 * A number must never look surer than it is, and the rider can always correct it (it is kept for this session only).
 */
export function EmergencyEditor({ choice }: { choice: EmergencyChoice }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const save = () => {
    const n = cleanDialNumber(text);
    if (!n) return setError('Enter the number to dial, digits only.');
    useRegion.getState().setEmergencyOverride(n);
    setEditing(false);
    setError(undefined);
  };
  return (
    <View style={{ gap: space[2] }}>
      {choice.note ? <Text variant="caption" tone="muted">{choice.note}</Text> : null}
      {choice.others.length ? <Text variant="caption" tone="muted">{choice.others.map((o) => `${o.label}: ${o.number}`).join(' · ')}</Text> : null}
      {editing ? (
        <View style={{ gap: space[3] }}>
          <Field label="Emergency number" value={text} onChangeText={setText} keyboardType="phone-pad" placeholder={choice.number} error={error} />
          <View style={{ flexDirection: 'row', gap: space[3] }}>
            <View style={{ flex: 1 }}><Button variant="soft" label="Cancel" onPress={() => { setEditing(false); setError(undefined); }} /></View>
            <View style={{ flex: 1 }}><Button label="Use this number" onPress={save} /></View>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: space[4] }}>
          <Text variant="labelMedium" tone="accent" accessibilityRole="button" onPress={() => { setText(choice.number); setEditing(true); }}>Change number</Text>
          {choice.source === 'edited' ? <Text variant="labelMedium" tone="accent" accessibilityRole="button" onPress={() => useRegion.getState().setEmergencyOverride(null)}>Use the suggested number</Text> : null}
        </View>
      )}
    </View>
  );
}
