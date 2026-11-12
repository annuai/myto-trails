/** The ring beside a service item: its box and stroke, the radius within the box, and the dash length it animates (2 pi r). `soon` is the share left below which it turns amber. `check` is the drawn tick inside it. */
export const serviceRing = { box: 44, stroke: 5, radius: 18, soon: 0.15, check: { size: 20, stroke: 3 } } as const;
export const serviceRingLength = 2 * Math.PI * serviceRing.radius;
