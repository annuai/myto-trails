import { useMemo, useState } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import { Redirect } from 'expo-router';
import { PhotoComposer } from '@/features/share/PhotoComposer';
import { defaultPlacement, overlayBox, type OverlayInk, type PhotoLayout, type Placement } from '@/lib/photoCard';
import { buildRideCard } from '@/lib/rideCard';
import { space } from '@/theme/tokens';
import { ChoiceChip } from '@/ui/Chip';
import { BackHeader, PageTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { sample } from './photo-card.tokens';

// Native turns the asset module into a uri; on the web the module already is the uri (or has one).
const asset: unknown = require('../../assets/rider-on-ridge.jpg');
const uri = typeof asset === 'string' ? asset : (Image.resolveAssetSource?.(asset as number)?.uri ?? (asset as { uri?: string }).uri ?? '');
const photo = { uri, width: sample.photoWidth, height: sample.photoHeight };

/** A gently curving route of 40 points. */
const route = Array.from({ length: 40 }, (_, i) => ({ lat: 12.97 + i * 0.002, lng: 77.59 + 0.02 * Math.sin(i / 6) + i * 0.001 }));

/** Try the photo composer with a bundled photo and a sample ride: drag the overlay, switch layout and ink. Dev builds only. */
export default function PhotoCardDev() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Preview />;
}

function Preview() {
  const { width: screen } = useWindowDimensions();
  const model = useMemo(() => buildRideCard({ name: 'Sample ride', startedAt: Date.now(), distanceKm: 84.2, durationSec: 5400, maxKmh: 71, waypoints: 0, points: route }, { format: 'story' }), []);
  const [layout, setLayout] = useState<PhotoLayout>('bar');
  const [ink, setInk] = useState<OverlayInk>('light');
  const [placement, setPlacement] = useState<Placement>(() => defaultPlacement('bar', model, overlayBox('bar', model)));
  const width = Math.min(screen - 2 * space[5], sample.maxWidth);
  const pick = (l: PhotoLayout) => { setLayout(l); setPlacement(defaultPlacement(l, model, overlayBox(l, model))); };
  return (
    <Screen>
      <BackHeader />
      <PageTitle sub="Drag the overlay; pinch to resize on a phone">Photo card</PageTitle>
      <View style={{ flexDirection: 'row', gap: space[2], marginBottom: space[3] }}>
        <ChoiceChip label="Bar" selected={layout === 'bar'} onPress={() => pick('bar')} />
        <ChoiceChip label="Corner" selected={layout === 'corner'} onPress={() => pick('corner')} />
        <ChoiceChip label="Light ink" selected={ink === 'light'} onPress={() => setInk('light')} />
        <ChoiceChip label="Dark ink" selected={ink === 'dark'} onPress={() => setInk('dark')} />
      </View>
      <PhotoComposer model={model} photo={photo} layout={layout} ink={ink} placement={placement} onPlacement={setPlacement} width={width} />
      <Text variant="caption" tone="muted">{`x ${placement.x.toFixed(3)}  y ${placement.y.toFixed(3)}  scale ${placement.scale.toFixed(2)}`}</Text>
    </Screen>
  );
}
