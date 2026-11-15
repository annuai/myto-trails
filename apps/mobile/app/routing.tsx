import { Coins, Mountain, Route, Ship, Volume2, Waves } from 'lucide-react-native';
import { useRoutePrefs } from '@/store/routePrefs';
import { BackHeader, PageTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** How roads are chosen for every route and way back, and whether turns are spoken. */
export default function RoutingSettings() {
  const p = useRoutePrefs();
  const onOff = (on: boolean) => (on ? 'On' : 'Off');
  return (
    <Screen>
      <BackHeader title="Others" />
      <PageTitle>Routes</PageTitle>
      <ListCard>
        <Row icon={Volume2} label="Spoken directions" sub="Reads each turn aloud, through your helmet if it is connected" value={onOff(p.voice)} onPress={() => p.set({ voice: !p.voice })} />
        <Row icon={Route} label="Avoid highways" sub="Motorways and expressways" value={onOff(p.avoidHighways)} onPress={() => p.set({ avoidHighways: !p.avoidHighways })} />
        <Row icon={Coins} label="Avoid tolls" value={onOff(p.avoidTolls)} onPress={() => p.set({ avoidTolls: !p.avoidTolls })} />
        <Row icon={Ship} label="Avoid ferries" value={onOff(p.avoidFerries)} onPress={() => p.set({ avoidFerries: !p.avoidFerries })} />
        <Row icon={Waves} label="Prefer smaller roads" sub="Slower, quieter and often more fun to ride" value={onOff(p.smallerRoads)} onPress={() => p.set({ smallerRoads: !p.smallerRoads })} />
        <Row icon={Mountain} label="Allow unpaved roads" sub="Dirt and gravel tracks may be used" value={onOff(p.allowUnpaved)} onPress={() => p.set({ allowUnpaved: !p.allowUnpaved })} />
      </ListCard>
      <Text variant="label" tone="muted">Inside a downloaded region, routes are found on your phone, with no signal needed. Elsewhere they need a signal; if the main road service is down, a backup finds the way without these preferences.</Text>
    </Screen>
  );
}
