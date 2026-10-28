/**
 * Whether typing is allowed. While a ride is recording, or an unfinished one is waiting to be recovered (the phone may
 * still be riding), only a reliably stopped vehicle may type. With no ride in progress, always.
 */
export const canTypeNow = ({ riding, unfinished, stopped }: { riding: boolean; unfinished: boolean; stopped: boolean }) => ((!riding && !unfinished) || stopped);

/**
 * Typing is checked when a note is opened, not while it is written. Once the sheet was open with typing allowed it stays
 * unlocked until it closes: a change in motion (a GPS blip, a rolling start) must never take the field away mid-sentence.
 */
export const nextUnlocked = (unlocked: boolean, { open, canType }: { open: boolean; canType: boolean }) => open && (unlocked || canType);
export const noteFieldShown = ({ open, canType, unlocked }: { open: boolean; canType: boolean; unlocked: boolean }) => open && (unlocked || canType);
