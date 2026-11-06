import Svg, { Path } from 'react-native-svg';
import { RIDE_ARROW_PATH, RIDE_ARROW_RATIO, RIDE_ARROW_VIEWBOX } from './rideArrowPath';

/** The arrow on the Ride button, as a vector so it is sharp at any size. `size` is the width of its drawing area; the arrow itself fills a little over half of it. */
export function RideArrow({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size * RIDE_ARROW_RATIO} viewBox={RIDE_ARROW_VIEWBOX} aria-hidden>
      <Path d={RIDE_ARROW_PATH} fill={color} fillRule="evenodd" />
    </Svg>
  );
}
