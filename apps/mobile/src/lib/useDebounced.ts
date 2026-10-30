import { useEffect, useState } from 'react';

/** The value, once it has stopped changing for `ms`. A search box uses it so a request goes out when the rider pauses, not on every key. */
export function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => { const id = setTimeout(() => setSettled(value), ms); return () => clearTimeout(id); }, [value, ms]);
  return settled;
}
