import { CARRY_ITEM_LABEL, arrivalText, type TrailCarry as Carry } from "@moto-trails/domain";

/** What to carry and the best time of day to reach the trail. Nothing is shown for a trail that gives neither. */
export function TrailCarry({ carry }: { carry: Carry | null }) {
  if (!carry) return null;
  const hasCarry = carry.waterLitres !== null || carry.items.length > 0 || carry.notes !== null;
  const hasArrival = carry.arrival !== null || carry.arrivalNote !== null;
  return (
    <>
      {hasCarry ? (
        <section aria-labelledby="carry">
          <h2 id="carry" className="text-xl font-semibold">What to carry</h2>
          {carry.waterLitres !== null ? <p className="mt-4">Water: <span className="font-mono">{carry.waterLitres} L</span> per rider</p> : null}
          {carry.items.length > 0 ? (
            <ul className="mt-4 grid gap-x-6 sm:grid-cols-2">
              {carry.items.map((i) => (
                <li key={i} className="flex min-h-11 items-center gap-2 border-b border-border">
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0 text-status-good"><path d="M2 8.5 6 12.5 14 3.5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
                  <span>{CARRY_ITEM_LABEL[i]}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {carry.notes ? <p className="mt-4 max-w-prose">{carry.notes}</p> : null}
        </section>
      ) : null}
      {hasArrival ? (
        <section aria-labelledby="arrive">
          <h2 id="arrive" className="text-xl font-semibold">Best time to reach</h2>
          {carry.arrival ? <p className="mt-4 font-mono">{arrivalText(carry.arrival.from, carry.arrival.to)}</p> : null}
          {carry.arrivalNote ? <p className="mt-2 max-w-prose">{carry.arrivalNote}</p> : null}
        </section>
      ) : null}
    </>
  );
}
