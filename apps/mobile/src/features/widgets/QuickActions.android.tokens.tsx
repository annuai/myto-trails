import { Button, Column, Row, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxWidth, height, paddingAll, weight } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';
import type { QuickWidgetProps } from '@/lib/quickWidget';

/**
 * The Android home-screen widget with the quick actions: ride (start, pause or resume), SOS, group ride, check-in.
 * `open:` targets open the app straight from the press (Android will not start a screen later from the background); the
 * ride buttons while recording are events, handled by RideNotificationHost like the ride card's. The body is compiled
 * separately, so colours and links are written here (they match QUICK_LINKS in lib/quickWidget).
 */
const QuickActions = createWidget('QuickActions', (props: QuickWidgetProps) => {
  'widget';
  const card = '#af442e';
  const deep = '#8a3523';
  const red = '#c4271c';
  const white = '#ffffff';
  const soft = '#f3d9d3';
  const status = !props.recording ? 'Ready to ride' : `${props.paused ? 'Paused' : 'Recording'} · ${props.km} ${props.unit} · ${props.clock}`;
  const key = (label: string, target: string, fill: string) => (
    <Button {...({ target } as object)} colors={{ containerColor: fill, contentColor: white }} modifiers={[weight(1), height(48)]} contentPadding={{ start: 8, end: 8 }}>
      <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 15 }} color={white}>{label}</Text>
    </Button>
  );
  const ride = props.recording ? key(props.paused ? 'Resume' : 'Pause', props.paused ? 'ride.resume' : 'ride.pause', deep) : key('Start ride', 'open:myto://ride?autostart=1', deep);
  const sos = key('SOS', props.recording ? 'open:myto://ride/live?sos=1' : 'open:myto://documents/contacts', red);
  const group = key(props.group ? 'Group ride' : 'Group', 'open:myto://ride?mode=group', deep);
  const checkin = key('Check-in', 'open:myto://ride?checkin=1', deep);
  return (
    <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxWidth(), background(card), cornerRadius(16), paddingAll(12)]}>
      <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 15 }} color={soft}>{status}</Text>
      <Row horizontalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxWidth()]}>{ride}{sos}</Row>
      <Row horizontalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxWidth()]}>{group}{checkin}</Row>
    </Column>
  );
}, { recording: false, paused: false, km: '', unit: 'km', clock: '', group: false });

export default QuickActions;
