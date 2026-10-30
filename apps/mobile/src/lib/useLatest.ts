import { useCallback, useEffect, useRef } from 'react';

/**
 * A function that always calls the newest `fn`, and is the same function on every draw. For handlers made once (a drag, a timer) that
 * must still reach the current props. The ref stays inside this hook, so the component never reads one while drawing.
 */
export function useLatest<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  return useCallback((...args: A) => ref.current(...args), []);
}
