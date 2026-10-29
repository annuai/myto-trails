import { Button, HStack, Image, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { activityBackgroundTint, buttonStyle, font, foregroundStyle, monospacedDigit, padding, tint } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity } from 'expo-widgets';
import type { RideSurfaceProps } from '@/lib/rideActions';

/**
 * The ride on the iPhone's lock screen and in the Dynamic Island. Pause or Resume is always on the card.
 * The function body is compiled separately and cannot use imports, hooks or constants from outside, which is why
 * its sizes and colours are written here and the file is a `.tokens` file.
 */
const RideActivity = (props: RideSurfaceProps) => {
  'widget';
  // The lock screen card is the brand red with white elements. The Dynamic Island itself is always black (the system draws it), so its icons are white too.
  const card = '#af442e';
  const white = '#ffffff';
  const soft = '#f3d9d3';
  const time = props.paused
    ? <Text modifiers={[font({ size: 28, weight: 'bold' }), monospacedDigit()]}>{props.clock}</Text>
    : <Text date={new Date(props.since)} dateStyle="timer" modifiers={[font({ size: 28, weight: 'bold' }), monospacedDigit()]} />;
  const icon = props.paused ? 'pause.circle.fill' : 'record.circle.fill';
  // Pause (Resume once paused) is the filled main button. Help is always there: on a group ride it tells the group at once,
  // solo it opens the app on the SOS sheet.
  const controls = (
    <HStack spacing={12}>
      {/* A white button on the red card, so its icon and words are the card's red. */}
      <Button target={props.primaryId} modifiers={[buttonStyle('borderedProminent'), tint(white)]}>
        <HStack spacing={6}>
          <Image systemName={props.paused ? 'play.fill' : 'pause.fill'} color={card} />
          <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(card)]}>{props.primaryLabel}</Text>
        </HStack>
      </Button>
      {props.group
        ? <Button label="Help" systemImage="exclamationmark.triangle.fill" role="destructive" target="ride.help" modifiers={[buttonStyle('bordered'), tint(white)]} />
        : <Link label="Help" destination="myto://ride/live?sos=1" modifiers={[buttonStyle('bordered'), tint(white)]} />}
    </HStack>
  );
  return {
    banner: (
      <VStack spacing={8} modifiers={[padding({ all: 16 }), foregroundStyle(white), activityBackgroundTint(card)]}>
        <HStack>
          <Image systemName={icon} color={white} />
          <Text modifiers={[font({ size: 15, weight: 'semibold' })]}>{props.title}</Text>
          <Spacer />
          <Text modifiers={[font({ size: 15 }), foregroundStyle(soft)]}>{props.km} km</Text>
        </HStack>
        {time}
        {controls}
      </VStack>
    ),
    compactLeading: <Image systemName={icon} color={white} />,
    compactTrailing: props.paused ? <Text>{props.clock}</Text> : <Text date={new Date(props.since)} dateStyle="timer" />,
    minimal: <Image systemName={icon} color={white} />,
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
