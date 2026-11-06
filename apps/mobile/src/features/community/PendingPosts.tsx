import { Image, View } from 'react-native';
import { usePhotoOutbox } from '@/store/photoOutbox';
import { discardCopies } from '@/lib/photoCopies';
import { forClub, removePost, retryNow } from '@/lib/photoOutbox';
import { radius, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Text } from '@/ui/Text';
import { photoPost } from './photos.tokens';

/** The club's posts of photos that are still on their way: shown at once with the photos, so posting feels instant, with Retry and Discard if the site refused one. */
export function PendingPosts({ clubId }: { clubId: string }) {
  const items = usePhotoOutbox((s) => s.items);
  const mine = forClub(items, clubId);
  if (mine.length === 0) return null;
  const set = usePhotoOutbox.getState().setItems;
  return (
    <View style={{ gap: space[3] }}>
      {mine.map((p) => (
        <Card key={p.id} style={{ gap: space[3] }}>
          <Text variant="label" tone={p.error ? 'stop' : 'muted'}>
            {p.error ? p.error : p.tries > 0 ? 'Waiting for a signal. It will send by itself.' : `Posting ${p.photos.length === 1 ? 'your photo' : `${p.photos.length} photos`}…`}
          </Text>
          <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
            {p.photos.map((ph) => <Image key={ph.copies.thumb.uri} source={{ uri: ph.copies.thumb.uri }} style={{ width: photoPost.strip, height: photoPost.strip, borderRadius: radius.control }} />)}
          </View>
          {p.body ? <Text variant="body">{p.body}</Text> : null}
          {p.error ? (
            <View style={{ flexDirection: 'row', gap: space[2] }}>
              <View style={{ flex: 1 }}><Button variant="soft" label="Try again" onPress={() => set(retryNow(usePhotoOutbox.getState().items, p.id, Date.now()))} /></View>
              <View style={{ flex: 1 }}><Button variant="danger" label="Discard" onPress={() => { p.photos.forEach(discardCopies); set(removePost(usePhotoOutbox.getState().items, p.id)); }} /></View>
            </View>
          ) : null}
        </Card>
      ))}
    </View>
  );
}
