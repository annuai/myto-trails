import { Image, View } from 'react-native';
import { Dog } from 'lucide-react-native';
import type { PillionPose } from '@/lib/story/moment';
import { POSES } from '../../assets/pillion/poses';
import { Icon } from './Icon';
import { pillion } from './Pillion.tokens';

/** Pillion the dog, the face of a Moment or an empty state. Never on ride, navigation, tracking or error screens. Shows a quiet glyph until the pose's artwork exists. */
export function Pillion({ pose, size = 'md' }: { pose: PillionPose; size?: 'sm' | 'md' | 'lg' }) {
  const { source, label } = POSES[pose];
  const edge = pillion[size];
  if (!source) return <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: edge, height: edge, alignItems: 'center', justifyContent: 'center' }}><Icon icon={Dog} size={edge / 2} tone="muted" /></View>;
  return <Image source={source} accessibilityLabel={label} accessibilityRole="image" resizeMode="contain" style={{ width: edge, height: edge }} />;
}
