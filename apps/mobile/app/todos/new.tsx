import { useState } from 'react';
import { fromKm, toKm } from '@/lib/units';
import { useDistanceUnit } from '@/store/region';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarClock, FileText, PenLine, Wrench, Package } from 'lucide-react-native';
import { templates, type Template } from '@/data/todoTemplates';
import { addDays, formatDate, todayISO } from '@/lib/dates';
import type { Todo } from '@/lib/todos';
import { totalKm, useRides } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { DatePicker } from '@/ui/DatePicker';
import { Field } from '@/ui/Field';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

type Draft = { title: string; category: Todo['category']; kind: 'date' | 'service'; due: string; everyKm: string; everyMonths: string; lastDate: string; custom: boolean };
const iconFor = { document: FileText, service: Wrench, pack: Package, other: PenLine } as const;
const fromTemplate = (t: Template): Draft => ({ title: t.title, category: t.category, kind: t.kind, due: addDays(todayISO(), 7), everyKm: t.everyKm ? String(Math.round(fromKm(t.everyKm))) : '', everyMonths: String(t.everyMonths ?? 1), lastDate: todayISO(), custom: false });
const blank: Draft = { title: '', category: 'other', kind: 'date', due: addDays(todayISO(), 7), everyKm: '', everyMonths: '1', lastDate: todayISO(), custom: true };

export default function NewTodo() {
  const router = useRouter();
  const add = useTodos((s) => s.add);
  const unit = useDistanceUnit();
  const appKm = totalKm(useRides((s) => s.rides));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string>();
  const set = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const save = () => {
    if (!draft) return;
    if (draft.title.trim().length < 2) return setError('Give it a name.');
    if (draft.kind === 'service' && !(+draft.everyKm > 0) && !(+draft.everyMonths > 0)) return setError('Set a distance or a number of months.');
    if (draft.kind === 'date') add({ title: draft.title.trim(), category: draft.category, kind: 'date', due: draft.due });
    else add({ title: draft.title.trim(), category: 'service', kind: 'service', everyKm: +draft.everyKm > 0 ? Math.round(toKm(+draft.everyKm)) : undefined, everyMonths: +draft.everyMonths > 0 ? +draft.everyMonths : 1, lastDate: draft.lastDate, lastKm: appKm });
    setDraft(null); setError(undefined); router.back();
  };

  return (
    <Screen overlay={
      <Sheet open={!!draft} title={draft?.custom ? 'Your own to-do' : draft?.title ?? ''} onClose={() => { setDraft(null); setError(undefined); }} footer={<View style={{ gap: 8 }}>{error ? <Text variant="label" tone="stop">{error}</Text> : null}<Button label="Add to list" onPress={save} /></View>}>
        {draft ? (
          <View style={{ gap: 20 }}>
            {draft.custom ? <Field label="Name" value={draft.title} onChangeText={(title) => set({ title })} placeholder="What needs doing? e.g. Replace brake pads" /> : null}
            {draft.custom ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <ChoiceChip label="On a date" selected={draft.kind === 'date'} onPress={() => set({ kind: 'date' })} icon={CalendarClock} />
                <ChoiceChip label={`Every ${unit === 'mi' ? 'mile' : 'km'} or months`} selected={draft.kind === 'service'} onPress={() => set({ kind: 'service' })} icon={Wrench} />
              </View>
            ) : null}
            {draft.kind === 'date' ? (
              <View style={{ gap: 12 }}><Text variant="labelMedium">Due on {formatDate(draft.due)}</Text><DatePicker value={draft.due} onChange={(due) => set({ due })} /></View>
            ) : (
              <View style={{ gap: 20 }}>
                <Text variant="label" tone="muted">Due after whichever comes first. Only rides recorded in Myto Moto count towards the distance, so keep the months limit too.</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}><Field label={`Every (${unit === 'mi' ? 'miles' : 'km'})`} keyboardType="numeric" value={draft.everyKm} onChangeText={(everyKm) => set({ everyKm: everyKm.replace(/\D/g, '') })} placeholder="500" /></View>
                  <View style={{ flex: 1 }}><Field label="Or months" keyboardType="numeric" value={draft.everyMonths} onChangeText={(everyMonths) => set({ everyMonths: everyMonths.replace(/\D/g, '') })} placeholder="1" /></View>
                </View>
                <View style={{ gap: 12 }}><Text variant="labelMedium">Last done {formatDate(draft.lastDate)}</Text><DatePicker past value={draft.lastDate} onChange={(lastDate) => set({ lastDate })} /></View>
              </View>
            )}
          </View>
        ) : null}
      </Sheet>
    }>
      <BackHeader title="To-do list" />
      <PageTitle sub="Write your own, or pick a common one and set the date.">Add a to-do</PageTitle>
      <ListCard><Row icon={PenLine} label="Write your own" onPress={() => setDraft(blank)} /></ListCard>
      <SectionTitle>Or pick a common one</SectionTitle>
      <ListCard>
        {templates.map((t) => <Row key={t.key} icon={iconFor[t.category]} label={t.title} sub={t.hint} onPress={() => setDraft(fromTemplate(t))} />)}
      </ListCard>
    </Screen>
  );
}
