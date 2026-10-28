import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Share, View } from 'react-native';
import { Image as ImageIcon, Link2 } from 'lucide-react-native';
import { createSharedRoute } from '@/api/sharedRoutes';
import { layoutAreaMap, layoutCardMap, mapBoxOf } from '@/lib/cardMap';
import { forSharing } from '@/lib/privacy';
import { buildRideCard, CARD_SIZE, MAX_CARD_STATS, type CardFormat, type CardStat } from '@/lib/rideCard';
import { buildSharedRoute } from '@/lib/shareRoute';
import { shareCard } from '@/lib/shareCard';
import { elevationProfile } from '@/lib/elevation';
import { useAction } from '@/lib/useAction';
import { useAuth } from '@/store/auth';
import { useCompanion } from '@/store/companion';
import type { Ride } from '@/store/rides';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { RideCard } from '@/ui/RideCard';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { space } from '@/theme/tokens';

const FORMATS: { key: CardFormat; label: string }[] = [{ key: 'story', label: 'Story' }, { key: 'post', label: 'Post' }, { key: 'square', label: 'Square' }];
const STATS: { key: CardStat; label: string }[] = [{ key: 'distance', label: 'Distance' }, { key: 'time', label: 'Time' }, { key: 'topSpeed', label: 'Top speed' }, { key: 'waypoints', label: 'Waypoints' }, { key: 'elevation', label: 'Climb' }];
const PREVIEW_W = 220;

/**
 * Share a ride as a picture (Instagram, WhatsApp, anything on the share sheet) or as a route link. The picture and the link both
 * leave out the first and last 300 m, so a home or workplace is never shown. The picture is made on the phone and not uploaded.
 */
export function ShareRideSheet({ ride, open, onClose }: { ride: Ride; open: boolean; onClose: () => void }) {
  const token = useAuth((s) => s.token);
  const card = useCompanion((s) => s.card);
  const [hideRoute, setHideRoute] = useState(false);
  /** A short ride has nothing left once its start and end are cut off: the rider may choose to show it whole. */
  const [fullRoute, setFullRoute] = useState(false);
  const [readyKey, setReadyKey] = useState('');
  const tooShort = useMemo(() => forSharing(ride.points).length < 2, [ride.points]);
  const fullRef = useRef<ComponentRef<typeof View>>(null);
  const { busy, problem, run } = useAction();
  const [message, setMessage] = useState<string>();
  const gain = useMemo(() => elevationProfile(ride.points)?.gainM, [ride.points]);
  const model = useMemo(
    () => buildRideCard({ name: ride.name, startedAt: ride.startedAt, distanceKm: ride.distanceKm, durationSec: ride.durationSec, maxKmh: ride.maxKmh, waypoints: ride.waypoints.length, points: ride.points, elevationGainM: gain }, { format: card.format, stats: card.stats, hideRoute, fullRoute }),
    [ride, card.format, card.stats, hideRoute, fullRoute, gain],
  );
  const full = CARD_SIZE[card.format];
  // The route over its map; or, when the route is hidden (too short to trim, or hidden by the rider), the map of the area alone.
  // Hiding the route also drops the map: nothing about where the ride was is shown.
  const map = useMemo(() => {
    if (hideRoute) return null;
    if (model.geoRoute) return layoutCardMap(model.geoRoute, mapBoxOf(model));
    const p = ride.points;
    if (!p.length) return null;
    const centre = { lat: p.reduce((n, x) => n + x.lat, 0) / p.length, lng: p.reduce((n, x) => n + x.lng, 0) / p.length };
    return layoutAreaMap(centre, mapBoxOf(model));
  }, [model, hideRoute, ride.points]);
  // A new map (another size, another route) has to load its tiles again before the picture can be saved.
  const mapKey = map ? `${map.zoom}:${map.tiles.map((t) => t.url).join('|')}` : 'none';
  const mapReady = readyKey === mapKey;
  const toggle = (k: CardStat) => {
    const has = card.stats.includes(k);
    useCompanion.getState().setCard({ stats: has ? card.stats.filter((s) => s !== k) : [...card.stats, k].slice(-MAX_CARD_STATS) });
  };
  const sharePicture = async () => {
    setMessage(undefined);
    try { await shareCard(fullRef.current); } catch (e) { setMessage(e instanceof Error ? e.message : 'The picture could not be shared.'); }
  };
  const shareLink = async () => {
    if (!token) return setMessage('Sign in to share a route as a link.');
    const body = buildSharedRoute({ name: ride.name, points: ride.points, waypoints: ride.waypoints });
    if (!body) return setMessage('This ride is too short to share. The first and last 300 m are always left out.');
    setMessage(undefined);
    const made = await run(() => createSharedRoute(token, body));
    if (made) await Share.share({ message: `${ride.name} on Myto Moto: ${made.value.url}` }).catch(() => undefined);
  };

  return (
    <Sheet open={open} title="Share this ride" onClose={onClose}>
      <View style={{ alignItems: 'center' }}><RideCard key={`p${mapKey}`} model={model} width={PREVIEW_W} map={map} /></View>
      {tooShort && !fullRoute && !hideRoute ? <Text variant="caption" tone="muted">This ride is short, so its route is left off the map to keep your start private. Turn on Show whole route to draw it.</Text> : null}
      <View style={{ flexDirection: 'row', gap: space[2], justifyContent: 'center' }}>
        {FORMATS.map((f) => <ChoiceChip key={f.key} label={f.label} selected={card.format === f.key} onPress={() => useCompanion.getState().setCard({ format: f.key })} />)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
        {STATS.map((s) => <ChoiceChip key={s.key} label={s.label} selected={card.stats.includes(s.key)} onPress={() => toggle(s.key)} />)}
        <ChoiceChip label="Hide route" selected={hideRoute} onPress={() => setHideRoute(!hideRoute)} />
        {tooShort ? <ChoiceChip label="Show whole route" selected={fullRoute} onPress={() => setFullRoute(!fullRoute)} /> : null}
      </View>
      <Button icon={ImageIcon} label={mapReady ? 'Share picture' : 'Preparing the map…'} disabled={busy || !mapReady} onPress={() => void sharePicture()} />
      <Button variant="soft" icon={Link2} label="Share route as a link" disabled={busy} onPress={() => void shareLink()} />
      <Text variant="caption" tone="muted">The first and last 300 m are left out of the picture and the link.</Text>
      {message ?? problem ? <Text variant="label" tone="stop">{message ?? problem}</Text> : null}
      {/* The picture that is saved is drawn at its full size, off screen, so it is sharp whatever the preview's size. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: -full.width - 50, top: 0 }}>
        <RideCard key={`f${mapKey}`} ref={fullRef} model={model} width={full.width} map={map} onMapReady={() => setReadyKey(mapKey)} />
      </View>
    </Sheet>
  );
}
