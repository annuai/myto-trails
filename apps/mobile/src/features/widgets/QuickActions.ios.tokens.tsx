import { Button, HStack, Image, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { buttonStyle, font, foregroundStyle, padding, tint } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';
import type { QuickWidgetProps } from '@/lib/quickWidget';

/**
 * The iPhone home-screen widget with the quick actions: ride (start, pause or resume), SOS, group ride, check-in.
 * Small shows the first two. The body is compiled separately and cannot use imports or outside constants, so the
 * links and colours are written here (they match QUICK_LINKS in lib/quickWidget).
 */
const QuickActions = createWidget('QuickActions', (props: QuickWidgetProps, env) => {
  'widget';
  const brand = '#af442e';
  const red = '#c4271c';
  const small = env.widgetFamily === 'systemSmall';
  const status = !props.recording ? 'Ready to ride' : `${props.paused ? 'Paused' : 'Recording'} · ${props.km} ${props.unit} · ${props.clock}`;
  const ride = props.recording
    ? <Button label={props.paused ? 'Resume' : 'Pause'} systemImage={props.paused ? 'play.fill' : 'pause.fill'} target={props.paused ? 'ride.resume' : 'ride.pause'} modifiers={[buttonStyle('borderedProminent'), tint(brand)]} />
    : <Link label="Start ride" destination="myto://ride?autostart=1" modifiers={[buttonStyle('borderedProminent'), tint(brand)]} />;
  const sos = <Link label="SOS" destination={props.recording ? 'myto://ride/live?sos=1' : 'myto://documents/contacts'} modifiers={[buttonStyle('borderedProminent'), tint(red)]} />;
  const group = <Link label={props.group ? 'Group ride' : 'Group'} destination="myto://ride?mode=group" modifiers={[buttonStyle('bordered'), tint(brand)]} />;
  const checkin = <Link label="Check-in" destination="myto://ride?checkin=1" modifiers={[buttonStyle('bordered'), tint(brand)]} />;
  return (
    <VStack spacing={8} modifiers={[padding({ all: 12 })]}>
      <HStack>
        <Image systemName={props.recording ? 'record.circle.fill' : 'bolt.fill'} color={brand} />
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(brand)]}>{small ? (props.recording ? props.km + ' ' + props.unit : 'Myto Moto') : status}</Text>
        <Spacer />
      </HStack>
      {small ? <VStack spacing={8}>{ride}{sos}</VStack> : <VStack spacing={8}><HStack spacing={8}>{ride}{sos}</HStack><HStack spacing={8}>{group}{checkin}</HStack></VStack>}
    </VStack>
  );
}, { recording: false, paused: false, km: '', unit: 'km', clock: '', group: false });

export default QuickActions;
