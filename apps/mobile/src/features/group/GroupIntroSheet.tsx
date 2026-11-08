import { useState } from 'react';
import { Image, View } from 'react-native';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { InkFill } from '@/ui/InkFill';
import { GROUP_ART } from '@/features/onboarding/slides';
import { radius, space } from '@/theme/tokens';
import { groupIntro } from './GroupIntroSheet.tokens';

const STEPS = [
  'Start a group and share the six-character code or link.',
  'Friends join with the code. They need the app too.',
  'Everyone shows on one map. Tap "Wait up" or "Fuel stop" instead of typing.',
];

/** How group rides work, in three steps. Shown once, the first time the Ride screen opens, and again from "How group rides work". */
export function GroupIntroSheet({ open, onClose, onStart }: { open: boolean; onClose: () => void; /** Called after the sheet closes, when the rider chose to start one. */ onStart: () => void }) {
  const [width, setWidth] = useState(0);
  return (
    <Sheet open={open} title="Ride together" onClose={onClose}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: width * groupIntro.artRatio, borderRadius: radius.card, overflow: 'hidden' }}>
        {/* The picture is square; its empty sky is trimmed so the sheet is not so tall, and every rider stays in view. */}
        <Image source={GROUP_ART} resizeMode="cover" accessibilityIgnoresInvertColors accessibilityLabel="Four riders stopped at a fork in a hill road, one pointing the way and one checking a phone" style={{ width, height: width, marginTop: -width * groupIntro.artShift }} />
      </View>
      <View style={{ gap: space[3] }}>
        {STEPS.map((s, i) => (
          <View key={s} style={{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start' }}>
            <View style={{ width: groupIntro.badge, height: groupIntro.badge, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <InkFill layer style={{ borderRadius: radius.chip }} />
              <Text variant="label" tone="onInk">{i + 1}</Text>
            </View>
            <Text variant="body" style={{ flex: 1 }}>{s}</Text>
          </View>
        ))}
      </View>
      <Button label="Start a group ride" onPress={() => { onClose(); onStart(); }} />
      <Button variant="soft" label="Maybe later" onPress={onClose} />
    </Sheet>
  );
}
