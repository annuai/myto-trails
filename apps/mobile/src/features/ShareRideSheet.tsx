import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Share, View } from 'react-native';
import { Image as ImageIcon, Link2 } from 'lucide-react-native';
import { createSharedRoute } from '@/api/sharedRoutes';
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
  const full = useRef<ComponentRef<typeof View>>(null);
  const { busy, problem, run } = useAction();
  const [message, setMessage] = useState<string>();
  const gain = useMemo(() => elevationProfile(ride.points)?.gainM, [ride.points]);
  const model = useMemo(
    () => buildRideCard({ name: ride.name, startedAt: ride.startedAt, distanceKm: ride.distanceKm, durationSec: ride.durationSec, maxKmh: ride.maxKmh, waypoints: ride.waypoints.length, points: ride.points, elevationGainM: gain }, { format: card.format, stats: card.stats, hideRoute }),
    [ride, card.format, card.stats, hideRoute, gain],
  );
  const toggle = (k: CardStat) => {
    const has = card.stats.includes(k);
    useCompanion.getState().setCard({ stats: has ? card.stats.filter((s) => s !== k) : [...card.stats, k].slice(-MAX_CARD_STATS) });
  };
  const sharePicture = async () => {
    setMessage(undefined);
    try { await shareCard(full.current); } catch (e) { setMessage(e instanceof Error ? e.message : 'The picture could not be shared.'); }
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
      <View style={{ alignItems: 'center' }}><RideCard model={model} width={PREVIEW_W} /></View>
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
        {FORMATS.map((f) => <ChoiceChip key={f.key} label={f.label} selected={card.format === f.key} onPress={() => useCompanion.getState().setCard({ format: f.key })} />)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {STATS.map((s) => <ChoiceChip key={s.key} label={s.label} selected={card.stats.includes(s.key)} onPress={() => toggle(s.key)} />)}
        <ChoiceChip label="Hide route" selected={hideRoute} onPress={() => setHideRoute(!hideRoute)} />
      </View>
      <Button icon={ImageIcon} label="Share picture" disabled={busy} onPress={() => void sharePicture()} />
      <Button variant="soft" icon={Link2} label="Share route as a link" disabled={busy} onPress={() => void shareLink()} />
      <Text variant="caption" tone="muted">The first and last 300 m are left out of the picture and the link.</Text>
      {message ?? problem ? <Text variant="label" tone="stop">{message ?? problem}</Text> : null}
      {/* The picture that is saved is drawn at its full size, off screen, so it is sharp whatever the preview's size. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: -CARD_SIZE[card.format].width - 50, top: 0 }}>
        <RideCard ref={full} model={model} width={CARD_SIZE[card.format].width} />
      </View>
    </Sheet>
  );
}
