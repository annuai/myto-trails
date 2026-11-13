import { Linking } from 'react-native';
import { Phone, Share2 } from 'lucide-react-native';
import { telUrl } from '@/lib/crashAlert';
import { useProfile } from '@/store/profile';
import { Button } from '@/ui/Button';
import { EmergencyEditor } from '@/ui/EmergencyEditor';
import { Text } from '@/ui/Text';
import type { EmergencyChoice } from './useEmergency';

/**
 * The immediate actions of SOS: call the emergency number, share the position, the emergency card and the rider's contacts.
 * One body for the ride screen's SOS sheet and the SOS screen the widget opens when no ride is recording.
 */
export function SosActions({ emergency, onShare }: { emergency: EmergencyChoice; onShare: () => void }) {
  const contacts = useProfile((s) => s.contacts);
  const medical = useProfile((s) => s.medical);
  return (
    <>
      <Text variant="label" tone="muted">Call for help. This does not replace emergency services.</Text>
      <Button label={`Call ${emergency.number} (emergency)`} variant="emergency" icon={Phone} onPress={() => Linking.openURL(telUrl(emergency.number))} />
      <EmergencyEditor choice={emergency} />
      <Button variant="soft" icon={Share2} label="Share my position" onPress={onShare} />
      {medical.bloodGroup || medical.notes ? <Text variant="label" tone="muted">Emergency card: {[medical.bloodGroup && `blood group ${medical.bloodGroup}`, medical.notes].filter(Boolean).join(' · ')}</Text> : null}
      {contacts.map((c) => <Button key={c.id} variant="soft" icon={Phone} label={`${c.name}${c.primary ? ' (main)' : ''}`} onPress={() => Linking.openURL(`tel:${c.phone}`)} />)}
      {contacts.length === 0 ? <Text variant="label" tone="muted">No emergency contacts yet. Add them under You, Documents and emergency.</Text> : null}
    </>
  );
}
