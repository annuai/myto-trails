import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useProfile, type Licence } from '@/store/profile';
import { useTodos } from '@/store/todos';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { DateField, DatePickSheet } from '@/ui/DateField';
import { DocumentPhotoField } from '@/ui/DocumentPhotoField';
import { Field } from '@/ui/Field';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { Stack } from '@/ui/layout';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

import { space } from '@/theme/tokens';
const classes = [['MCWG', 'Motorcycle with gear'], ['MCWOG', 'Motorcycle without gear'], ['LMV', 'Light motor vehicle']] as const;

export default function LicenceForm() {
  const router = useRouter();
  const { licence, setLicence } = useProfile();
  const [f, setF] = useState<Licence>(licence ?? { holder: '', number: '', classes: ['MCWG'] });
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string>();
  const toggle = (k: string) => setF((x) => ({ ...x, classes: x.classes.includes(k) ? x.classes.filter((c) => c !== k) : [...x.classes, k] }));

  const save = () => {
    if (f.holder.trim().length < 2) return setError('Enter the name on the licence.');
    if (f.number.trim().length < 6) return setError('Enter the licence number as printed.');
    setLicence({ ...f, holder: f.holder.trim(), number: f.number.trim().toUpperCase() });
    useTodos.getState().syncSource('licence', 'Driving licence renewal', f.validTill || undefined);
    router.back();
  };
  const remove = () => { setLicence(undefined); useTodos.getState().syncSource('licence', '', undefined); router.back(); };

  return (
    <Screen
      footer={<Button label="Save licence" onPress={save} />}
      overlay={<DatePickSheet open={picking} title="Licence valid till" value={f.validTill} onPick={(validTill) => setF((x) => ({ ...x, validTill: validTill || undefined }))} onClose={() => setPicking(false)} />}
    >
      <BackHeader title="Documents" />
      <PageTitle>Driving licence</PageTitle>
      <View style={{ gap: space[5] }}>
        <Field label="Name on licence" value={f.holder} onChangeText={(holder) => setF({ ...f, holder })} autoComplete="name" />
        <Field label="Licence number" value={f.number} onChangeText={(number) => setF({ ...f, number })} autoCapitalize="characters" autoCorrect={false} hint="As printed on the card" />
        <Field label="Issuing RTO (optional)" value={f.rto ?? ''} onChangeText={(rto) => setF({ ...f, rto })} />
        <DateField label="Valid till" value={f.validTill} onPress={() => setPicking(true)} hint="You get a reminder in your to-do list" />
      </View>
      <SectionTitle>Photos</SectionTitle>
      <Stack gap={5}>
        <DocumentPhotoField docKind="licence" side="front" label="Front of licence" />
        <DocumentPhotoField docKind="licence" side="back" label="Back of licence" />
      </Stack>
      <SectionTitle>Vehicle classes</SectionTitle>
      <View style={{ gap: space[2] }}>{classes.map(([k, l]) => <ChoiceChip key={k} label={`${k} · ${l}`} selected={f.classes.includes(k)} onPress={() => toggle(k)} />)}</View>
      {error ? <Text variant="label" tone="stop" style={{ marginTop: space[4] }}>{error}</Text> : null}
      {licence ? <View style={{ marginTop: space[6] }}><Button variant="danger" icon={Trash2} label="Remove licence" onPress={remove} /></View> : null}
    </Screen>
  );
}
