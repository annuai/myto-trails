import { Button, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, monospacedDigit, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity } from 'expo-widgets';
import type { RideSurfaceProps } from '@/lib/rideActions';

/**
 * The ride on the iPhone's lock screen and in the Dynamic Island. Pause or Resume is always on the card.
 * The function body is compiled separately and cannot use imports, hooks or constants from outside, which is why
 * its sizes and colours are written here and the file is a `.tokens` file.
 */
const RideActivity = (props: RideSurfaceProps) => {
  'widget';
  const accent = '#ec8272';
  const time = props.paused
    ? <Text modifiers={[font({ size: 28, weight: 'bold' }), monospacedDigit()]}>{props.clock}</Text>
    : <Text date={new Date(props.since)} dateStyle="timer" modifiers={[font({ size: 28, weight: 'bold' }), monospacedDigit()]} />;
  const icon = props.paused ? 'pause.circle.fill' : 'record.circle.fill';
  const controls = (
    <HStack spacing={12}>
      <Button label={props.primaryLabel} systemImage={props.paused ? 'play.fill' : 'pause.fill'} target={props.primaryId} />
      {props.group ? <Button label="Help" systemImage="exclamationmark.triangle.fill" role="destructive" target="ride.help" /> : null}
    </HStack>
  );
  return {
    banner: (
      <VStack spacing={8} modifiers={[padding({ all: 16 })]}>
        <HStack>
          <Image systemName={icon} color={accent} />
          <Text modifiers={[font({ size: 15, weight: 'semibold' })]}>{props.title}</Text>
          <Spacer />
          <Text modifiers={[font({ size: 15 }), foregroundStyle('#8E8E93')]}>{props.km} km</Text>
        </HStack>
        {time}
        {controls}
      </VStack>
    ),
    compactLeading: <Image systemName={icon} color={accent} />,
    compactTrailing: props.paused ? <Text>{props.clock}</Text> : <Text date={new Date(props.since)} dateStyle="timer" />,
    minimal: <Image systemName={icon} color={accent} />,
    expandedLeading: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text modifiers={[font({ size: 12 }), foregroundStyle('#8E8E93')]}>{props.paused ? 'Paused' : 'Riding'}</Text>
        {time}
      </VStack>
    ),
    expandedTrailing: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text modifiers={[font({ size: 12 }), foregroundStyle('#8E8E93')]}>Distance</Text>
        <Text modifiers={[font({ size: 20, weight: 'bold' })]}>{props.km} km</Text>
      </VStack>
    ),
    expandedBottom: <VStack modifiers={[padding({ all: 12 })]}>{controls}</VStack>,
  };
};

export default createLiveActivity('RideActivity', RideActivity);
