/** The input and output of one `Animated` interpolation. The input is the pager's scroll offset in points. */
export type Stops = { inputRange: number[]; outputRange: number[] };

/** Opacity of a page's picture or words: 0 until `span` pages before it, 1 when it is centred, 0 again `span` pages after it. */
export function fadeStops(page: number, width: number, span: number): Stops {
  return { inputRange: [(page - span) * width, page * width, (page + span) * width], outputRange: [0, 1, 0] };
}

/** A frame that stays up through its last page, then dissolves as the next page arrives. 1 up to `page`, 0 once `span` pages further on. */
export function fadeOutStops(page: number, width: number, span: number): Stops {
  return { inputRange: [page * width, (page + span) * width], outputRange: [1, 0] };
}

/** A frame that is not there until `span` pages before `page`, and is whole once `page` is centred. */
export function fadeInStops(page: number, width: number, span: number): Stops {
  return { inputRange: [(page - span) * width, page * width], outputRange: [0, 1] };
}

/** Sideways shift of a page's picture in points: `drift` of a page to the right as it arrives, none when centred, the same to the left as it leaves. */
export function driftStops(page: number, width: number, drift: number): Stops {
  return { inputRange: [(page - 1) * width, page * width, (page + 1) * width], outputRange: [drift * width, 0, -drift * width] };
}

/**
 * Height of the two picture frames. The pictures sit behind the pages, so each frame is the height left over once the words
 * (the tallest of the first pages, or the whole setup page) have taken what they need.
 */
export function frameHeights(i: { container: number; wordsBelow: number; setupBelow: number; gap: number }): { tall: number; short: number } {
  return { tall: Math.max(0, i.container - i.wordsBelow - i.gap), short: Math.max(0, i.container - i.setupBelow - i.gap) };
}
