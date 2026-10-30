import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, View } from 'react-native';
import { Globe, MapPin } from 'lucide-react-native';
import { requestRideLocationAccess } from '@/lib/backgroundLocation';
import { countryName } from '@/lib/countryNames';
import { useHomeCountry, useDistanceUnit, useRegion } from '@/store/region';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { Illustration } from '@/ui/Illustration';
import { ListCard, Row } from '@/ui/ListCard';
import { Logo } from '@/ui/Logo';
import { PageDots } from '@/ui/PageDots';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';
import { SETUP_ART, SLIDES } from './slides';

type Access = 'unknown' | 'always' | 'foreground' | 'denied';
const ACCESS_WORD: Record<Access, string> = { unknown: 'Allow', always: 'Always on', foreground: 'While using', denied: 'Off' };

/**
 * The first thing a new rider sees: four pages on what the app is for, then a short setup (home country, units, location). Every
 * page can be skipped; nothing here is required, and everything can be changed later under You. `onDone` ends the flow.
 */
export function OnboardingFlow({ onDone, onPickCountry }: { onDone: () => void; onPickCountry: () => void }) {
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [access, setAccess] = useState<Access>('unknown');
  const home = useHomeCountry();
  const unit = useDistanceUnit();
  const pages = SLIDES.length + 1;
  const last = index === pages - 1;

  const go = (to: number) => { setIndex(to); pager.current?.scrollTo({ x: to * width, animated: true }); };
  const allow = async () => setAccess(await requestRideLocationAccess());

  return (
    <View style={{ flex: 1, gap: space[4] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo />
        {last ? null : <TextButton label="Skip" onPress={onDone} />}
      </View>

      <View style={{ flex: 1, overflow: 'hidden' }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))} style={{ flex: 1 }}>
            {SLIDES.map((s) => (
              <View key={s.key} style={{ width, flex: 1, gap: space[6] }}>
                <Illustration source={s.art} />
                <View style={{ gap: space[3] }}>
                  <Text variant="title">{s.title}</Text>
                  <Text variant="body" tone="muted">{s.body}</Text>
                </View>
              </View>
            ))}
            <View style={{ width, flex: 1, gap: space[6] }}>
              <Illustration source={SETUP_ART} />
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
            </View>
          </ScrollView>
        ) : null}
      </View>

      <View style={{ gap: space[4] }}>
        <PageDots count={pages} index={index} />
        <Button big variant={last ? 'accent' : 'primary'} label={last ? 'Start riding' : 'Continue'} onPress={last ? onDone : () => go(index + 1)} />
      </View>
    </View>
  );
}
