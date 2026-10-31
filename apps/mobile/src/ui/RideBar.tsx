import { useEffect, useState } from 'react';
import { useDistanceUnit } from '@/store/region';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Theme } from '@/theme/ThemeProvider';
import { dark, fixed, space, layout, radius, shadow, size } from '@/theme/tokens';
import { useChrome } from '@/store/chrome';
import { useRecorder } from '@/store/recorder';
import { clock } from '@/lib/format';
import { asText, distanceKm } from '@/lib/units';
import { Text } from './Text';
import { useLayout } from './useLayout';
import { rideBar } from './RideBar.tokens';
import { nowMs } from '@/lib/clock';

/** Shown above the tab bar while a ride is recording; opens the live screen. */
export function RideBar() {
  useDistanceUnit(); // re-draws the distance when the unit changes
  const running = useRecorder((s) => s.status === 'running');
  const sheetOpen = useChrome((s) => s.sheets > 0);
  const paused = useRecorder((s) => s.paused);
  const elapsedMs = useRecorder((s) => s.elapsedMs);
  const meters = useRecorder((s) => s.meters);
  const router = useRouter();
  const { landscape } = useLayout();
  const [, tick] = useState(0);
  useEffect(() => { if (!running) return; const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, [running]);
  if (!running || sheetOpen) return null;
  return (
    <Theme mode="dark">
      <Pressable accessibilityRole="button" accessibilityLabel="Open the live ride" onPress={() => router.push('/ride/live')}
        style={{ position: 'absolute', alignSelf: 'center', width: '92%', maxWidth: layout.barMax, bottom: landscape ? rideBar.bottomLandscape : rideBar.bottom, height: size.button, borderRadius: radius.thumb, backgroundColor: fixed.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[5], ...shadow.ride }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <View style={{ width: size.dot, height: size.dot, borderRadius: radius.chip, backgroundColor: paused ? dark.muted : dark.stop }} />
          <Text variant="data">{paused ? 'Paused' : 'Riding'} {clock(elapsedMs(nowMs()))} · {asText(distanceKm(meters / 1000))}</Text>
        </View>
        <Text variant="labelMedium" tone="accent">Open</Text>
      </Pressable>
    </Theme>
  );
}
