import { useState } from 'react';
import { Alert, Image, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Plus } from 'lucide-react-native';
import { deletePhoto, photoUri, savePhoto, type DocKind, type DocPhoto, type DocSide } from '@/lib/localMedia';
import { useProfile } from '@/store/profile';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { documentPhoto } from './DocumentPhotoField.tokens';
import { Icon } from './Icon';
import { Inline, Stack } from './layout';
import { Text } from './Text';

type Props = { docKind: DocKind; side?: DocSide; label: string };

/** Thumbnails of the photos kept on this phone for one document, with add, replace and delete. */
export function DocumentPhotoField({ docKind, side, label }: Props) {
  const { c } = useTheme();
  const router = useRouter();
  const all = useProfile((s) => s.photos);
  const { addPhoto, removePhoto } = useProfile.getState();
  const photos = all.filter((p) => p.docKind === docKind && p.side === side);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (Platform.OS === 'web') {
    return <Stack gap={2}><Text variant="labelMedium">{label}</Text><Text variant="caption" tone="muted">Document photos are kept on the phone, so they are only available in the phone app.</Text></Stack>;
  }

  const pick = async (from: 'camera' | 'library'): Promise<string | undefined> => {
    if (from === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setError('Allow the camera in Settings to take a photo.'); return undefined; }
    }
    const r = from === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    return r.canceled ? undefined : r.assets[0].uri;
  };

  const add = async (from: 'camera' | 'library', replacing?: DocPhoto) => {
    setBusy(true); setError(undefined);
    try {
      const uri = await pick(from);
      if (!uri) return;
      const saved = await savePhoto(uri, docKind, side);
      if (replacing) { deletePhoto(replacing.id); removePhoto(replacing.id); }
      addPhoto(saved);
    } catch {
      setError('Could not save the photo. Try again.');
    } finally { setBusy(false); }
  };

  const source = (replacing?: DocPhoto) => Alert.alert(replacing ? 'Replace photo' : 'Add photo', undefined, [
    { text: 'Take a photo', onPress: () => void add('camera', replacing) },
    { text: 'Choose from library', onPress: () => void add('library', replacing) },
    { text: 'Cancel', style: 'cancel' },
  ]);

  const open = (p: DocPhoto) => Alert.alert(label, undefined, [
    { text: 'View', onPress: () => router.push({ pathname: '/documents/photo', params: { id: p.id } }) },
    { text: 'Replace', onPress: () => source(p) },
    { text: 'Delete', style: 'destructive', onPress: () => { deletePhoto(p.id); removePhoto(p.id); } },
    { text: 'Cancel', style: 'cancel' },
  ]);

  const tile = { width: documentPhoto.thumbWidth, height: documentPhoto.thumbHeight, borderRadius: documentPhoto.thumbRadius, overflow: 'hidden' as const, backgroundColor: c.card };
  return (
    <Stack gap={2}>
      <Text variant="labelMedium">{label}</Text>
      <Inline gap={2} wrap>
        {photos.map((p) => (
          <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`${label} photo`} onPress={() => open(p)} style={tile}>
            <Image source={{ uri: photoUri(p.id) }} style={{ width: '100%', height: '100%' }} />
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel={`Add photo of ${label}`} disabled={busy} onPress={() => source()} style={[tile, { alignItems: 'center', justifyContent: 'center', gap: space[1] }]}>
          <Icon icon={photos.length ? Plus : Camera} size={documentPhoto.addIcon} tone="muted" />
          <View><Text variant="caption" tone="muted">{busy ? 'Saving…' : 'Add'}</Text></View>
        </Pressable>
      </Inline>
      {error ? <Text variant="caption" tone="stop">{error}</Text> : <Text variant="caption" tone="muted">Kept on this phone only.</Text>}
    </Stack>
  );
}
