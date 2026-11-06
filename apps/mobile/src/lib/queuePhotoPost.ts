import { makeCopies } from './photoCopies';
import { enqueuePost } from './photoOutbox';
import { uid } from './id';
import { usePhotoOutbox } from '@/store/photoOutbox';

/** Makes the three copies of each picked photo and puts the post in the outbox, which sends it in the background and keeps trying without a signal. */
export async function queuePhotoPost(i: { clubId: string; eventId?: string; body: string; uris: string[] }): Promise<void> {
  const photos = [];
  for (const uri of i.uris) photos.push(await makeCopies(uri));
  const { items, setItems } = usePhotoOutbox.getState();
  setItems(enqueuePost(items, { id: uid(), clubId: i.clubId, eventId: i.eventId, body: i.body, photos }, Date.now()));
}
