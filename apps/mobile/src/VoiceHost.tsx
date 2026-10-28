import { useEffect } from 'react';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { UserFacingError } from '@/store/voiceCore';
import { useVoice } from '@/store/voice';

/** Owns the phone's audio recorder for the whole app, so a voice note survives leaving the screen that started it. Mounted once at the root. */
export function VoiceHost() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  useEffect(() => {
    useVoice.getState().attach({
      start: async () => {
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) throw new UserFacingError('The microphone is turned off for Myto. Allow it in your phone settings.');
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
      },
      stop: async () => {
        try {
          await recorder.stop();
          return recorder.uri ?? undefined;
        } finally {
          await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
        }
      },
    });
    return () => useVoice.getState().attach(undefined);
  }, [recorder]);
  return null;
}
