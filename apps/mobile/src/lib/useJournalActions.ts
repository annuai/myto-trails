import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { uid } from './id';
import { canTypeNow } from './typingGate';
import { savePhoto } from './journalMedia';
import { useJournal } from '@/store/journal';
import { useMotion } from '@/store/motion';
import { useRecorder } from '@/store/recorder';
import { useVoice } from '@/store/voice';

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
        if (!perm.granted) return setProblem('The camera is turned off for Myto. Allow it in your phone settings.');
      }
      const r = from === 'camera' ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (r.canceled) return;
      const p = await savePhoto(r.assets[0].uri);
      add({ id: p.id, rideKey, at: Date.now(), kind: 'photo', width: p.width, height: p.height });
    } catch {
      setProblem('Could not save the photo.');
    }
  };
  return { canType, addNote, toggleVoice, addPhoto, recording, seconds: recording ? Math.round((Date.now() - startedAt) / 1000) : 0, problem: problem ?? voiceError };
}
