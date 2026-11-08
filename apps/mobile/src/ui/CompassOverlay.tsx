import { useEffect } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { headingDegrees, headingLetters, headingWord } from '@/lib/compass';
import { inkSolid, space } from '@/theme/tokens';
import { Compass } from './Compass';
import { compass as k } from './Compass.tokens';
import { Text } from './Text';

/**
 * The compass over the whole screen, hiding the map. The dial is as large as the shorter side allows, in portrait with the heading under it and
 * in landscape with the heading beside it. A tap anywhere but on the dial closes it, and so does the back button on Android.
 */
export function CompassOverlay({ open, heading, onClose }: { open: boolean; heading: number | undefined; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!open || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [open, onClose]);
  if (!open) return null;
  const landscape = width > height;
  const usableW = width - insets.left - insets.right, usableH = height - insets.top - insets.bottom;
  const dial = Math.min(k.fullMax, Math.floor(Math.min(landscape ? usableW / 2 : usableW, usableH) * k.fullShare));
  const known = heading !== undefined;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close compass" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: inkSolid }]} />
      <View pointerEvents="box-none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: landscape ? 'row' : 'column', gap: space[8], paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        <Pressable accessible accessibilityRole="image" accessibilityLabel={known ? `Compass. You are heading ${headingWord(heading)}, ${headingDegrees(heading)} degrees.` : 'Compass. No heading yet.'} onPress={() => undefined}>
          <Compass heading={heading} size={dial} rich />
        </Pressable>
        <View pointerEvents="none" style={{ alignItems: 'center', gap: space[2] }}>
          <Text variant="hero" style={{ color: k.white }}>{known ? headingLetters(heading) : '--'}</Text>
          <Text variant="body" style={{ color: k.white }}>{known ? `${headingDegrees(heading)}°` : 'Heading appears once you are moving'}</Text>
        </View>
      </View>
    </View>
  );
}
