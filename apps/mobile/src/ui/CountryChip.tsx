import { Check, Globe } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useCountries, useBrowsingCountry } from '@/api/useApi';
import { chipLabel, pickerOrder } from '@/lib/browsing';
import { useRegion } from '@/store/region';
import { ChoiceChip } from './Chip';
import { Icon } from './Icon';
import { ListCard, Row } from './ListCard';
import { Sheet } from './Sheet';

/** "Showing: India · change". Tap it to pick which country's trails and clubs to show (see `CountrySheet`). */
export function CountryChip({ onPress }: { onPress: () => void }) {
  const browsing = useBrowsingCountry();
  const countries = useCountries().data;
  return <ChoiceChip raised icon={Globe} label={`${chipLabel(browsing, countries)} · change`} onPress={onPress} />;
}

/** The country picker. Open countries filter the lists; a "coming soon" country opens its own page where the rider can ask to be told. Render it as a Screen `overlay`. */
export function CountrySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const browsing = useBrowsingCountry();
  const countries = useCountries().data;
  const choose = (iso2: string | null) => { useRegion.getState().setBrowsing(iso2); onClose(); };
  const soon = (iso2: string, name: string) => { onClose(); router.push({ pathname: '/coming-soon', params: { iso2, name } }); };
  return (
    <Sheet open={open} title="Country" onClose={onClose}>
      <ListCard>
        <Row icon={Globe} label="All open countries" sub="Trails and clubs from every country we are open in" chevron={false} onPress={() => choose(null)} right={browsing === null ? <Icon icon={Check} tone="accent" /> : undefined} />
        {pickerOrder(countries).map((c) => c.enabled
          ? <Row key={c.iso2} icon={Globe} label={c.name} sub="Open" chevron={false} onPress={() => choose(c.iso2)} right={browsing === c.iso2 ? <Icon icon={Check} tone="accent" /> : undefined} />
          : <Row key={c.iso2} icon={Globe} label={c.name} sub="Coming soon. Tap to be told when it opens" onPress={() => soon(c.iso2, c.name)} />)}
      </ListCard>
    </Sheet>
  );
}
