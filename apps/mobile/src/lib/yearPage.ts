/** Years shown at once in the year picker: four rows of three would be 12, which also fits a 3-column grid on a phone. */
export const YEARS_PER_PAGE = 12;

/** The first year of the page that opens for `year`: it sits a third of the way down so a few earlier years show too. */
export const pageStartFor = (year: number): number => year - 4;

/** The years of the page starting at `start`. */
export const yearPage = (start: number): number[] => Array.from({ length: YEARS_PER_PAGE }, (_, i) => start + i);

/** "2022 to 2033" for the header over a page. */
export const pageLabel = (start: number): string => `${start} to ${start + YEARS_PER_PAGE - 1}`;
