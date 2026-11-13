import { Button, Column, Row, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, fillMaxWidth, paddingAll, weight } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';
import type { QuickWidgetProps } from '@/lib/quickWidget';

/**
 * The Android home-screen widget: four large tiles (glyph over a short label) for ride (start, pause or resume), SOS,
 * group ride and check-in. Resizable both ways (app.json): the tiles share the space by weight, so any size from 2x2
 * cells up keeps big tap targets. expo-widgets gives the Android body no size, so there is one layout, not one per size.
 * `open:` targets open the app straight from the press (Android will not start a screen later from the background); the
 * ride buttons while recording are events, handled by RideNotificationHost like the ride card's. The body is compiled
 * separately, so colours and links are written here (they match QUICK_LINKS in lib/quickWidget).
 */
const QuickActions = createWidget('QuickActions', (props: QuickWidgetProps) => {
  'widget';
  const card = '#8a3523';
  const brand = '#af442e';
  const red = '#c4271c';
  const white = '#ffffff';
  const soft = '#f3d9d3';
  const status = !props.recording ? 'Ready to ride' : `${props.paused ? 'Paused' : 'Recording'} · ${props.km} ${props.unit} · ${props.clock}`;
  const tile = (glyph: string, label: string, target: string, fill: string) => (
    <Button {...({ target } as object)} colors={{ containerColor: fill, contentColor: white }} modifiers={[weight(1), fillMaxSize()]} contentPadding={{ start: 4, end: 4 }}>
      <Column horizontalAlignment="center">
        <Text style={{ fontWeight: 'bold', fontSize: 26 }} color={white}>{glyph}</Text>
        <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 15 }} color={white}>{label}</Text>
      </Column>
    </Button>
  );
  const ride = props.recording
    ? tile(props.paused ? '▶' : '❚❚', props.paused ? 'Resume' : 'Pause', props.paused ? 'ride.resume' : 'ride.pause', brand)
    : tile('▶', 'Start ride', 'open:myto://ride?autostart=1', brand);
  const sos = tile('!', 'SOS', props.recording ? 'open:myto://ride/live?sos=1' : 'open:myto://sos', red);
  const group = tile('●●', props.group ? 'Group ride' : 'Group', 'open:myto://ride?mode=group', brand);
  const checkin = tile('✓', 'Check-in', 'open:myto://ride?checkin=1', brand);
  return (
    <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxSize(), background(card), cornerRadius(16), paddingAll(10)]}>
      <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 14 }} color={soft}>{status}</Text>
      <Row horizontalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxWidth(), weight(1)]}>{ride}{sos}</Row>
      <Row horizontalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxWidth(), weight(1)]}>{group}{checkin}</Row>
    </Column>
  );
}, { recording: false, paused: false, km: '', unit: 'km', clock: '', group: false });

export default QuickActions;
