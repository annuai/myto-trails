import { Button, HStack, Image, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { activityBackgroundTint, buttonStyle, font, foregroundStyle, frame, monospacedDigit, padding, resizable, tint } from '@expo/ui/swift-ui/modifiers';
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
  // The Myto logo in white (assets/myto-logo.svg, 46 x 21 pt), as a data address because a widget body cannot import files.
  const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIoAAAA/CAMAAAAIXqCQAAACxFBMVEVMaXH///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+feRQ0AAAA63RSTlMABgQP+wUIuwH+PUT4AjwD+uPhXP3S2PxVJIrQxvYsFLFozI/f56cHC68SM6pj7+2e8w0lKxizw/W0NcFqyjkOIcsJ0+JJmmmp8OZUHXEcI9s6pAqOk9VkeioVQcmG3PeZ3i3pX0qY4DJiT7J7jUKgWUMe9E2Rgrz5up0TbMVhV0d3IhdLUUVtq7c3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';
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
          <Text modifiers={[font({ size: 15 }), foregroundStyle(soft)]}>{props.km} {props.unit ?? 'km'}</Text>
        </HStack>
        {time}
        {controls}
        <HStack>
          <Image uiImage={logo} modifiers={[resizable(), frame({ width: 46, height: 21 })]} />
          <Spacer />
        </HStack>
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
        <Text modifiers={[font({ size: 20, weight: 'bold' })]}>{props.km} {props.unit ?? 'km'}</Text>
      </VStack>
    ),
    expandedBottom: <VStack modifiers={[padding({ all: 12 })]}>{controls}</VStack>,
  };
};

export default createLiveActivity('RideActivity', RideActivity);
