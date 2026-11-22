// Layout sizes that depend on the window.

import { useWindowDimensions } from 'react-native';

/** The widest the content grows on a large screen. */
export const CONTENT_MAX = 1000;

/** Landscape on a phone (or any wide window): screens switch to two columns and tighter chrome. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  return { width, height, landscape: width > height && width >= 640 };
}
