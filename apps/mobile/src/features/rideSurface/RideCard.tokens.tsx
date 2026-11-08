import { Button, Column, Row, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxWidth, height, paddingAll, weight } from '@expo/ui/jetpack-compose/modifiers';
import { createCustomNotification } from 'expo-widgets';
import type { RideSurfaceProps } from '@/lib/rideActions';

/**
 * The ride in the Android notification shade, in the same brand red as the iPhone's Live Activity. It is ongoing, so a swipe
 * does not remove it, and Pause or Resume and Help are on it whether the shade is collapsed or open. Android cannot tick a
 * clock by itself, so the time is in whole minutes and is refreshed with the distance. The body is compiled separately: no
 * outside constants, hence a `.tokens` file and the colours written here.
 */
const RideCard = createCustomNotification('RideCard', (props: RideSurfaceProps) => {
  'widget';
  const card = '#af442e';
  const white = '#ffffff';
  const soft = '#f3d9d3';
  const deep = '#8a3523';
  // `target` names the button in the press event; the types do not list it for Compose buttons. One line each, so a label never wraps.
  const primary = (
    <Button {...({ target: props.primaryId } as object)} colors={{ containerColor: white, contentColor: card }} modifiers={[weight(1), height(52)]} contentPadding={{ start: 16, end: 16 }}>
      <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 17 }} color={card}>{props.primaryLabel}</Text>
    </Button>
  );
  // Help is always there: it tells the group on a group ride. Solo it opens the SOS sheet, and the press itself opens the app (`open:`), since Android will not let the app do it later from the background.
  const help = (
    <Button {...({ target: props.group ? 'ride.help' : 'open:myto://ride/live?sos=1' } as object)} colors={{ containerColor: deep, contentColor: white }} modifiers={[weight(1), height(52)]} contentPadding={{ start: 16, end: 16 }}>
      <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 17 }} color={white}>Help</Text>
    </Button>
  );
  const status = props.paused ? 'Paused' : 'Recording';
  const line = `${props.clockShort} · ${props.km} ${props.unit ?? 'km'}`;
  const frame = [fillMaxWidth(), background(card), cornerRadius(16), paddingAll(16)];
  // Collapsed and expanded are the same card, so the numbers and both buttons are in view without pulling the shade open.
  const body = (
    <Column verticalArrangement={{ spacedBy: 12 }} modifiers={frame}>
      <Row verticalAlignment="center" horizontalArrangement="spaceBetween" modifiers={[fillMaxWidth()]}>
        <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 16 }} color={white}>{status}</Text>
        <Text maxLines={1} style={{ fontSize: 16, fontWeight: 'bold' }} color={white}>{line}</Text>
      </Row>
      <Row horizontalArrangement={{ spacedBy: 12 }} modifiers={[fillMaxWidth()]}>
        {primary}
        {help}
      </Row>
    </Column>
  );
  return { collapsed: body, expanded: body };
});

export default RideCard;
