import { Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { shapeToSvg, type Shapes } from './shapes';

/** One moving shape of a skinned picture: rebuilt from the current points on the UI thread every frame. */
export function Shape({ rig, index, color, coords }: { rig: Shapes; index: number; color: string; coords: { readonly value: Float32Array } }) {
  const path = useDerivedValue(() => {
    'worklet';
    return Skia.Path.MakeFromSVGString(shapeToSvg(rig, index, coords.value)) ?? Skia.Path.Make();
  });
  return <Path path={path} color={color} />;
}
