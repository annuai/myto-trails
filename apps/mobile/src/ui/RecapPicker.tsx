import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { recapTokens as T } from '@/lib/recapCard.tokens';
import type { YearRecap } from '@/lib/yearRecap';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';
import { RecapCard, type RecapDesign } from './RecapCard';
import { Text } from './Text';

/**
 * The year's share cards in a row that snaps one card at a time, with the card in the middle the one that is shared. Neighbours peek
 * in from the sides so it is plain there is more to swipe to; tapping one brings it to the middle.
 */
export function RecapPicker({ recap, designs, picked, onPick }: { recap: YearRecap; designs: readonly { id: RecapDesign; name: string }[]; picked: number; onPick: (i: number) => void }) {
  const { c } = useTheme();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [rowWidth, setRowWidth] = useState(0);
  const step = T.previewWidth + T.previewGap;
  const side = Math.max(0, (rowWidth - T.previewWidth) / 2);
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(designs.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / step)));
    if (i !== picked) onPick(i);
  };
  const go = (i: number) => { scroller.current?.scrollTo({ x: i * step, animated: true }); onPick(i); };
  return (
    <View>
      <View style={{ marginHorizontal: -size.screenX }} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={step}
          decelerationRate="fast"
          disableIntervalMomentum
          onMomentumScrollEnd={settle}
          onScrollEndDrag={settle}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: side, gap: T.previewGap }}
        >
          {designs.map((d, i) => (
            <Pressable key={d.id} onPress={() => go(i)} accessibilityRole="button" accessibilityLabel={`${d.name} card`} accessibilityState={{ selected: i === picked }} style={{ borderRadius: radius.thumb, overflow: 'hidden' }}>
              <RecapCard recap={recap} design={d.id} width={T.previewWidth} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={{ alignItems: 'center', gap: space[2], marginTop: space[4] }}>
        <Text variant="label">{designs[picked]?.name}</Text>
        <View style={{ flexDirection: 'row', gap: space[2] }} accessibilityRole="adjustable" accessibilityLabel={`Card ${picked + 1} of ${designs.length}`}>
          {designs.map((d, i) => (
            <Pressable key={d.id} onPress={() => go(i)} hitSlop={space[2]} accessibilityLabel={d.name}>
              <View style={{ width: i === picked ? space[6] : space[2], height: space[2], borderRadius: radius.chip, backgroundColor: i === picked ? c.ink : c.line }} />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
