import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { Navigation, Map, House } from 'lucide-react-native';
import { goHome } from '@/features/home/goHome';
import { usePlaces } from '@/store/places';
import { mapsDirectionsUrl } from '@/lib/navigate';
import { useGuideTarget } from '@/store/guideTarget';
import { useNavigateChoice } from '@/store/navigateChoice';
import { useRecorder } from '@/store/recorder';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

/** The sheet over every screen that asks how to get to a place: guided in the app, or handed to Google Maps. */
export function NavigateChoiceHost() {
  const router = useRouter();
  const to = useNavigateChoice((s) => s.to);
  const close = useNavigateChoice((s) => s.close);
  const home = usePlaces((s) => s.home);
  return (
    <Sheet open={!!to} title="Get to the start" onClose={close}>
      <Text variant="label" tone="muted">Turn-by-turn directions to where the trail begins, on the ride screen with your map.</Text>
      <Button icon={Navigation} label="Navigate with Myto" onPress={() => { if (to) { useGuideTarget.getState().set(to); if (useRecorder.getState().status === 'running') router.push('/ride/live'); else router.push({ pathname: '/ride', params: { autostart: '1' } }); } close(); }} />
      <Button variant="soft" icon={Navigation} label="Full-screen directions (old view)" onPress={() => { if (to) router.push({ pathname: '/navigate', params: { lat: String(to.lat), lng: String(to.lng) } }); close(); }} />
      {home ? <Button variant="soft" icon={House} label="Home" onPress={() => { goHome(router, home); close(); }} /> : null}
      <Button variant="soft" icon={Map} label="Open in Google Maps" onPress={() => { if (to) void Linking.openURL(mapsDirectionsUrl(to)).catch(() => undefined); close(); }} />
    </Sheet>
  );
}
