import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { uid } from './id';
import { canTypeNow } from './typingGate';
import { applyFilm, hasOriginal, mediaUri, originalUri, savePhoto } from './journalMedia';
import type { JournalEntry } from './journalEntries';
import type { FilmLook } from './filmLook';
import { useJournal } from '@/store/journal';
import { useMotion } from '@/store/motion';
import { useRecorder } from '@/store/recorder';
import { useVoice } from '@/store/voice';
import { nowMs } from '@/lib/clock';

/**
 * Add a note, a voice note or a photo to one ride's journal. Voice and photos are always available. Typing is allowed
 * while no ride is recording, or while the vehicle is reliably stopped (lib/motion); when unsure it stays locked.
 */
export function useJournalActions(rideKey: number) {
  const recording = useVoice((v) => v.recording);
  const startedAt = useVoice((v) => v.startedAt);
  const voiceError = useVoice((v) => v.error);
  const [, tick] = useState(0);
  useEffect(() => { if (!recording) return; const id = setInterval(() => tick((n) => n + 1), 500); return () => clearInterval(id); }, [recording]);
  const add = useJournal((s) => s.add);
  const riding = useRecorder((s) => s.status === 'running');
  const unfinished = useRecorder((s) => s.recoverable !== null);
  const stopped = useMotion((s) => s.stopped);
  const [problem, setProblem] = useState<string>();
  /** A photo just taken or picked, waiting in the Film step, or a saved photo being re-filmed. */
  const [film, setFilm] = useState<{ source: string; entry?: JournalEntry } | null>(null);
  const canType = canTypeNow({ riding, unfinished, stopped });

  const addNote = (text: string) => {
    const t = text.trim();
    if (t) add({ id: uid(), rideKey, at: Date.now(), kind: 'note', text: t });
  };
  const toggleVoice = async () => { setProblem(undefined); await useVoice.getState().toggle(rideKey); };
  const addPhoto = async (from: 'camera' | 'library') => {
    setProblem(undefined);
    try {
      if (from === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return setProblem('The camera is turned off for Myto Moto. Allow it in your phone settings.');
      }
      const options = { mediaTypes: ['images' as const], quality: 1, exif: false };
      const r = from === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (r.canceled) return;
      setFilm({ source: r.assets[0].uri });
    } catch {
      setProblem('Could not save the photo.');
    }
  };
  /** Saves what the Film step made: a new photo (with its original kept when a look was applied), or a new look on a saved one. */
  const saveFilm = async (look: FilmLook, rendered: string | null) => {
    if (!film) return;
    // Without a baked picture (a browser cannot make one) the photo is kept plain, so no look is recorded.
    const plain = look.id === 'none' || !rendered;
    if (film.entry) {
      const e = film.entry;
      await applyFilm(e.id, plain ? null : rendered);
      useJournal.getState().patch(e.id, { look: plain ? undefined : look });
    } else {
      const p = await savePhoto(film.source, plain ? undefined : rendered);
      add({ id: p.id, rideKey, at: Date.now(), kind: 'photo', width: p.width, height: p.height, ...(plain ? {} : { look }) });
    }
    setFilm(null);
  };
  /** Opens the Film step on a saved photo, from its original when there is one. Not offered when the original is gone (a restored backup). */
  const editFilm = (e: JournalEntry) => setFilm({ source: hasOriginal(e.id) ? originalUri(e.id) : mediaUri(e.id, 'photo'), entry: e });
  return { film, saveFilm, editFilm, closeFilm: () => setFilm(null), canType, addNote, toggleVoice, addPhoto, recording, seconds: recording ? Math.round((nowMs() - startedAt) / 1000) : 0, problem: problem ?? voiceError };
}
