import { useEffect } from 'react';
import { Animated, Image, Pressable, View } from 'react-native';
import { POSES } from '../../assets/pillion/poses';
import { ART } from '../../assets/pillion/art';
import type { Visit } from '@/lib/story/visits';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, motion, radius, scrim, shadow, space } from '@/theme/tokens';
import { Button } from './Button';
import { ARRIVE, EXIT } from './motion';
import { WaveDog } from './mascot/WaveDog';
import { Text } from './Text';
import { TextButton } from './TextButton';
import { useAnimatedValue } from './useAnimatedValue';
import { pillionDialog as t } from './PillionDialog.tokens';

/** The picture for a visit: the waving dog drawn live for a greeting, the still artwork for the rest. */
function Art({ visit }: { visit: Visit }) {
  const pose = POSES[visit.pose];
  if (visit.id === 'hello') return <WaveDog width={t.waveWidth} />;
  const source = ART[visit.pose];
  const resolved = Image.resolveAssetSource(source);
  const ratio = (resolved?.width ?? 1) / (resolved?.height ?? 1);
  const scene = !!pose.scene;
  // A scene (the campfire) has its own sky and fills the card's width; a cut-out is drawn at the picture's height.
  return <Image source={source} accessibilityLabel={pose.label} accessibilityRole="image" resizeMode={scene ? 'cover' : 'contain'} style={scene ? { width: '100%', height: t.artHeight } : { width: ratio * t.artHeight, height: t.artHeight, maxWidth: pose.bleed ? undefined : t.maxShare }} />;
}

/**
 * Pillion's visit, as a dialog over whatever is open: a picture, a title, a line under it and one button, with Close and a tap outside.
 * A picture that is cut off at its edge (the bike's front wheel is out of frame) sits flush against the card's edge, so the cut reads as the
 * card's own edge. Drawn in the screen's own tree rather than a native Modal, like the sheets.
 */
export function PillionDialog({ visit, onClose, onAction }: { visit: Visit; onClose: () => void; onAction: () => void }) {
  const { c } = useTheme();
  const enter = useAnimatedValue(0);
  const pose = POSES[visit.pose];
  const bleed = pose.bleed === 'right';
  const scene = !!pose.scene;
  useEffect(() => { Animated.timing(enter, { toValue: 1, duration: motion.duration.scene, easing: ARRIVE, useNativeDriver: true }).start(); }, [enter]);
  const close = (then?: () => void) => Animated.timing(enter, { toValue: 0, duration: motion.duration.base, easing: EXIT, useNativeDriver: true }).start(() => { onClose(); then?.(); });
  return (
    <View accessibilityViewIsModal style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', padding: space[4] }}>
      <Animated.View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: scrim.sheet, opacity: enter }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => close()} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View style={{ width: '100%', maxWidth: layout.barMax, backgroundColor: c.card, borderRadius: radius.card, overflow: 'hidden', ...shadow.bar, opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [t.rise, 0] }) }] }}>
        <View style={{ paddingTop: scene ? 0 : space[5], paddingLeft: bleed ? space[5] : 0, alignItems: bleed ? 'flex-end' : 'center' }}>
          <Art visit={visit} />
        </View>
        <View style={{ padding: space[5], gap: space[2], alignItems: bleed ? 'flex-start' : 'center' }}>
          <Text variant="section" style={{ textAlign: bleed ? 'left' : 'center' }}>{visit.title}</Text>
          <Text tone="muted" style={{ textAlign: bleed ? 'left' : 'center' }}>{visit.body}</Text>
          <View style={{ alignSelf: 'stretch', marginTop: space[3], gap: space[1] }}>
            <Button label={visit.button} onPress={() => close(visit.route ? onAction : undefined)} />
            {visit.route ? <TextButton label="Not now" onPress={() => close()} /> : null}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
