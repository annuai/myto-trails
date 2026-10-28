import { useEffect, useRef, useState } from 'react';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';

/** Tap to start, tap to stop. Returns the recorded file's address and length when it stops. */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string>();
  const startedAt = useRef(0);
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds(Math.round((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(id);
  }, [recording]);

  const start = async () => {
    setError(undefined);
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) return setError('The microphone is turned off for Myto. Allow it in your phone settings.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
      setSeconds(0);
      setRecording(true);
    } catch {
      setError('Could not start recording.');
    }
  };
  const stop = async (): Promise<{ uri: string; durationSec: number } | undefined> => {
    if (!recording) return undefined;
    setRecording(false);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      return recorder.uri ? { uri: recorder.uri, durationSec: Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)) } : undefined;
    } catch {
      setError('Could not save the recording.');
      return undefined;
    }
  };
  return { recording, seconds, error, start, stop };
}
