// Ids for things the phone creates.

/** A short id from the time and a random part. Unique enough on one phone, not secret. */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
