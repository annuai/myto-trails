/** Where the sliding indicator of a segmented control sits: the track's padding, then equal segments side by side. */
export function segmentFrame(index: number, count: number, trackWidth: number, pad: number): { x: number; width: number } {
  if (count < 1 || trackWidth <= pad * 2) return { x: 0, width: 0 };
  const width = (trackWidth - pad * 2) / count;
  return { x: pad + Math.min(Math.max(index, 0), count - 1) * width, width };
}
