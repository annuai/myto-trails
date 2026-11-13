import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Bug, Contrast, Gauge, Map as MapIcon, MapPinned, MessagesSquare, Sparkles, Vibrate } from 'lucide-react-native';
import { DISCORD_URL } from '@moto-trails/domain';
import { useAppearance } from '@/store/appearance';
import { useOsm } from '@/store/osm';
import { BackHeader, PageTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';

/** The small settings that do not belong with anything else: how the app feels and looks, crash reports, and where to chat with other riders. */
export default function Others() {
  const router = useRouter();
  const inverted = useAppearance((s) => s.inverted);
  const haptics = useAppearance((s) => s.haptics);
  const speedTicks = useAppearance((s) => s.speedTicks);
  const crashReports = useAppearance((s) => s.crashReports);
  const osmOn = useOsm((s) => s.asked && s.enabled);
  const set = useAppearance.getState();
  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle>Others</PageTitle>
      <ListCard>
        <Row icon={Vibrate} label="Haptics" sub="Taps and vibration for checks, finished tasks and marks" value={haptics ? 'On' : 'Off'} onPress={() => set.setHaptics(!haptics)} />
        {haptics ? <Row icon={Gauge} label="Speed ticks" sub="A soft tick each time your speed passes a multiple of 10, and as numbers roll" value={speedTicks ? 'On' : 'Off'} onPress={() => set.setSpeedTicks(!speedTicks)} /> : null}
        <Row icon={Contrast} label="Inverted colours" sub="Light riding screen, dark everywhere else" value={inverted ? 'On' : 'Off'} onPress={() => set.setInverted(!inverted)} />
        <Row icon={Sparkles} label="Motion preview" sub="Replay the new animations and feel each haptic" onPress={() => router.push('/dev/motion')} />
        <Row icon={MapPinned} label="Offline maps" sub="Keep a region's map and place search on your phone" onPress={() => router.push('/offline-maps')} />
        <Row icon={MapIcon} label="Improve the map" sub="Share rides with OpenStreetMap" value={osmOn ? 'On' : 'Off'} onPress={() => router.push('/osm')} />
        <Row icon={Bug} label="Crash reports" sub="Sends the error when the app crashes. No rides, routes or contacts; it can show roughly which city you are in" value={crashReports ? 'On' : 'Off'} onPress={() => set.setCrashReports(!crashReports)} />
        <Row icon={MessagesSquare} label="Join our Discord" sub="Suggest improvements and chat with other riders" onPress={() => void Linking.openURL(DISCORD_URL)} />
      </ListCard>
    </Screen>
  );
}
