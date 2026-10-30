import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useCountries } from '@/api/useApi';
import { CURRENCY_NAMES } from '@/lib/countryData';
import { currencySymbol } from '@/lib/fuelCost';
import { View } from 'react-native';
import { Check, Globe } from 'lucide-react-native';
import { knownCountryCodes } from '@/lib/countryBoundaries';
import { countryName } from '@/lib/countryNames';
import { currencyFor } from '@/lib/locale';
import { homeCountry, useDistanceUnit, useRegion } from '@/store/region';
import { space } from '@/theme/tokens';
import { ChoiceChip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { Icon } from '@/ui/Icon';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

/** Where the rider lives and how distances are shown. Kilometres are the default; miles change every distance, speed and height in the app. Nothing here is sent anywhere. */
export default function RegionSettings() {
  const router = useRouter();
  const countries = useCountries().data;
  const home = useRegion(homeCountry);
  const chosenHome = useRegion((s) => s.home);
  const unitChoice = useRegion((s) => s.unit);
  const unit = useDistanceUnit();
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');
  const options = useMemo(() => knownCountryCodes().map((iso2) => ({ iso2, name: countryName(iso2) })).sort((a, b) => a.name.localeCompare(b.name)), []);
  const shown = q.trim() ? options.filter((o) => o.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 30) : options.slice(0, 30);
  const currency = currencyFor(home);
  const symbol = currencySymbol(currency);
  const currencyLabel = currency ? `${CURRENCY_NAMES[currency] ?? currency}${symbol && symbol !== currency ? ` (${symbol})` : ` (${currency})`}` : 'Not known for this country';
  // A country we are not open in yet: its lists show every open country, so say so and offer the "tell me when" page that used to hang off the picker.
  const soon = home ? countries?.find((c) => c.iso2 === home && !c.enabled) : undefined;

  return (
    <Screen overlay={
      <Sheet open={picking} title="Where do you live?" onClose={() => { setPicking(false); setQ(''); }}>
        <Field label="Search" placeholder="Country" value={q} onChangeText={setQ} />
        <ListCard>
          <Row icon={Globe} label="Follow my phone" sub="Use the region set on this phone" chevron={false} onPress={() => { useRegion.getState().setHome(null); setPicking(false); setQ(''); }} right={chosenHome === null ? <Icon icon={Check} tone="accent" /> : undefined} />
          {shown.map((o) => <Row key={o.iso2} label={o.name} chevron={false} onPress={() => { useRegion.getState().setHome(o.iso2); setPicking(false); setQ(''); }} right={chosenHome === o.iso2 ? <Icon icon={Check} tone="accent" /> : undefined} />)}
        </ListCard>
        {!q.trim() ? <Text variant="caption" tone="muted">Type to find more countries.</Text> : null}
      </Sheet>
    }>
      <BackHeader title="You" />
      <PageTitle sub="Sets your currency and how distances are shown, and which country's trails and clubs you see.">Country and units</PageTitle>
      <ListCard>
        <Row icon={Globe} label="Home country" sub={chosenHome ? undefined : 'Following your phone'} value={home ? countryName(home) : 'Not set'} onPress={() => setPicking(true)} />
        <Row label="Currency" sub="Fuel prices are in this. Set your petrol price in Fuel costs." value={currencyLabel} chevron={false} />
        {soon ? <Row icon={Globe} label={`${countryName(home)} is not open yet`} sub="You see trails and clubs from every open country. Tap to be told when it opens." onPress={() => router.push({ pathname: '/coming-soon', params: { iso2: soon.iso2, name: soon.name } })} /> : null}
      </ListCard>
      <SectionTitle>Distances</SectionTitle>
      <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap' }}>
        <ChoiceChip label="Kilometres" selected={unitChoice !== 'mi'} onPress={() => useRegion.getState().setUnit('km')} />
        <ChoiceChip label="Miles" selected={unitChoice === 'mi'} onPress={() => useRegion.getState().setUnit('mi')} />
      </View>
      <Text variant="caption" tone="muted" style={{ marginTop: space[3] }}>{`Showing ${unit === 'mi' ? 'miles, mph and feet' : 'kilometres, km/h and metres'}.${currency ? ` Fuel prices are in ${CURRENCY_NAMES[currency] ?? currency}.` : ' Fuel prices are shown as plain numbers.'}`}</Text>
    </Screen>
  );
}
