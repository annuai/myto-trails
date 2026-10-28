import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { uid } from './id';
import { saveVoice, savePhoto } from './journalMedia';
import { useVoiceRecorder } from './useVoiceRecorder';
import { useJournal } from '@/store/journal';
import { useMotion } from '@/store/motion';
import { useRecorder } from '@/store/recorder';

/**
 * Add a note, a voice note or a photo to one ride's journal. Voice and photos are always available. Typing is allowed
 * while no ride is recording, or while the vehicle is reliably stopped (lib/motion); when unsure it stays locked.
 */
export function useJournalActions(rideKey: number) {
  const voice = useVoiceRecorder();
  const add = useJournal((s) => s.add);
  const riding = useRecorder((s) => s.status === 'running');
  const stopped = useMotion((s) => s.stopped);
  const [problem, setProblem] = useState<string>();
  const canType = !riding || stopped;

  const addNote = (text: string) => {
    const t = text.trim();
    if (t) add({ id: uid(), rideKey, at: Date.now(), kind: 'note', text: t });
  };
  const toggleVoice = async () => {
    setProblem(undefined);
    if (!voice.recording) return voice.start();
    const r = await voice.stop();
    if (!r) return;
    try {
      const id = uid();
      await saveVoice(r.uri, id);
      add({ id, rideKey, at: Date.now(), kind: 'voice', durationSec: r.durationSec });
    } catch {
      setProblem('Could not save the voice note.');
    }
  };
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
  return { canType, addNote, toggleVoice, addPhoto, recording: voice.recording, seconds: voice.seconds, problem: problem ?? voice.error };
}
