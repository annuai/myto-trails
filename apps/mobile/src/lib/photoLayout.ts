/** Which photos go in which row: one wide, two side by side, one wide and two below, or two rows of two (the rest are counted on the last). */
export const photoRows = (n: number): number[][] => (n <= 0 ? [] : n === 1 ? [[0]] : n === 2 ? [[0, 1]] : n === 3 ? [[0], [1, 2]] : [[0, 1], [2, 3]]);

const MIN_RATIO = 0.8, MAX_RATIO = 1.6;
/** A lone photo keeps its own shape within limits, so a tall one does not take over the feed and a panorama is not a thin strip. */
export const loneRatio = (w: number, h: number) => Math.max(MIN_RATIO, Math.min(MAX_RATIO, w / Math.max(1, h)));
