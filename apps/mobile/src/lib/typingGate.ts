/**
 * Whether typing is allowed. While a ride is recording, or an unfinished one is waiting to be recovered (the phone may
 * still be riding), only a reliably stopped vehicle may type. With no ride in progress, always.
 */
export const canTypeNow = ({ riding, unfinished, stopped }: { riding: boolean; unfinished: boolean; stopped: boolean }) => ((!riding && !unfinished) || stopped);
