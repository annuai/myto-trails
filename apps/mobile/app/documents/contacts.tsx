import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Phone, Plus, Star, Trash2 } from 'lucide-react-native';
import { useProfile } from '@/store/profile';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ChoiceChip, StatusChip } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { Field } from '@/ui/Field';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { IconButton } from '@/ui/IconButton';
import { ListCard } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { Siren } from 'lucide-react-native';
import { deviceRegion } from '@/lib/locale';
import { normalizePhone } from '@/lib/phone';
import { useHomeCountry } from '@/store/region';

const blood = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function Contacts() {
  const { contacts, medical, addContact, removeContact, makePrimary, setMedical } = useProfile();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [relation, setRelation] = useState('');
  const [error, setError] = useState<string>();
  const region = useHomeCountry() ?? deviceRegion() ?? 'IN';

  const save = () => {
    if (name.trim().length < 2) return setError('Enter a name.');
    // Saved as +<country code><number>, so a call works from any country.
    const number = normalizePhone(phone, region);
    if (!number) return setError('Enter a real phone number. Start with + and the country code if it is from another country.');
    addContact({ name: name.trim(), phone: number, relation: relation.trim() });
    setName(''); setPhone(''); setRelation(''); setError(undefined); setOpen(false);
  };

  return (
    <Screen
      footer={<Button icon={Plus} label="Add a contact" onPress={() => setOpen(true)} />}
      overlay={
        <Sheet open={open} title="New emergency contact" onClose={() => setOpen(false)} footer={<View style={{ gap: 8 }}>{error ? <Text variant="label" tone="stop">{error}</Text> : null}<Button label="Save contact" onPress={save} /></View>}>
          <View style={{ gap: 20 }}>
            <Field label="Name" value={name} onChangeText={setName} autoComplete="name" />
            <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
            <Field label="Who are they to you? (optional)" value={relation} onChangeText={setRelation} placeholder="e.g. Sister" />
          </View>
        </Sheet>
      }
    >
      <BackHeader title="Documents" />
      <PageTitle sub="The main contact is first in your SOS list.">Emergency contacts</PageTitle>
      {contacts.length === 0 ? <EmptyState icon={Siren} title="No contacts yet" body="Add someone who should be called if something goes wrong on a ride." /> : (
        <ListCard>
          {contacts.map((c) => (
            <View key={c.id} style={{ minHeight: 76, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="body">{c.name}</Text>
                <Text variant="data" tone="muted">{c.phone}{c.relation ? ` · ${c.relation}` : ''}</Text>
                {c.primary ? <StatusChip status="good" label="Main contact" /> : null}
              </View>
              <IconButton icon={Phone} label={`Call ${c.name}`} onPress={() => Linking.openURL(`tel:${c.phone}`)} plain />
              {!c.primary ? <IconButton icon={Star} label={`Make ${c.name} the main contact`} onPress={() => makePrimary(c.id)} plain tone="muted" /> : null}
              <IconButton icon={Trash2} label={`Remove ${c.name}`} onPress={() => removeContact(c.id)} plain tone="muted" />
            </View>
          ))}
        </ListCard>
      )}
      <SectionTitle>Helpful for responders</SectionTitle>
      <Card style={{ gap: 16 }}>
        <Text variant="labelMedium">Blood group</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {blood.map((b) => <ChoiceChip raised key={b} label={b} selected={medical.bloodGroup === b} onPress={() => setMedical({ ...medical, bloodGroup: medical.bloodGroup === b ? undefined : b })} />)}
        </View>
        <Field onCard label="Allergies or conditions (optional)" value={medical.notes ?? ''} onChangeText={(notes) => setMedical({ ...medical, notes })} multiline />
      </Card>
      <Text variant="caption" tone="muted" style={{ marginTop: 16 }}>Kept on this device. Myto Moto does not replace emergency services.</Text>
    </Screen>
  );
}
