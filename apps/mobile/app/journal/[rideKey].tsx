import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { BookOpen, Camera, Image as ImageIcon, Mic, Square, Trash2, PenLine, Pencil } from 'lucide-react-native';
import { JournalEntryCard } from '@/features/JournalEntryCard';
import { NoteSheet } from '@/features/NoteSheet';
import { journalDate, journalTitle } from '@/lib/journalTitle';
import { useJournalActions } from '@/lib/useJournalActions';
import { useJournal } from '@/store/journal';
import { useRides } from '@/store/rides';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { IconButton } from '@/ui/IconButton';
import { EmptyState } from '@/ui/EmptyState';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { space } from '@/theme/tokens';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** One journal: its entries in the order they were made, and the ways to add more. It may belong to a ride or stand alone. */
export default function RideJournal() {
  const { rideKey: raw } = useLocalSearchParams<{ rideKey: string }>();
  const rideKey = Number(raw);
  const entries = useJournal((s) => s.entries).filter((e) => e.rideKey === rideKey).sort((a, b) => a.at - b.at);
  const rides = useRides((s) => s.rides);
  const titles = useJournal((s) => s.titles);
  const title = journalTitle(rideKey, rides, titles);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');
  const a = useJournalActions(rideKey);
  const [note, setNote] = useState(false);
  const [deleting, setDeleting] = useState<string>();
  return (
    <Screen overlay={<>
      <Sheet open={renaming} title="Journal title" onClose={() => setRenaming(false)}>
        <Field label="Title" value={draft} onChangeText={setDraft} placeholder={journalDate(rideKey)} autoFocus />
        <Button label="Save title" onPress={() => { useJournal.getState().rename(rideKey, draft); setRenaming(false); }} />
      </Sheet>
      <NoteSheet open={note} canType={a.canType} onSave={a.addNote} onClose={() => setNote(false)} />
      <Sheet open={!!deleting} title="Delete this entry?" onClose={() => setDeleting(undefined)}>
        <Text variant="label" tone="muted">It is removed from this phone, along with its photo or recording. This cannot be undone.</Text>
        <Button variant="danger" icon={Trash2} label="Delete entry" onPress={() => { if (deleting) useJournal.getState().remove(deleting); setDeleting(undefined); }} />
        <Button variant="soft" label="Keep it" onPress={() => setDeleting(undefined)} />
      </Sheet>
    </>}>
      <BackHeader title="Journal" right={<IconButton icon={Pencil} label="Rename journal" onPress={() => { setDraft(titles[rideKey] ?? title); setRenaming(true); }} plain />} />
      <PageTitle sub={`${journalDate(rideKey)}. Kept on this phone only.`}>{title}</PageTitle>
      <View style={{ gap: space[3] }}>
        <Button icon={PenLine} label="Write a note" onPress={() => setNote(true)} />
        <Button variant="soft" icon={a.recording ? Square : Mic} label={a.recording ? `Stop recording ${mmss(a.seconds)}` : 'Record a voice note'} onPress={() => void a.toggleVoice()} />
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          <Button variant="soft" icon={Camera} label="Take photo" flex onPress={() => void a.addPhoto('camera')} />
          <Button variant="soft" icon={ImageIcon} label="Add photo" flex onPress={() => void a.addPhoto('library')} />
        </View>
        {a.problem ? <Text variant="label" tone="stop">{a.problem}</Text> : null}
        {!a.canType ? <Text variant="caption" tone="muted">Writing is available when you have stopped. Voice notes and photos work while you ride.</Text> : null}
      </View>
      <SectionTitle>Entries</SectionTitle>
      {entries.length ? (
        <View style={{ gap: space[3] }}>{entries.map((e) => <JournalEntryCard key={e.id} entry={e} onDelete={() => setDeleting(e.id)} />)}</View>
      ) : <EmptyState icon={BookOpen} title="Nothing here yet" body="Add a note, a voice note or a photo." />}
    </Screen>
  );
}
