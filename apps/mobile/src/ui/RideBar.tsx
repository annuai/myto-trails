import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Theme } from '@/theme/ThemeProvider';
import { useChrome } from '@/store/chrome';
import { useRecorder } from '@/store/recorder';
import { clock } from '@/lib/format';
import { Text } from './Text';
import { useLayout } from './useLayout';

/** Shown above the tab bar while a ride is recording; opens the live screen. */
export function RideBar() {
  const running = useRecorder((s) => s.status === 'running');
  const sheetOpen = useChrome((s) => s.sheets > 0);
  const startedAt = useRecorder((s) => s.startedAt);
  const meters = useRecorder((s) => s.meters);
  const router = useRouter();
  const { landscape } = useLayout();
  const [, tick] = useState(0);
  useEffect(() => { if (!running) return; const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, [running]);
  if (!running || sheetOpen) return null;
  return (
    <Theme mode="dark">
      <Pressable accessibilityRole="button" accessibilityLabel="Open the live ride" onPress={() => router.push('/ride/live')}
        style={{ position: 'absolute', alignSelf: 'center', width: '92%', maxWidth: 520, bottom: landscape ? 92 : 116, height: 56, borderRadius: 18, backgroundColor: '#1a1a1a', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ec8272' }} />
          <Text variant="data">Riding {clock(Date.now() - startedAt)} · {(meters / 1000).toFixed(1)} km</Text>
        </View>
        <Text variant="labelMedium" tone="accent">Open</Text>
      </Pressable>
    </Theme>
  );
}
