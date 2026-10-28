import { Animated } from 'react-native';

/** Opacity of the floating tab bar: 1 shown, 0 gone. A screen that wants the bar out of the way at its end drives it. */
export const tabBarFade = new Animated.Value(1);
