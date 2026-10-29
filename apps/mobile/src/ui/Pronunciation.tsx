import { Volume2 } from 'lucide-react-native';
import { useAudioPlayer } from 'expo-audio';
import { IconButton } from './IconButton';
import { Text } from './Text';
import { View } from 'react-native';

// The recording of the name: replace assets/pronounce-myto.m4a to change it.
const SOUND = require('../../assets/pronounce-myto.m4a') as number;

/** How to say the name, with a speaker that plays it. */
export function Pronunciation() {
  const player = useAudioPlayer(SOUND);
  const play = () => { void player.seekTo(0); player.play(); };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <Text variant="caption" tone="muted">Pronounced as my-toh</Text>
      <IconButton plain size={32} icon={Volume2} label="Play how Myto is pronounced" onPress={play} tone="muted" />
    </View>
  );
}
