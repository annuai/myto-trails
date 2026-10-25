import { useWindowDimensions } from 'react-native';

export const CONTENT_MAX = 1000;

/** Landscape on a phone (or any wide window): screens switch to two columns and tighter chrome. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  return { width, height, landscape: width > height && width >= 640 };
}
