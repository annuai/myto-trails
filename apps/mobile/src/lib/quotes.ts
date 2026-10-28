/** Fisher-Yates shuffle of 0..total-1. */
function shuffled(total: number, rand: () => number): number[] {
  const a = Array.from({ length: total }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Next line to show: lines come off a shuffled queue, and the queue is only refilled once every line has been shown,
 * so none repeats until the whole set is done. After a refill the new first line is never the one just shown.
 * `queue` holds the indexes still to show; indexes outside the list (it may have changed) are dropped.
 */
export function drawQuote(queue: number[], total: number, last: number | undefined, rand: () => number = Math.random): { index: number; queue: number[] } {
  let rest = queue.filter((i) => Number.isInteger(i) && i >= 0 && i < total);
  if (rest.length === 0) {
    rest = shuffled(total, rand);
    if (total > 1 && rest[0] === last) [rest[0], rest[rest.length - 1]] = [rest[rest.length - 1]!, rest[0]!];
  }
  return { index: rest[0]!, queue: rest.slice(1) };
}
