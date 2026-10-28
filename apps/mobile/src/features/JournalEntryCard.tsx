import { Image, View } from 'react-native';
import { Pause, Play, Trash2 } from 'lucide-react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { JournalEntry } from '@/lib/journalEntries';
import { mediaUri } from '@/lib/journalMedia';
import { Card } from '@/ui/Card';
import { IconButton } from '@/ui/IconButton';
import { Text } from '@/ui/Text';
import { radius, space } from '@/theme/tokens';

/** Width over height of a photo that did not record its size. */
const DEFAULT_RATIO = 4 / 3;

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
const timeOf = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function VoiceRow({ entry }: { entry: JournalEntry }) {
  const player = useAudioPlayer(mediaUri(entry.id, 'voice'));
  const status = useAudioPlayerStatus(player);
  const toggle = () => {
    if (status.playing) return player.pause();
    if (status.didJustFinish || (entry.durationSec && status.currentTime >= entry.durationSec - 0.2)) void player.seekTo(0);
    player.play();
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
      <IconButton icon={status.playing ? Pause : Play} label={status.playing ? 'Pause voice note' : 'Play voice note'} onPress={toggle} />
      <Text variant="data">{mmss(status.playing ? status.currentTime : entry.durationSec ?? 0)} / {mmss(entry.durationSec ?? 0)}</Text>
    </View>
  );
}

/** One entry on a ride's timeline: a note, a photo with its caption, or a voice note you can play. */
export function JournalEntryCard({ entry, onDelete }: { entry: JournalEntry; onDelete: () => void }) {
  const ratio = entry.width && entry.height ? entry.width / entry.height : DEFAULT_RATIO;
  return (
    <Card style={{ gap: space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="label" tone="muted">{timeOf(entry.at)} · {entry.kind === 'note' ? 'Note' : entry.kind === 'voice' ? 'Voice' : 'Photo'}</Text>
        <IconButton icon={Trash2} label="Delete this entry" onPress={onDelete} plain tone="muted" />
      </View>
      {entry.kind === 'photo' ? <Image source={{ uri: mediaUri(entry.id, 'photo') }} accessibilityLabel={entry.text || 'Ride photo'} style={{ width: '100%', aspectRatio: ratio, borderRadius: radius.control }} resizeMode="cover" /> : null}
      {entry.kind === 'voice' ? <VoiceRow entry={entry} /> : null}
      {entry.text ? <Text variant="body">{entry.text}</Text> : null}
    </Card>
  );
}
