import { useState } from 'react';

const UNSET = Symbol('unset');

/**
 * Runs `change` when `value` is not what it was on the last draw: to reset a form when its sheet opens, or to copy a loaded record into
 * the fields that edit it. It runs while drawing, before anything reaches the screen, so there is no flash of the old values (React's
 * advice for "adjusting state when a prop changes"). `change` may only set this component's own state.
 *
 * By default nothing runs on the first draw, because the state starts from its defaults; pass `onFirstDraw` to run it then too.
 */
export function useOnChange<T>(value: T, change: (value: T) => void, { onFirstDraw = false }: { onFirstDraw?: boolean } = {}): void {
  const [seen, setSeen] = useState<T | typeof UNSET>(onFirstDraw ? UNSET : value);
  if (!Object.is(seen, value)) {
    setSeen(value);
    change(value);
  }
}
