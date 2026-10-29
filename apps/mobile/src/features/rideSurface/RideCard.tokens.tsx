import { Button, Column, Row, Text } from '@expo/ui/jetpack-compose';
import { createCustomNotification } from 'expo-widgets';
import type { RideSurfaceProps } from '@/lib/rideActions';

/**
 * The ride in the Android notification shade. It is ongoing, so a swipe does not remove it, and Pause or Resume is on it
 * whether the shade is collapsed or open. Android cannot tick a clock by itself, so the time is in whole minutes and is
 * refreshed with the distance. The body is compiled separately: no imports or outside constants, hence a `.tokens` file.
 */
const RideCard = createCustomNotification('RideCard', (props: RideSurfaceProps) => {
  'widget';
  // `target` names the button in the press event; the types do not list it for Compose buttons.
  const primary = <Button {...({ target: props.primaryId } as object)}><Text>{props.primaryLabel}</Text></Button>;
  const help = props.group ? <Button {...({ target: 'ride.help' } as object)}><Text>Help</Text></Button> : null;
  const line = `${props.clockShort} · ${props.km} km`;
  return {
    collapsed: (
      <Row verticalAlignment="center" horizontalArrangement="spaceBetween">
        <Column>
          <Text style={{ fontWeight: 'bold', fontSize: 15 }}>{props.title}</Text>
          <Text style={{ fontSize: 13 }}>{line}</Text>
        </Column>
        {primary}
      </Row>
    ),
    expanded: (
      <Column verticalArrangement={{ spacedBy: 8 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{props.title}</Text>
        <Text style={{ fontSize: 22, fontWeight: 'bold' }}>{props.clockShort}</Text>
        <Text style={{ fontSize: 14 }}>{`${props.km} km`}</Text>
        <Row horizontalArrangement={{ spacedBy: 12 }}>
          {primary}
          {help}
        </Row>
      </Column>
    ),
  };
});

export default RideCard;
