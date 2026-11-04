/** Which section is open after one is tapped, when only one may be open at a time: tapping the open one closes it. */
export const nextOpen = (current: string | null, tapped: string): string | null => (current === tapped ? null : tapped);
