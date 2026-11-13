import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { fixed } from '@/theme/tokens';
import { cameraTokens as k } from './CameraCapture.tokens';

/** The rule-of-thirds lines over the viewfinder. Its own component so showing or hiding it is not a change to the camera's props. */
export const GridOverlay = memo(function GridOverlay() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {[1, 2].map((i) => <View key={`v${i}`} style={{ position: 'absolute', left: `${(i * 100) / 3}%`, top: 0, bottom: 0, width: k.gridLine, backgroundColor: fixed.white, opacity: k.gridOpacity }} />)}
      {[1, 2].map((i) => <View key={`h${i}`} style={{ position: 'absolute', top: `${(i * 100) / 3}%`, left: 0, right: 0, height: k.gridLine, backgroundColor: fixed.white, opacity: k.gridOpacity }} />)}
    </View>
  );
});
