import { monthLabel } from "./labels";

export function SeasonStrip({ bestMonths }: { bestMonths: number[] }) {
  if (bestMonths.length === 0) return null;
  return (
    <section aria-labelledby="best-months">
      <h2 id="best-months" className="text-xl font-semibold">Best months</h2>
      <ol className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-12">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const good = bestMonths.includes(month);
          return (
            <li key={month} className={`border-b-2 pb-1 text-center text-sm ${good ? "border-accent font-medium" : "border-border text-muted"}`}>
              {monthLabel(month)}
              {good ? <span className="sr-only">Good</span> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
