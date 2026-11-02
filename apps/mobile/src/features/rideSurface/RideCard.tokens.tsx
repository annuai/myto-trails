import { Button, Column, Row, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
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
    <Button {...({ target: props.primaryId } as object)} colors={{ containerColor: white, contentColor: card }} contentPadding={{ start: 14, end: 14 }}>
      <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 14 }} color={card}>{props.primaryLabel}</Text>
    </Button>
  );
  // Help is always there: it tells the group on a group ride, and opens the SOS sheet solo.
  const help = (
    <Button {...({ target: 'ride.help' } as object)} colors={{ containerColor: deep, contentColor: white }} contentPadding={{ start: 14, end: 14 }}>
      <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 14 }} color={white}>Help</Text>
    </Button>
  );
  const status = props.paused ? 'Paused' : 'Recording';
  const line = `${props.clockShort} · ${props.km} ${props.unit ?? 'km'}`;
  const frame = [fillMaxWidth(), background(card), cornerRadius(16), paddingAll(12)];
  return {
    collapsed: (
      <Row verticalAlignment="center" horizontalArrangement="spaceBetween" modifiers={frame}>
        <Column>
          <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 15 }} color={white}>{status}</Text>
          <Text maxLines={1} style={{ fontSize: 13 }} color={soft}>{line}</Text>
        </Column>
        <Row horizontalArrangement={{ spacedBy: 8 }}>
          {primary}
          {help}
        </Row>
      </Row>
    ),
    expanded: (
      <Column verticalArrangement={{ spacedBy: 8 }} modifiers={frame}>
        <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 15 }} color={white}>{props.title}</Text>
        <Text maxLines={1} style={{ fontSize: 28, fontWeight: 'bold' }} color={white}>{props.clockShort}</Text>
        <Text maxLines={1} style={{ fontSize: 15 }} color={soft}>{`${props.km} ${props.unit ?? 'km'}`}</Text>
        <Row horizontalArrangement={{ spacedBy: 12 }}>
          {primary}
          {help}
        </Row>
      </Column>
    ),
  };
});

export default RideCard;
