import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Share, View } from 'react-native';
import { Camera, Image as ImageIcon, ImagePlus, Layers, Link2, Send } from 'lucide-react-native';
import { createSharedRoute } from '@/api/sharedRoutes';
import { CameraCapture } from '@/features/camera/CameraCapture';
import { bakeFilm, uprightPhoto } from '@/lib/film/skiaFilm';
import type { FilmLook } from '@/lib/filmLook';
import { filmImage } from '@/ui/FilmImage.tokens';
import { layoutAreaMap, layoutCardMap, mapBoxOf } from '@/lib/cardMap';
import { currentPlacement, overlayBox, placementAfterFormatChange, type PhotoLayout, type Placement } from '@/lib/photoCard';
import { pickCardPhoto, type PickedPhoto } from '@/lib/pickPhoto';
import { forSharing } from '@/lib/privacy';
import { trimNearPlaces } from '@/lib/geo';
import { useSavedPlaces } from '@/lib/savedPlaces';
import { buildRideCard, CARD_SIZE, MAX_CARD_STATS, type CardFormat, type CardStat } from '@/lib/rideCard';
import { buildSharedRoute } from '@/lib/shareRoute';
import { captureCard, shareCard } from '@/lib/shareCard';
import { shareToStories, storiesAvailable } from '@/lib/shareToStories';
import { elevationProfile } from '@/lib/elevation';
import { useAction } from '@/lib/useAction';
import { useAuth } from '@/store/auth';
import { useCompanion } from '@/store/companion';
import type { Ride } from '@/store/rides';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { PhotoCard } from '@/ui/PhotoCard';
import { PhotoOverlay } from '@/ui/PhotoOverlay';
import { RideCard } from '@/ui/RideCard';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { space } from '@/theme/tokens';
import { PhotoComposer } from './share/PhotoComposer';

const FORMATS: { key: CardFormat; label: string }[] = [{ key: 'story', label: 'Story' }, { key: 'post', label: 'Post' }, { key: 'square', label: 'Square' }];
const STATS: { key: CardStat; label: string }[] = [{ key: 'distance', label: 'Distance' }, { key: 'time', label: 'Time' }, { key: 'topSpeed', label: 'Top speed' }, { key: 'waypoints', label: 'Waypoints' }, { key: 'elevation', label: 'Climb' }];
const LAYOUTS: { key: PhotoLayout; label: string }[] = [{ key: 'bar', label: 'Bar' }, { key: 'corner', label: 'Corner' }];
const PREVIEW_W = 220;
type Mode = 'card' | 'photo';

/**
 * Share a ride as a picture (Instagram, WhatsApp, anything on the share sheet) or as a route link. The picture and the link both
 * leave out the first and last 300 m, and any start or end within 500 m of Home or Work, so neither is ever shown. The picture is
 * made on the phone and not uploaded.
 *
 * Photo mode lays the same trimmed route and stats (the same card model) over the rider's own photo, without map tiles, or saves
 * that overlay alone on a transparent background. The photo and where the overlay sits are kept only while the sheet is open.
 */
export function ShareRideSheet({ ride, open, onClose }: { ride: Ride; open: boolean; onClose: () => void }) {
  const token = useAuth((s) => s.token);
  const card = useCompanion((s) => s.card);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('card');
  const [hideRoute, setHideRoute] = useState(false);
  /** A short ride has nothing left once its start and end are cut off: the rider may choose to show it whole. */
  const [fullRoute, setFullRoute] = useState(false);
  const [readyKey, setReadyKey] = useState('');
  /** The photo, and the format it was cropped for: another format re-covers it with a centre crop. */
  const [photo, setPhoto] = useState<{ picked: PickedPhoto; format: CardFormat }>();
  /** Where the rider put the overlay; null until they move it, so it follows the layout's default. */
  const [placement, setPlacement] = useState<Placement | null>(null);
  /** The photo the full-size picture has finished loading, so it is never saved before the photo shows. */
  const [loadedUri, setLoadedUri] = useState<string>();
  /** A photo that would not open: its picture cannot be shared, so the rider is asked to change it. */
  const [failedUri, setFailedUri] = useState<string>();
  const [capturing, setCapturing] = useState(false);
  /** While a finger moves the overlay the sheet does not scroll, so the drag is not taken over by the scroll. */
  const [dragging, setDragging] = useState(false);
  const places = useSavedPlaces();
  const tooShort = useMemo(() => forSharing(ride.points, places).length < 2, [ride.points, places]);
  /** What may be shown at all: a ride that never got 500 m from Home or Work has nothing, not even the area map. */
  const away = useMemo(() => trimNearPlaces(ride.points, places), [ride.points, places]);
  const fullRef = useRef<ComponentRef<typeof View>>(null);
  const photoRef = useRef<ComponentRef<typeof View>>(null);
  const overlayRef = useRef<ComponentRef<typeof View>>(null);
  const { busy, problem, run } = useAction();
  const [message, setMessage] = useState<string>();
  const gain = useMemo(() => elevationProfile(ride.points)?.gainM, [ride.points]);
  const model = useMemo(
    () => buildRideCard({ name: ride.name, startedAt: ride.startedAt, distanceKm: ride.distanceKm, durationSec: ride.durationSec, maxKmh: ride.maxKmh, waypoints: ride.waypoints.length, points: ride.points, elevationGainM: gain }, { format: card.format, stats: card.stats, hideRoute, fullRoute, places }),
    [ride, card.format, card.stats, hideRoute, fullRoute, gain, places],
  );
  const full = CARD_SIZE[card.format];
  // The route over its map; or, when the route is hidden (too short to trim, or hidden by the rider), the map of the area alone.
  // Hiding the route also drops the map: nothing about where the ride was is shown.
  const map = useMemo(() => {
    if (hideRoute) return null;
    if (model.geoRoute) return layoutCardMap(model.geoRoute, mapBoxOf(model));
    const p = away;
    if (!p.length) return null;
    const centre = { lat: p.reduce((n, x) => n + x.lat, 0) / p.length, lng: p.reduce((n, x) => n + x.lng, 0) / p.length };
    return layoutAreaMap(centre, mapBoxOf(model));
  }, [model, hideRoute, away]);
  // A new map (another size, another route) has to load its tiles again before the picture can be saved.
  const mapKey = map ? `${map.zoom}:${map.tiles.map((t) => t.url).join('|')}` : 'none';
  const mapReady = readyKey === mapKey;

  // Photo mode: the overlay's box follows the layout, the stats and Hide route, and the placement is kept inside the picture for it.
  const box = useMemo(() => overlayBox(card.layout, model), [card.layout, model]);
  const cardSize = useMemo(() => ({ width: model.width, height: model.height }), [model.width, model.height]);
  const placed = useMemo(() => currentPlacement(placement, card.layout, box, cardSize), [placement, card.layout, box, cardSize]);
  const photoReady = !!photo && loadedUri === photo.picked.uri;
  const photoFailed = !!photo && failedUri === photo.picked.uri;
  const redLine = message ?? (mode === 'photo' && photoFailed ? 'That photo could not be opened. Choose another one.' : undefined) ?? problem;

  // Closing the sheet lets the photo go: the app never keeps it. (Set during render, React's pattern for state that follows a prop.)
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setMode('card');
      setPhoto(undefined);
      setPlacement(null);
      setLoadedUri(undefined);
      setFailedUri(undefined);
      setDragging(false);
    }
  }

  const toggle = (k: CardStat) => {
    const has = card.stats.includes(k);
    useCompanion.getState().setCard({ stats: has ? card.stats.filter((s) => s !== k) : [...card.stats, k].slice(-MAX_CARD_STATS) });
  };
  const pickFormat = (f: CardFormat) => {
    useCompanion.getState().setCard({ format: f });
    setPlacement((p) => (p ? placementAfterFormatChange(p, box, CARD_SIZE[f]) : p));
  };
  const pickLayout = (l: PhotoLayout) => {
    useCompanion.getState().setCard({ layout: l });
    setPlacement(null);
  };
  const switchMode = (m: Mode) => {
    setMessage(undefined);
    setDragging(false);
    // Each mode's full-size picture is drawn afresh when the mode opens, so it waits for its tiles or its photo again.
    if (m === 'photo') setReadyKey('');
    else setLoadedUri(undefined);
    setMode(m);
  };
  const sharePicture = async () => {
    setMessage(undefined);
    try { await shareCard(fullRef.current); } catch (e) { setMessage(e instanceof Error ? e.message : 'The picture could not be shared.'); }
  };
  const capture = async (view: ComponentRef<typeof View> | null) => {
    setMessage(undefined);
    setCapturing(true);
    try { await shareCard(view); } catch (e) { setMessage(e instanceof Error ? e.message : 'The picture could not be shared.'); } finally { setCapturing(false); }
  };
  /** Instagram Stories: a photo goes in as the background with the overlay as a sticker the rider can still move; a card goes in as the background. */
  const toStories = async () => {
    setMessage(undefined);
    setCapturing(true);
    try {
      if (mode === 'photo' && photo) await shareToStories({ backgroundUri: photo.picked.uri, stickerUri: await captureCard(overlayRef.current) });
      else await shareToStories({ backgroundUri: await captureCard(fullRef.current) });
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not open Instagram.'); } finally { setCapturing(false); }
  };
  /** A photo from the film camera: the look is drawn into it, then it goes on the card like any picked photo (the card crops it to fit). */
  const cameraPhoto = async (uri: string, look: FilmLook) => {
    setCameraOpen(false);
    setMessage(undefined);
    const format = card.format;
    try {
      const upright = await uprightPhoto(uri, filmImage.bakeLongSide);
      const picked = look.id === 'none' ? upright : await bakeFilm(uri, look, filmImage.bakeLongSide, filmImage.bakeJpegQuality).then(async (baked) => ({ ...(await uprightPhoto(baked, filmImage.bakeLongSide)) }));
      setDragging(false);
      setPhoto({ picked, format });
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not use that photo. Try another one.'); }
  };
  const choosePhoto = async (source: 'library' | 'camera') => {
    if (source === 'camera') return setCameraOpen(true);
    setMessage(undefined);
    const format = card.format;
    const r = await pickCardPhoto(source, format);
    if (r.ok) { setDragging(false); setPhoto({ picked: r.photo, format }); }
    else if (r.reason !== 'cancelled') setMessage(r.message);
  };
  const shareLink = async () => {
    if (!token) return setMessage('Sign in to share a route as a link.');
    const body = buildSharedRoute({ name: ride.name, points: ride.points, waypoints: ride.waypoints, places });
    if (!body) return setMessage('This ride is too short to share. The first and last 300 m, and anything within 500 m of Home or Work, are always left out.');
    setMessage(undefined);
    const made = await run(() => createSharedRoute(token, body));
    if (made) await Share.share({ message: `${ride.name} on Myto Moto: ${made.value.url}` }).catch(() => undefined);
  };

  const formatChips = (
    <View style={{ flexDirection: 'row', gap: space[2], justifyContent: 'center' }}>
      {FORMATS.map((f) => <ChoiceChip key={f.key} label={f.label} selected={card.format === f.key} onPress={() => pickFormat(f.key)} />)}
    </View>
  );
  const shortCaption = tooShort && !fullRoute && !hideRoute ? <Text variant="caption" tone="muted">This ride is short, so its route is left off to keep your start private. Turn on Show whole route to draw it.</Text> : null;
  const statChips = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
      {STATS.map((s) => <ChoiceChip key={s.key} label={s.label} selected={card.stats.includes(s.key)} onPress={() => toggle(s.key)} />)}
      <ChoiceChip label="Hide route" selected={hideRoute} onPress={() => setHideRoute(!hideRoute)} />
      <ChoiceChip label="Red route" selected={card.redRoute} onPress={() => useCompanion.getState().setCard({ redRoute: !card.redRoute })} />
      {tooShort ? <ChoiceChip label="Show whole route" selected={fullRoute} onPress={() => setFullRoute(!fullRoute)} /> : null}
    </View>
  );

  const cardMode = (
    <>
      <View style={{ alignItems: 'center' }}><RideCard key={`p${mapKey}`} model={model} width={PREVIEW_W} map={map} redRoute={card.redRoute} /></View>
      {shortCaption}
      {formatChips}
      {statChips}
      <Button icon={ImageIcon} label={mapReady ? 'Share picture' : 'Preparing the map…'} disabled={busy || !mapReady} onPress={() => void sharePicture()} />
      {storiesAvailable() ? <Button variant="soft" icon={Send} label="Share to Instagram Stories" disabled={busy || capturing || !mapReady} onPress={() => void toStories()} /> : null}
      <Button variant="soft" icon={Link2} label="Share route as a link" disabled={busy} onPress={() => void shareLink()} />
    </>
  );
  const photoMode = photo ? (
    <>
      <View style={{ alignItems: 'center' }}>
        <PhotoComposer model={model} photo={photo.picked} layout={card.layout} ink={card.ink} redRoute={card.redRoute} placement={placed} onPlacement={setPlacement} onActive={setDragging} width={PREVIEW_W} />
      </View>
      {shortCaption}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], justifyContent: 'center' }}>
        {LAYOUTS.map((l) => <ChoiceChip key={l.key} label={l.label} selected={card.layout === l.key} onPress={() => pickLayout(l.key)} />)}
        <ChoiceChip label="Light text" selected={card.ink === 'light'} onPress={() => useCompanion.getState().setCard({ ink: 'light' })} />
        <ChoiceChip label="Dark text" selected={card.ink === 'dark'} onPress={() => useCompanion.getState().setCard({ ink: 'dark' })} />
      </View>
      {formatChips}
      {photo.format !== card.format ? <Text variant="caption" tone="muted">Pick the photo again for an exact crop.</Text> : null}
      {statChips}
      {photoFailed ? null : <Button icon={ImageIcon} label={photoReady ? 'Share picture' : 'Preparing the picture…'} disabled={capturing || !photoReady} onPress={() => void capture(photoRef.current)} />}
      {storiesAvailable() && !photoFailed ? <Button variant="soft" icon={Send} label="Share to Instagram Stories" disabled={capturing || !photoReady} onPress={() => void toStories()} /> : null}
      <Button variant="soft" icon={Layers} label="Save overlay only" disabled={capturing} onPress={() => void capture(overlayRef.current)} />
      <Button variant="soft" icon={ImagePlus} label="Change photo" disabled={capturing} onPress={() => void choosePhoto('library')} />
    </>
  ) : (
    <>
      {/* The format comes first: the phone's crop is made to its shape. */}
      {formatChips}
      <Button icon={ImagePlus} label="Choose a photo" onPress={() => void choosePhoto('library')} />
      <Button variant="soft" icon={Camera} label="Take a photo" onPress={() => void choosePhoto('camera')} />
    </>
  );

  return (
    <>
    <CameraCapture open={cameraOpen} onPhoto={(uri, look) => void cameraPhoto(uri, look)} onClose={() => setCameraOpen(false)} />
    <Sheet open={open} title="Share this ride" onClose={onClose} scrollEnabled={!dragging}>
      <View style={{ flexDirection: 'row', gap: space[2], justifyContent: 'center' }}>
        <ChoiceChip label="Card" selected={mode === 'card'} onPress={() => switchMode('card')} />
        <ChoiceChip label="Photo" selected={mode === 'photo'} onPress={() => switchMode('photo')} />
      </View>
      {mode === 'card' ? cardMode : photoMode}
      {mode === 'photo' ? <Text variant="caption" tone="muted">Your photo stays on your phone.</Text> : null}
      <Text variant="caption" tone="muted">The first and last 300 m, and the part near Home or Work, are left out of the picture and the link.</Text>
      {redLine ? <Text variant="label" tone="stop">{redLine}</Text> : null}
      {/* The picture that is saved is drawn at its full size, off screen, so it is sharp whatever the preview's size. */}
      {mode === 'card' ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: -full.width - 50, top: 0 }}>
          <RideCard key={`f${mapKey}`} ref={fullRef} model={model} width={full.width} map={map} redRoute={card.redRoute} onMapReady={() => setReadyKey(mapKey)} />
        </View>
      ) : null}
      {/* Photo mode saves the photo card, or the overlay alone at scale 1 with nothing behind it, so the PNG stays transparent. */}
      {mode === 'photo' && photo ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: -full.width - 50, top: 0 }}>
          <PhotoCard
            key={photo.picked.uri}
            ref={photoRef}
            model={model}
            width={full.width}
            photo={photo.picked}
            layout={card.layout}
            ink={card.ink}
            redRoute={card.redRoute}
            placement={placed}
            onReady={(ok) => (ok ? setLoadedUri(photo.picked.uri) : setFailedUri(photo.picked.uri))}
          />
          <PhotoOverlay ref={overlayRef} model={model} layout={card.layout} ink={card.ink} redRoute={card.redRoute} width={box.width} />
        </View>
      ) : null}
    </Sheet>
    </>
  );
}
