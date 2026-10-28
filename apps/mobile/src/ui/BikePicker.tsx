import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { BIKE_CATEGORIES } from '@moto-trails/domain';
import { useBikeMakes, useBikeModels } from '@/api/useApi';
import type { BikeModel } from '@/api/types';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { BikeImage } from './BikeImage';
import { bikeImage } from './BikeImage.tokens';
import { Button } from './Button';
import { ChoiceChip } from './Chip';
import { Field } from './Field';
import { ScalePressable } from './motion';
import { Text } from './Text';

const COLUMNS = 2;
const CARD_WIDTH = 400;
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const rowsOf = <T,>(items: T[]) => Array.from({ length: Math.ceil(items.length / COLUMNS) }, (_, i) => items.slice(i * COLUMNS, (i + 1) * COLUMNS));

function Card({ model, onPick }: { model: BikeModel; onPick: (m: BikeModel) => void }) {
  const { c } = useTheme();
  const name = `${model.make} ${model.model}`;
  return (
    <ScalePressable scaleTo={0.97} accessibilityRole="button" accessibilityLabel={name} onPress={() => onPick(model)} style={{ flex: 1, backgroundColor: c.card, borderRadius: radius.control, padding: space[2], gap: space[2] }}>
      <BikeImage preset={model.image} want={CARD_WIDTH} label={name} />
      <View style={{ paddingHorizontal: space[1], paddingBottom: space[1] }}>
        <Text variant="label" tone="muted">{model.make}</Text>
        <Text variant="labelMedium" numberOfLines={2}>{model.model}</Text>
      </View>
    </ScalePressable>
  );
}

function Page({ q, make, category, page, last, onPick, onMore }: { q: string; make: string | null; category: string | null; page: number; last: boolean; onPick: (m: BikeModel) => void; onMore: () => void }) {
  const r = useBikeModels({ q, make, category, page });
  if (!r.data) return r.error ? <Text variant="label" tone="stop">{r.error}</Text> : <Text variant="label" tone="muted">Loading…</Text>;
  const { items, total, pageSize } = r.data;
  if (page === 1 && !items.length) return <Text variant="label" tone="muted">No bikes match. Try another name, make or type; you can still type your bike’s name yourself.</Text>;
  return (
    <>
      {rowsOf(items).map((row) => (
        <View key={row[0]!.id} style={{ flexDirection: 'row', gap: space[3] }}>
          {row.map((m) => <Card key={m.id} model={m} onPick={onPick} />)}
          {row.length < COLUMNS ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
      {last && page * pageSize < total ? <Button variant="soft" label="Show more" onPress={onMore} /> : null}
    </>
  );
}

/** Search box, make chips, type chips and a grid of bike cards. Only models that have a picture are listed. */
export function BikePicker({ onPick }: { onPick: (model: BikeModel) => void }) {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [make, setMake] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [pages, setPages] = useState(1);
  const makes = useBikeMakes();
  useEffect(() => {
    const t = setTimeout(() => { setQ(text); setPages(1); }, bikeImage.searchDelay);
    return () => clearTimeout(t);
  }, [text]);
  const chips = { gap: space[2] } as const;
  return (
    <View style={{ gap: space[3] }}>
      <Field label="Search bikes" value={text} onChangeText={setText} placeholder="Classic 350, Duke, Activa…" autoCorrect={false} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={chips}>
        <ChoiceChip label="All makes" selected={!make} onPress={() => { setMake(null); setPages(1); }} />
        {(makes.data ?? []).map((m) => <ChoiceChip key={m.slug} label={m.name} selected={make === m.slug} onPress={() => { setMake(m.slug); setPages(1); }} />)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={chips}>
        <ChoiceChip label="Any type" selected={!category} onPress={() => { setCategory(null); setPages(1); }} />
        {BIKE_CATEGORIES.map((k) => <ChoiceChip key={k} label={title(k)} selected={category === k} onPress={() => { setCategory(k); setPages(1); }} />)}
      </ScrollView>
      {Array.from({ length: pages }, (_, i) => (
        <Page key={`${q}|${make}|${category}|${i}`} q={q} make={make} category={category} page={i + 1} last={i + 1 === pages} onPick={onPick} onMore={() => setPages(pages + 1)} />
      ))}
    </View>
  );
}
