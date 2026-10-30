import { useRouter } from 'expo-router';
import { useCountries } from '@/api/useApi';
import { notOpenCountry } from '@/lib/browsing';
import { useHomeCountry } from '@/store/region';
import { size } from '@/theme/tokens';
import { Text } from './Text';
import { ScalePressable } from './motion';

/** Shown only when the rider's home country is not open yet: the lists then hold every open country, and this says why and lets them ask to be told. */
export function NotOpenNotice() {
  const router = useRouter();
  const country = notOpenCountry(useHomeCountry(), useCountries().data);
  if (!country) return null;
  return (
    <ScalePressable accessibilityRole="button" onPress={() => router.push({ pathname: '/coming-soon', params: { iso2: country.iso2, name: country.name } })} style={{ minHeight: size.target, justifyContent: 'center' }}>
      <Text variant="label" tone="muted">{`Not open in ${country.name} yet, so these are from countries that are. Tap to be told when it opens.`}</Text>
    </ScalePressable>
  );
}
