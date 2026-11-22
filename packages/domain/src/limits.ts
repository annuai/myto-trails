// Upload size limits shared by the browser checks and the server checks, so they cannot disagree.

/** Largest GPX file accepted. */
export const GPX_MAX_BYTES = 5 * 1024 * 1024;
/** Largest image file accepted. */
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
/** Largest image accepted by pixel count, so a small file cannot unpack into a huge bitmap. */
export const IMAGE_MAX_MEGAPIXELS = 40;
