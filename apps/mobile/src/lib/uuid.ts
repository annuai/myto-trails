import * as Crypto from 'expo-crypto';

/** A random UUID for idempotent creates (the API's clientId). */
export const newUuid = (): string => Crypto.randomUUID();
