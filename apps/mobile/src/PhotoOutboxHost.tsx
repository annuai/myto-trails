import { useEffect } from 'react';
import { AppState } from 'react-native';
import { ApiFailure } from '@/api/client';
import { forgetProfile } from '@/api/useApi';
import { postPhotos, requestUploads, sendCopy } from '@/api/photos';
import { discardCopies } from '@/lib/photoCopies';
import { duePost, giveUp, patchPost, removePost, retryLater, type OutboxPost } from '@/lib/photoOutbox';
import { PHOTO_KINDS } from '@/lib/photoSizes';
import { useAuth } from '@/store/auth';
import { usePhotoOutbox } from '@/store/photoOutbox';

/** The site said no for good (a bad request, not a bad signal): trying again would only repeat the answer. */
const permanent = (e: unknown) => e instanceof ApiFailure && e.status >= 400 && e.status < 500 && ![401, 403, 408, 429].includes(e.status);

let running = false;
const set = (f: (q: ReturnType<typeof usePhotoOutbox.getState>['items']) => ReturnType<typeof usePhotoOutbox.getState>['items']) => usePhotoOutbox.getState().setItems(f(usePhotoOutbox.getState().items));

/** Sends one post: an address for every copy, the copies, then the post itself. Everything is sent again on a retry, which costs signal and nothing else. */
async function send(token: string, item: OutboxPost) {
  const intents = await requestUploads(token, item.clubId, item.photos.map((p) => ({ thumb: p.copies.thumb.bytes, view: p.copies.view.bytes, full: p.copies.full.bytes })));
  for (const [n, p] of item.photos.entries()) for (const kind of PHOTO_KINDS) await sendCopy(intents[n]!.uploads[kind], p.copies[kind].uri);
  // Marked before the last step: if the answer is lost on the way back, the next try finds the copies gone, which means the post went through.
  set((q) => patchPost(q, item.id, { posting: true }));
  await postPhotos(token, item.clubId, { body: item.body, assetIds: intents.map((i) => i.assetId), eventId: item.eventId });
}

/** Sends the next waiting post if it is due. Safe to call often: only one runs at a time. */
async function flush() {
  if (running) return;
  const token = useAuth.getState().token;
  if (!token) return;
  running = true;
  try {
    for (let item = duePost(usePhotoOutbox.getState().items, Date.now()); item; item = duePost(usePhotoOutbox.getState().items, Date.now())) {
      try {
        await send(token, item);
        item.photos.forEach(discardCopies);
        set((q) => removePost(q, item.id));
        forgetProfile();
      } catch (e) {
        if (e instanceof ApiFailure && e.code === 'bad_photo' && usePhotoOutbox.getState().items.find((i) => i.id === item.id)?.posting) {
          // The copies were already taken in by an earlier try whose answer was lost: the post exists.
          item.photos.forEach(discardCopies);
          set((q) => removePost(q, item.id));
          forgetProfile();
        } else if (permanent(e)) {
          set((q) => giveUp(q, item.id, e instanceof Error ? e.message : 'The post could not be sent.'));
        } else {
          set((q) => retryLater(q, item.id, Date.now()));
          if (e instanceof ApiFailure && e.status === 0) break; // no signal: the rest would fail too
        }
      }
    }
  } finally { running = false; }
}

/** Sends club photo posts that are waiting: on start, when the app comes back, every half minute, and as soon as one is queued or retried. */
export function PhotoOutboxHost() {
  useEffect(() => {
    void flush();
    const timer = setInterval(() => void flush(), 30_000);
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') void flush(); });
    const unsub = usePhotoOutbox.subscribe((s, prev) => { if (s.items.some((i) => i.nextAt <= Date.now() && !prev.items.some((p) => p.id === i.id && p.nextAt === i.nextAt))) void flush(); });
    return () => { clearInterval(timer); app.remove(); unsub(); };
  }, []);
  return null;
}
