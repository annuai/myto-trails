/** Shape of a bike picture: catalogue illustrations are about 3:2, and the picker needs a calm delay while typing. */
export const bikeImage = {
  aspect: 3 / 2,
  /** Milliseconds to wait after the last key before searching the catalogue. */
  searchDelay: 300,
} as const;
