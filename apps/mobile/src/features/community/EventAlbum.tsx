import { useState } from 'react';
import { FlatList, Image, Pressable, View } from 'react-native';
import { ImagePlus } from 'lucide-react-native';
import type { AlbumPhoto } from '@/api/types';
import { useClub, useEventAlbum } from '@/api/useApi';
import { queuePhotoPost } from '@/lib/queuePhotoPost';
import { savedText, savePhotos } from '@/lib/savePhotos';
import { useAction } from '@/lib/useAction';
import { radius, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { SectionTitle } from '@/ui/Header';
import { Text } from '@/ui/Text';
import { PhotoViewer } from './PhotoViewer';
import { PostSheet } from './PostSheet';
import { photoPost } from './photos.tokens';

/** The photos riders of the club posted from a ride event, in one place to look through, add to and keep. For the club's members only. */
export function EventAlbum({ clubId, eventId }: { clubId: string; eventId: string }) {
  const club = useClub(clubId);
  const member = club.data?.club.role != null;
  const album = useEventAlbum(clubId, eventId, member);
  const act = useAction();
  const [viewing, setViewing] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [note, setNote] = useState<string>();
  if (!member) return null;
  const photos: AlbumPhoto[] = album.data ?? [];
  const save = async (urls: string[]) => { setNote(undefined); const r = await savePhotos(urls); setNote(r.problem ?? savedText(r.saved)); };
  return (
    <>
      <SectionTitle>Photos</SectionTitle>
      {photos.length ? (
        <FlatList horizontal data={photos} keyExtractor={(p) => p.id} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}
          renderItem={({ item, index }) => (
            <Pressable accessibilityRole="imagebutton" accessibilityLabel={`Photo ${index + 1} by ${item.authorName}`} onPress={() => setViewing(index)}
              style={{ width: photoPost.strip * 1.5, height: photoPost.strip * 1.5, borderRadius: radius.control, overflow: 'hidden', backgroundColor: item.colour ?? undefined }}>
              <Image source={{ uri: item.thumbUrl }} style={{ width: photoPost.strip * 1.5, height: photoPost.strip * 1.5 }} resizeMode="cover" />
            </Pressable>
          )} />
      ) : <Text variant="label" tone="muted">{album.loading ? 'Loading…' : 'No photos yet. Be the first to add some.'}</Text>}
      <View style={{ marginTop: space[3] }}><Button variant="soft" icon={ImagePlus} label="Add photos" onPress={() => setComposing(true)} /></View>
      <PostSheet open={composing} allowRide={false} title="Add photos" busy={act.busy} problem={act.problem} onClose={() => { setComposing(false); act.clear(); }}
        onSubmit={(p) => void act.run(() => queuePhotoPost({ clubId, eventId, body: p.body, uris: p.photos ?? [] })).then((ok) => { if (ok) { setComposing(false); } })} />
      <PhotoViewer photos={photos} start={viewing} note={note} onClose={() => { setViewing(null); setNote(undefined); }} onSave={(p) => void save([p.fullUrl])} onSaveAll={() => void save(photos.map((p) => p.fullUrl))} />
    </>
  );
}
