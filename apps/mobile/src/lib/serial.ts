/** Runs async tasks strictly one at a time, in the order they were queued. A failed task does not stop the ones after it. */
export function createSerial() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const result = tail.then(task);
    tail = result.catch(() => undefined);
    return result;
  };
}
