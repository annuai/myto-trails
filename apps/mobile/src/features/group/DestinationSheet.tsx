import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Map as MapIcon, MapPin } from 'lucide-react-native';
import type { LatLng } from '@/lib/geo';
import { PlaceSearch } from '@/features/route/PlaceSearch';
import { Button } from '@/ui/Button';
import { ListCard, Row } from '@/ui/ListCard';
import { OsmMap } from '@/ui/map/OsmMap';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { fixed, inkSolid, radius, size } from '@/theme/tokens';
import { useLocation } from '@/store/location';

/** The part of the screen's height the map takes when choosing a spot. */
const MAP_SHARE = 0.5;
/** Where the map opens when nothing says where the rider is (no position passed in, none found yet): the middle of India, wide enough to find the way from. */
const FALLBACK_CENTRE: LatLng = { lat: 20.59, lng: 78.96 };

/**
 * Where the ride is going (the group's destination, or the place chosen before a ride). A sheet to search a place (results come up as you type) or to choose one on the map, which opens over it as a
 * second sheet: the map moves under a pin that stays at the middle, and "Set destination" takes the spot under the pin. Picking a search
 * result sets it at once. Either way this closes and the sheet beneath shows the new destination.
 */
export function DestinationSheet({ open, onClose, near, current, onSet }: { open: boolean; onClose: () => void; /** The rider's position: results nearer it come first and the map opens here. */ near?: LatLng; /** The destination now, where the map opens when there is one. */ current?: LatLng; onSet: (p: LatLng, name?: string) => Promise<unknown> | void }) {
  const [mapOpen, setMapOpen] = useState(false);
  const [centre, setCentre] = useState<LatLng>();
  const { height } = useWindowDimensions();
  // Choosing on the map is always offered: it opens on the destination so far, else where the rider is, else the last place the phone knew, else the fallback.
  const fix = useLocation((s) => s.fix);
  const from: LatLng = current ?? near ?? (fix ? { lat: fix.lat, lng: fix.lng } : FALLBACK_CENTRE);
  const done = () => { setMapOpen(false); onClose(); };
  const set = async (p: LatLng, name?: string) => { await onSet(p, name); done(); };
  return (
    <>
      <Sheet open={open} title="Destination" onClose={() => { setMapOpen(false); onClose(); }}>
        <PlaceSearch label="Search a place" near={near} onPick={(p) => void set(p.point, p.name)} />
        <ListCard>
          <Row icon={MapIcon} label="Choose on the map" sub="Move the map to put the pin on the spot" onPress={() => { setCentre(from); setMapOpen(true); }} />
        </ListCard>
      </Sheet>
      <Sheet open={open && mapOpen} title="Choose on the map" onClose={() => setMapOpen(false)}>
        <View style={{ height: height * MAP_SHARE, borderRadius: radius.card, overflow: 'hidden' }}>
          <OsmMap height="fill" pickFrom={from} onCenter={setCentre} radius={radius.card} />
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ marginBottom: size.pin }}><MapPin size={size.pin} color={fixed.white} fill={inkSolid} strokeWidth={size.outline} /></View>
          </View>
        </View>
        <Text variant="label" tone="muted">The pin stays in the middle. Move the map until it is on the spot, then set it.</Text>
        <Button label="Set destination" disabled={!centre} onPress={() => centre && void set(centre)} />
      </Sheet>
    </>
  );
}
