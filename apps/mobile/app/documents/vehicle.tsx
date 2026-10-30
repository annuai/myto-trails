import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useProfile, type Vehicle } from '@/store/profile';
import { useTodos } from '@/store/todos';
import { Button } from '@/ui/Button';
import { DateField, DatePickSheet } from '@/ui/DateField';
import { DocumentPhotoField } from '@/ui/DocumentPhotoField';
import { Field } from '@/ui/Field';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { Stack } from '@/ui/layout';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

import { space } from '@/theme/tokens';
type DateKey = 'rcValidTill' | 'insuranceValidTill' | 'pucValidTill';
const dates: { key: DateKey; label: string; source: string; todo: string }[] = [
  { key: 'rcValidTill', label: 'Registration (RC) valid till', source: 'rc', todo: 'Registration (RC) renewal' },
  { key: 'insuranceValidTill', label: 'Insurance valid till', source: 'insurance', todo: 'Insurance renewal' },
  { key: 'pucValidTill', label: 'PUC valid till', source: 'puc', todo: 'PUC certificate' },
];

export default function VehicleForm() {
  const router = useRouter();
  const { vehicle, setVehicle } = useProfile();
  const [f, setF] = useState<Vehicle>(vehicle ?? { regNo: '', model: '', ownerName: '' });
  const [picking, setPicking] = useState<DateKey | null>(null);
  const [error, setError] = useState<string>();

  const save = () => {
    if (f.regNo.trim().length < 4) return setError('Enter the registration number.');
    if (f.model.trim().length < 2) return setError('Enter the make and model.');
    setVehicle({ ...f, regNo: f.regNo.trim().toUpperCase(), model: f.model.trim() });
    for (const d of dates) useTodos.getState().syncSource(d.source, d.todo, f[d.key] || undefined);
    router.back();
  };
  const remove = () => { setVehicle(undefined); for (const d of dates) useTodos.getState().syncSource(d.source, '', undefined); router.back(); };
  const current = picking ? dates.find((d) => d.key === picking) : undefined;

  return (
    <Screen
      footer={<Button label="Save vehicle" onPress={save} />}
      overlay={<DatePickSheet open={!!picking} title={current?.label ?? ''} value={picking ? f[picking] : undefined} onPick={(v) => picking && setF((x) => ({ ...x, [picking]: v || undefined }))} onClose={() => setPicking(null)} />}
    >
      <BackHeader title="Documents" />
      <PageTitle>Vehicle and papers</PageTitle>
      <View style={{ gap: space[5] }}>
        <Field label="Registration number" value={f.regNo} onChangeText={(regNo) => setF({ ...f, regNo })} autoCapitalize="characters" autoCorrect={false} />
        <Field label="Make and model" value={f.model} onChangeText={(model) => setF({ ...f, model })} />
        <Field label="Owner name (optional)" value={f.ownerName} onChangeText={(ownerName) => setF({ ...f, ownerName })} />
        <DateField label={dates[0].label} value={f.rcValidTill} onPress={() => setPicking('rcValidTill')} />
        <DocumentPhotoField docKind="rc" label="Registration certificate (RC)" />
      </View>
      <SectionTitle>Insurance</SectionTitle>
      <View style={{ gap: space[5] }}>
        <Field label="Insurer (optional)" value={f.insurer ?? ''} onChangeText={(insurer) => setF({ ...f, insurer })} />
        <Field label="Policy number (optional)" value={f.policyNo ?? ''} onChangeText={(policyNo) => setF({ ...f, policyNo })} autoCapitalize="characters" autoCorrect={false} />
        <DateField label={dates[1].label} value={f.insuranceValidTill} onPress={() => setPicking('insuranceValidTill')} />
        <DocumentPhotoField docKind="insurance" label="Insurance policy" />
      </View>
      <SectionTitle>Pollution certificate</SectionTitle>
      <Stack gap={5}>
        <DateField label={dates[2].label} value={f.pucValidTill} onPress={() => setPicking('pucValidTill')} hint="Dates become reminders in your to-do list" />
        <DocumentPhotoField docKind="puc" label="PUC certificate" />
      </Stack>
      {error ? <Text variant="label" tone="stop" style={{ marginTop: space[4] }}>{error}</Text> : null}
      {vehicle ? <View style={{ marginTop: space[6] }}><Button variant="danger" icon={Trash2} label="Remove vehicle" onPress={remove} /></View> : null}
    </Screen>
  );
}
