import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CalendarClock, ImagePlus, X } from 'lucide-react-native';
import { hasLink, rideAtISO } from '@/lib/community';
import { addDays, todayISO } from '@/lib/dates';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { DateField } from '@/ui/DateField';
import { Field } from '@/ui/Field';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { TimeField } from '@/ui/TimeField';
import { space } from '@/theme/tokens';
import { useOnChange } from '@/lib/useOnChange';
import { PHOTOS_PER_POST } from '@/lib/photoSizes';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Icon } from '@/ui/Icon';
import { photoPost } from './photos.tokens';

export type NewPost = { body: string; rideAt?: string; place?: string; /** The chosen photos, as the phone's own file addresses. A post with photos is never a ride plan. */ photos?: string[] };
const DEFAULT_START = 6 * 60 + 30;

/**
 * Post to the club, with photos if you like, or turn the post into a ride plan with a day, a time (India time) and a meeting place.
 * `allowRide` false (the album of a ride event) keeps it to text and photos.
 */
export function PostSheet({ open, busy, problem, onSubmit, onClose, allowRide = true, title }: { open: boolean; busy: boolean; problem?: string; onSubmit: (p: NewPost) => void; onClose: () => void; allowRide?: boolean; title?: string }) {
  const { c } = useTheme();
  const [photos, setPhotos] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [ride, setRide] = useState(false);
  const [date, setDate] = useState(() => addDays(todayISO(), 1));
  const [minutes, setMinutes] = useState(DEFAULT_START);
  const [place, setPlace] = useState('');
  // Only a fresh sheet resets the form; a failed save keeps everything that was typed.
  useOnChange(open, (o) => { if (o) { setBody(''); setRide(false); setDate(addDays(todayISO(), 1)); setMinutes(DEFAULT_START); setPlace(''); setPhotos([]); } });
  const text = body.trim();
  const bad = hasLink(text) || (ride && hasLink(place));
  const ready = (text.length > 0 || (!ride && photos.length > 0)) && !bad && (!ride || place.trim().length > 0);
  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: PHOTOS_PER_POST - photos.length, orderedSelection: true, quality: 1 });
    if (!r.canceled) setPhotos((p) => [...p, ...r.assets.map((a) => a.uri)].slice(0, PHOTOS_PER_POST));
  };
  return (
    <Sheet open={open} title={title ?? (ride ? 'Plan a ride' : 'New post')} onClose={onClose}
      footer={<Button label={busy ? (photos.length && !ride ? 'Preparing photos…' : 'Posting…') : ride ? 'Post ride plan' : photos.length ? `Post ${photos.length === 1 ? 'photo' : `${photos.length} photos`}` : 'Post'} disabled={busy || !ready} onPress={() => onSubmit({ body: text, ...(ride ? { rideAt: rideAtISO(date, minutes), place: place.trim() } : photos.length ? { photos } : {}) })} />}>
      <Field label={ride ? 'Details' : photos.length ? 'Say something about them (optional)' : 'Post something'} value={body} onChangeText={setBody} multiline autoFocus maxLength={1000} error={hasLink(text) ? 'Please leave web addresses out.' : undefined} />
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
        {allowRide ? <ChoiceChip icon={CalendarClock} label="Make it a ride plan" selected={ride} onPress={() => setRide((r) => !r)} /> : null}
        {!ride && photos.length < PHOTOS_PER_POST ? <ChoiceChip icon={ImagePlus} label={photos.length ? 'Add more photos' : 'Add photos'} onPress={() => void pick()} /> : null}
      </View>
      {!ride && photos.length ? (
        <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
          {photos.map((uri) => (
            <View key={uri} style={{ width: photoPost.strip, height: photoPost.strip, borderRadius: radius.control, overflow: 'hidden', backgroundColor: c.raised }}>
              <Image source={{ uri }} style={{ width: photoPost.strip, height: photoPost.strip }} resizeMode="cover" />
              <Pressable accessibilityRole="button" accessibilityLabel="Remove this photo" onPress={() => setPhotos((p) => p.filter((x) => x !== uri))} style={{ position: 'absolute', top: space[1], right: space[1], borderRadius: radius.chip, backgroundColor: c.card, padding: space[1] }}><Icon icon={X} size={16} /></Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {ride ? (
        <View style={{ gap: space[4] }}>
          <DateField label="Day" title="Choose day of the ride" value={date} min={todayISO()} onChange={setDate} />
          <TimeField label="Start time (India time)" value={minutes} onChange={setMinutes} />
          <Field label="Meeting place" value={place} onChangeText={setPlace} maxLength={120} error={hasLink(place) ? 'Please leave web addresses out.' : undefined} />
        </View>
      ) : null}
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
    </Sheet>
  );
}
