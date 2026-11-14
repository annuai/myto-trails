import { Button, Column, Image, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxHeight, fillMaxSize, fillMaxWidth, height, paddingAll, size, weight, width } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';
import type { QuickWidgetProps } from '@/lib/quickWidget';

/**
 * The Android home-screen widget, laid out like the iPhone one: a status line with an icon, then four rounded tiles (icon over a
 * short label) in one row for ride (start, pause or resume), SOS, group ride and check-in. Android's widget renderer (Glance)
 * ignores `spacedBy` and button colours, so tiles are rounded boxes with spacers between them. `weight` is honoured only through
 * patches/expo-widgets (a weighted child of a Row or Column gets an equal share), so the four tiles share the whole row and
 * fill the widget at any size. Icons are the app's Lucide icons (Play, Pause, Siren, Users,
 * CircleCheck, Zap, CircleDot) drawn white into res/drawable-xxhdpi as ic_widget_*.png, and the body is compiled separately, so
 * colours and links are written here (they match QUICK_LINKS in lib/quickWidget). `open:` targets open the app straight from the
 * press; the ride buttons while recording are events, handled by RideNotificationHost like the ride card's.
 */
const QuickActions = createWidget('QuickActions', (props: QuickWidgetProps) => {
  'widget';
  const card = '#8a3523';
  const brand = '#af442e';
  const red = '#c4271c';
  const white = '#ffffff';
  const soft = '#f3d9d3';
  const status = !props.recording ? 'Ready to ride' : `${props.paused ? 'Paused' : 'Recording'} · ${props.km} ${props.unit} · ${props.clock}`;
  const tile = (icon: string, label: string, target: string, fill: string) => (
    <Button {...({ target } as object)} modifiers={[weight(1), fillMaxHeight(), background(fill), cornerRadius(16)]}>
      <Column horizontalAlignment="center" verticalArrangement="center">
        <Image source={{ uri: icon }} tint={white} contentDescription={label} modifiers={[size(28, 28)]} />
        <Spacer modifiers={[height(2)]} />
        <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 12 }} color={white}>{label}</Text>
      </Column>
    </Button>
  );
  const ride = props.recording
    ? tile(props.paused ? 'ic_widget_play' : 'ic_widget_pause', props.paused ? 'Resume' : 'Pause', props.paused ? 'ride.resume' : 'ride.pause', brand)
    : tile('ic_widget_play', 'Start ride', 'open:myto://ride?autostart=1', brand);
  const sos = tile('ic_widget_siren', 'SOS', props.recording ? 'open:myto://ride/live?sos=1' : 'open:myto://sos', red);
  const group = tile('ic_widget_users', props.group ? 'Group ride' : 'Group', 'open:myto://ride?mode=group', brand);
  const checkin = tile('ic_widget_check', 'Check-in', 'open:myto://ride?checkin=1', brand);
  return (
    <Column horizontalAlignment="center" modifiers={[fillMaxSize(), background(card), cornerRadius(24), paddingAll(12)]}>
      <Row verticalAlignment="center">
        <Image source={{ uri: props.recording ? 'ic_widget_record' : 'ic_widget_bolt' }} tint={soft} modifiers={[size(16, 16)]} />
        <Spacer modifiers={[width(6)]} />
        <Text maxLines={1} style={{ fontWeight: 'bold', fontSize: 13 }} color={soft}>{status}</Text>
      </Row>
      <Spacer modifiers={[height(6)]} />
      <Row modifiers={[fillMaxWidth(), weight(1)]}>{ride}<Spacer modifiers={[width(8)]} />{sos}<Spacer modifiers={[width(8)]} />{group}<Spacer modifiers={[width(8)]} />{checkin}</Row>
    </Column>
  );
}, { recording: false, paused: false, km: '', unit: 'km', clock: '', group: false });

export default QuickActions;
