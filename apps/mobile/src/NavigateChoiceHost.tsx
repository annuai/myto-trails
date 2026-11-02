import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { Navigation, Map } from 'lucide-react-native';
import { mapsDirectionsUrl } from '@/lib/navigate';
import { useNavigateChoice } from '@/store/navigateChoice';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

/** The sheet over every screen that asks how to get to a place: guided in the app, or handed to Google Maps. */
export function NavigateChoiceHost() {
  const router = useRouter();
  const to = useNavigateChoice((s) => s.to);
  const close = useNavigateChoice((s) => s.close);
  return (
    <Sheet open={!!to} title="Get to the start" onClose={close}>
      <Text variant="label" tone="muted">Turn-by-turn directions to where the trail begins.</Text>
      <Button icon={Navigation} label="Navigate with Myto" onPress={() => { if (to) router.push({ pathname: '/navigate', params: { lat: String(to.lat), lng: String(to.lng) } }); close(); }} />
      <Button variant="soft" icon={Map} label="Open in Google Maps" onPress={() => { if (to) void Linking.openURL(mapsDirectionsUrl(to)).catch(() => undefined); close(); }} />
    </Sheet>
  );
}
