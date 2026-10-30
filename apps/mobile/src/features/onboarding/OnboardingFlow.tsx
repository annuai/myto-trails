import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Animated, View, type ImageSourcePropType } from 'react-native';
import { Globe, MapPin } from 'lucide-react-native';
import { requestRideLocationAccess } from '@/lib/backgroundLocation';
import { countryName } from '@/lib/countryNames';
import { useHomeCountry, useDistanceUnit, useRegion } from '@/store/region';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, size } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { ListCard, Row } from '@/ui/ListCard';
import { useReducedMotion } from '@/ui/motion';
import { Logo } from '@/ui/Logo';
import { logo } from '@/ui/Logo.tokens';
import { PageDots } from '@/ui/PageDots';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';
import { useAnimatedValue } from '@/ui/useAnimatedValue';
import { pager } from './OnboardingFlow.tokens';
import { driftStops, fadeInStops, fadeOutStops, fadeStops, frameHeights, type Stops } from './pagerMotion';
import { SETUP_ART, SLIDES } from './slides';

type Access = 'unknown' | 'always' | 'foreground' | 'denied';
const ACCESS_WORD: Record<Access, string> = { unknown: 'Allow', always: 'Always on', foreground: 'While using', denied: 'Off' };

/** The measured heights with page `i`'s replaced; the same array when it did not change, so a repeated measurement does not draw again. */
const withHeight = (all: number[], i: number, h: number): number[] => {
  const next = Array.from({ length: SLIDES.length }, (_, k) => all[k] ?? 0);
  if (next[i] === h) return all;
  next[i] = h;
  return next;
};

/**
 * The first thing a new rider sees: four pages on what the app is for, then a short setup (home country, units, location). Every
 * page can be skipped; nothing here is required, and everything can be changed later under You. `onDone` ends the flow.
 */
export function OnboardingFlow({ onDone, onPickCountry }: { onDone: () => void; onPickCountry: () => void }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const scroller = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  const scrollX = useAnimatedValue(0);
  /** Size of the area under the header; the pager's width is also the width of a page. */
  const [box, setBox] = useState({ w: 0, h: 0 });
  /** Height of each page's words, and of the setup page's words and controls, measured so the picture frames can take the rest. */
  const [wordsH, setWordsH] = useState<number[]>([]);
  const [setupH, setSetupH] = useState(0);
  const [index, setIndex] = useState(0);
  const [access, setAccess] = useState<Access>('unknown');
  const home = useHomeCountry();
  const unit = useDistanceUnit();
  const pages = SLIDES.length + 1;
  const last = index === pages - 1;
  const width = box.w;
  const ready = width > 0 && box.h > 0 && wordsH.length === SLIDES.length && wordsH.every((h) => h > 0) && setupH > 0;
  const { tall, short } = frameHeights({ container: box.h, wordsBelow: Math.max(0, ...wordsH), setupBelow: setupH, gap: space[6] });
  const drift = reduced ? 0 : pager.drift;

  const go = (to: number) => { setIndex(to); scroller.current?.scrollTo({ x: to * width, animated: true }); };
  // The scroll position drives every fade and drift on the native side; the page number follows it, so the dots and the Skip button change halfway.
  const onScroll = useMemo(() => Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: true,
    listener: (e: { nativeEvent: { contentOffset: { x: number } } }) => { if (width > 0) setIndex(Math.round(e.nativeEvent.contentOffset.x / width)); },
  }), [scrollX, width]);
  // Built once per width, not on every draw: the page number changes halfway through a swipe, and the animation graph should not be rebuilt then.
  const motion = useMemo(() => {
    if (width <= 0) return null;
    const through = (s: Stops) => scrollX.interpolate({ ...s, extrapolate: 'clamp' });
    return {
      pages: Array.from({ length: pages }, (_, i) => ({
        picture: through(fadeStops(i, width, pager.pictureFade)),
        words: through(fadeStops(i, width, pager.textFade)),
        shift: drift > 0 ? through(driftStops(i, width, drift)) : 0,
      })),
      tallFrame: through(fadeOutStops(SLIDES.length - 1, width, pager.pictureFade)),
      shortFrame: through(fadeInStops(SLIDES.length, width, pager.pictureFade)),
    };
  }, [scrollX, width, drift, pages]);
  const frame = { position: 'absolute', top: 0, left: 0, width, overflow: 'hidden', borderRadius: radius.card, backgroundColor: c.card } as const;
  /** A picture a little wider than its frame, so the drift never shows an edge. */
  const picture = (source: ImageSourcePropType, page: number, key: string, height: number) => (
    <Animated.Image key={key} source={source} resizeMode="cover" accessibilityIgnoresInvertColors
      style={{ position: 'absolute', top: 0, left: -width * drift, width: width * (1 + 2 * drift), height, opacity: motion?.pages[page]?.picture ?? 1, transform: [{ translateX: motion?.pages[page]?.shift ?? 0 }] }} />
  );
  const allow = async () => setAccess(await requestRideLocationAccess());

  return (
    <View style={{ flex: 1, gap: space[4] }}>
      {/* The Skip button sets the height; the last page has none, and the header must not shrink there. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: size.target }}>
        <Logo height={logo.onboarding} />
        {last ? null : <TextButton label="Skip" onPress={onDone} />}
      </View>

      <View style={{ flex: 1 }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {ready ? (
          // Behind the pages: the pictures stay where they are and dissolve into one another as the rider swipes.
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <Animated.View style={[frame, { height: tall, opacity: motion?.tallFrame ?? 1 }]}>
              {SLIDES.map((s, i) => picture(s.art, i, s.key, tall))}
            </Animated.View>
            <Animated.View style={[frame, { height: short, opacity: motion?.shortFrame ?? 0 }]}>
              {picture(SETUP_ART, SLIDES.length, 'setup', short)}
            </Animated.View>
          </View>
        ) : null}
        {width > 0 ? (
          // In front: only the words and controls slide with the finger; each page's words fade as they leave and arrive, so a half-cut line is never read.
          <Animated.ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEventThrottle={16} onScroll={onScroll} style={{ flex: 1, opacity: ready ? 1 : 0 }}>
            {SLIDES.map((s, i) => (
              <View key={s.key} style={{ width, flex: 1, gap: space[6] }}>
                <View style={{ height: tall }} />
                <Animated.View
                  onLayout={(e) => setWordsH((all) => withHeight(all, i, e.nativeEvent.layout.height))}
                  style={{ gap: space[3], opacity: motion?.pages[i]?.words ?? 1 }}
                >
                  <Text variant="title">{s.title}</Text>
                  <Text variant="body" tone="muted">{s.body}</Text>
                </Animated.View>
              </View>
            ))}
            <View style={{ width, flex: 1, gap: space[6] }}>
              <View style={{ height: short }} />
              <Animated.View onLayout={(e) => setSetupH(e.nativeEvent.layout.height)} style={{ gap: space[6], opacity: motion?.pages[SLIDES.length]?.words ?? 1 }}>
                <View style={{ gap: space[3] }}>
                  <Text variant="title">Set up in a few taps.</Text>
                  <Text variant="body" tone="muted">You can change all of this later under You.</Text>
                </View>
                <ListCard>
                  <Row icon={Globe} label="Home country" sub="Sets your trails, clubs and currency" value={home ? countryName(home) : 'Not set'} onPress={onPickCountry} />
                  <Row icon={MapPin} label="Location" sub="Needed to record your rides" chevron={false} right={<Text variant="labelMedium" tone={access === 'unknown' || access === 'denied' ? 'accent' : 'muted'}>{access === 'denied' ? 'Try again' : ACCESS_WORD[access]}</Text>} onPress={access === 'unknown' || access === 'denied' ? () => void allow() : undefined} />
                </ListCard>
                <View style={{ flexDirection: 'row', gap: space[2] }}>
                  <ChoiceChip label="Kilometres" selected={unit !== 'mi'} onPress={() => useRegion.getState().setUnit('km')} />
                  <ChoiceChip label="Miles" selected={unit === 'mi'} onPress={() => useRegion.getState().setUnit('mi')} />
                </View>
                {access === 'foreground' ? <Text variant="caption" tone="muted">Choose Always in Settings later so rides keep recording when the screen locks.</Text> : null}
              </Animated.View>
            </View>
          </Animated.ScrollView>
        ) : null}
      </View>

      <View style={{ gap: space[4] }}>
        <PageDots count={pages} index={index} />
        <Button big variant={last ? 'accent' : 'primary'} label={last ? 'Start riding' : 'Continue'} onPress={last ? onDone : () => go(index + 1)} />
      </View>
    </View>
  );
}
