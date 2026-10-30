import { useState } from 'react';
import { Animated } from 'react-native';

/** One `Animated.Value` for the life of the component. Held in state, not a ref, so it can be read while drawing (`value.interpolate(...)`). */
export const useAnimatedValue = (initial: number): Animated.Value => useState(() => new Animated.Value(initial))[0];
