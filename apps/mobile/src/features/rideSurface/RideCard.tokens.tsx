import { Box, Button, Column, Image, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxWidth, height, size, weight, width } from '@expo/ui/jetpack-compose/modifiers';
import { createCustomNotification } from 'expo-widgets';
import type { RideSurfaceProps } from '@/lib/rideActions';

/**
 * The ride in the Android notification shade. It sits on the shade like a native card, with the brand red kept for the Myto mark
 * and Pause, and follows the phone's light or dark shade. It is ongoing, and a swipe brings it straight back while the ride runs
 * (patches/expo-widgets). Pause or Resume and Help are on it collapsed and open.
 *
 * Android draws this with Glance, which ignores `spacedBy` and `spaceBetween`: every gap is a Spacer. Collapsed, Android puts its own
 * icon (the Myto mark, res/drawable ic_stat_myto) to the left and the expand arrow to the right, which leaves about 260 dp, so
 * collapsed is two short lines and two small buttons, and no line can wrap. Android cannot tick a clock by itself, so the time is in
 * whole minutes and is refreshed with the distance. The body is compiled separately: no outside constants, hence a `.tokens` file
 * and the sizes and colours written here.
 */
const RideCard = createCustomNotification('RideCard', (props: RideSurfaceProps, env) => {
  'widget';
  const dark = env.colorScheme === 'dark';
  const brand = '#af442e';
  const live = dark ? '#ff8a73' : '#af442e';
  const ink = dark ? '#f4eff4' : '#1d1b20';
  const muted = dark ? '#cac4d0' : '#49454f';
  const tonal = dark ? '#49454f' : '#e7e0ec';
  const white = '#ffffff';

  const distance = `${props.km} ${props.unit ?? 'km'}`;
  const state = props.paused ? 'Paused' : 'Recording';
  // Solo, Help opens the SOS sheet, and the press itself opens the app (`open:`): Android will not let the app do it later from the background.
  const helpTarget = props.group ? 'ride.help' : 'open:myto://ride/live?sos=1';

  // `target` names the button in the press event; the types do not list it for Compose buttons. One line each, so a label never wraps.
  const pauseSmall = (
    <Button {...({ target: props.primaryId } as object)} colors={{ containerColor: brand, contentColor: white }} modifiers={[height(36)]} contentPadding={{ start: 14, end: 14 }}>
      <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 14 }} color={white}>{props.primaryLabel}</Text>
    </Button>
  );
  const helpSmall = (
    <Button {...({ target: helpTarget } as object)} colors={{ containerColor: tonal, contentColor: ink }} modifiers={[height(36)]} contentPadding={{ start: 14, end: 14 }}>
      <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 14 }} color={ink}>Help</Text>
    </Button>
  );
  const pauseLarge = (
    <Button {...({ target: props.primaryId } as object)} colors={{ containerColor: brand, contentColor: white }} modifiers={[weight(1), height(44)]} contentPadding={{ start: 16, end: 16 }}>
      <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 15 }} color={white}>{props.primaryLabel}</Text>
    </Button>
  );
  const helpLarge = (
    <Button {...({ target: helpTarget } as object)} colors={{ containerColor: tonal, contentColor: ink }} modifiers={[weight(1), height(44)]} contentPadding={{ start: 16, end: 16 }}>
      <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 15 }} color={ink}>Help</Text>
    </Button>
  );

  // Distance on top (it changes the most), then the state and time; both short enough for the collapsed width.
  const collapsed = (
    <Row verticalAlignment="center" modifiers={[fillMaxWidth(), height(48)]}>
      <Column modifiers={[weight(1)]}>
        <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 15 }} color={ink}>{distance}</Text>
        <Text maxLines={1} style={{ fontSize: 12 }} color={muted}>{`${state} · ${props.clockShort}`}</Text>
      </Column>
      <Spacer modifiers={[width(8)]} />
      {pauseSmall}
      <Spacer modifiers={[width(8)]} />
      {helpSmall}
    </Row>
  );

  // Open: the Myto mark on a brand tile, the numbers large, then both buttons sharing the width.
  const expanded = (
    <Column modifiers={[fillMaxWidth()]}>
      <Row verticalAlignment="center" modifiers={[fillMaxWidth()]}>
        <Box contentAlignment="center" modifiers={[size(40, 40), background(brand), cornerRadius(12)]}>
          <Image source={{ uri: 'ic_myto_mark' }} tint={white} contentDescription="Myto Moto" modifiers={[size(13, 22)]} />
        </Box>
        <Spacer modifiers={[width(12)]} />
        <Column modifiers={[weight(1)]}>
          <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 18 }} color={ink}>{`${props.clockShort} · ${distance}`}</Text>
          <Row verticalAlignment="center">
            <Text maxLines={1} style={{ fontSize: 12 }} color={live}>●</Text>
            <Spacer modifiers={[width(4)]} />
            <Text maxLines={1} style={{ fontSize: 13 }} color={muted}>{props.paused ? 'Ride paused' : 'Recording your ride'}</Text>
          </Row>
        </Column>
      </Row>
      <Spacer modifiers={[height(12)]} />
      <Row modifiers={[fillMaxWidth()]}>
        {pauseLarge}
        <Spacer modifiers={[width(8)]} />
        {helpLarge}
      </Row>
    </Column>
  );

  return { collapsed, expanded };
});

export default RideCard;
