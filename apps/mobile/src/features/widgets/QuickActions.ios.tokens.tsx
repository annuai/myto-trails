import { Button, HStack, Image, Link, Text, VStack } from '@expo/ui/swift-ui';
import { background, buttonStyle, clipShape, containerBackground, font, foregroundStyle, frame, lineLimit, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';
import type { QuickWidgetProps } from '@/lib/quickWidget';

/**
 * The iPhone home-screen widget: large tiles (icon over a short label) for ride (start, pause or resume), SOS, group ride
 * and check-in. Small is a 2x2 grid, medium one row under the status, large a 2x2 grid of big tiles under it.
 * `containerBackground` is required from iOS 17: without it the system replaces the widget with "Please adopt
 * containerBackground API", whose tap opens an Apple docs URL as a route. The body is compiled separately and cannot
 * use imports or outside constants, so the links and colours are written here (links match QUICK_LINKS in lib/quickWidget).
 */
const QuickActions = createWidget('QuickActions', (props: QuickWidgetProps, env) => {
  'widget';
  const brand = '#af442e';
  const deep = '#8a3523';
  const red = '#c4271c';
  const white = '#ffffff';
  const soft = '#f3d9d3';
  const family = env.widgetFamily;
  const small = family === 'systemSmall';
  const large = family === 'systemLarge' || family === 'systemExtraLarge';
  const status = !props.recording ? 'Ready to ride' : `${props.paused ? 'Paused' : 'Recording'} · ${props.km} ${props.unit} · ${props.clock}`;
  const face = (icon: string, label: string, fill: string) => (
    <VStack spacing={small ? 2 : 6} modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity }), background(fill), clipShape('roundedRectangle', 16)]}>
      <Image systemName={icon} size={small ? 22 : large ? 34 : 26} color={white} />
      <Text modifiers={[font({ size: small ? 12 : 14, weight: 'bold' }), foregroundStyle(white), lineLimit(1)]}>{label}</Text>
    </VStack>
  );
  const ride = props.recording
    ? <Button target={props.paused ? 'ride.resume' : 'ride.pause'} modifiers={[buttonStyle('plain'), frame({ maxWidth: Infinity, maxHeight: Infinity })]}>{face(props.paused ? 'play.fill' : 'pause.fill', props.paused ? 'Resume' : 'Pause', brand)}</Button>
    : <Link destination="myto://ride?autostart=1" modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}>{face('play.fill', 'Start ride', brand)}</Link>;
  const sos = <Link destination={props.recording ? 'myto://ride/live?sos=1' : 'myto://documents/contacts'} modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}>{face('exclamationmark.triangle.fill', 'SOS', red)}</Link>;
  const group = <Link destination="myto://ride?mode=group" modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}>{face('person.2.fill', props.group ? 'Group ride' : 'Group', brand)}</Link>;
  const checkin = <Link destination="myto://ride?checkin=1" modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}>{face('checkmark.circle.fill', 'Check-in', brand)}</Link>;
  const header = (
    <HStack spacing={6} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
      <Image systemName={props.recording ? 'record.circle.fill' : 'bolt.fill'} color={soft} />
      <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(soft), lineLimit(1)]}>{status}</Text>
    </HStack>
  );
  const body = small
    ? <VStack spacing={8}><HStack spacing={8}>{ride}{sos}</HStack><HStack spacing={8}>{group}{checkin}</HStack></VStack>
    : large
      ? <VStack spacing={10}>{header}<HStack spacing={10}>{ride}{sos}</HStack><HStack spacing={10}>{group}{checkin}</HStack></VStack>
      : <VStack spacing={8}>{header}<HStack spacing={8}>{ride}{sos}{group}{checkin}</HStack></VStack>;
  return <VStack modifiers={[padding({ all: 4 }), containerBackground(deep, 'widget')]}>{body}</VStack>;
}, { recording: false, paused: false, km: '', unit: 'km', clock: '', group: false });

export default QuickActions;
