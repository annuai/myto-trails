import type { PublicConditionReport } from "@/server/rides/condition-reports";

const KIND_LABEL: Record<PublicConditionReport["kind"], string> = { clear: "Clear", muddy: "Muddy", blocked: "Blocked", washed_out: "Washed out", closed: "Closed" };
const DAY = 86_400_000;

const age = (at: string, now: Date) => {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(at).getTime()) / DAY));
  return days === 0 ? "Today" : days === 1 ? "1 day ago" : `${days} days ago`;
};

const votes = (c: number, d: number) => {
  if (!c && !d) return null;
  const yes = c ? `${c} ${c === 1 ? "rider says" : "riders say"} it is still true` : null;
  const no = d ? `${d} ${d === 1 ? "says" : "say"} it is not` : null;
  return [yes, no].filter(Boolean).join(", ");
};

/**
 * What riders have reported about the trail lately, newest first. It is separate from the moderator-set condition above it on
 * the page: nobody has checked these, so each shows its age and whether other riders agreed, and an old one says so.
 */
export function RiderReports({ reports, now }: { reports: PublicConditionReport[]; now: Date }) {
  if (reports.length === 0) return null;
  return (
    <section aria-labelledby="rider-reports">
      <h2 id="rider-reports" className="text-xl font-semibold">Rider reports</h2>
      <p className="mt-2 max-w-prose text-sm text-muted">Reported by riders, not checked by moderators. Check the date before you rely on one.</p>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {reports.map((r) => (
          <li key={r.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
            <span className="font-medium">{KIND_LABEL[r.kind]}</span>
            <span className="text-sm text-muted">{age(r.at, now)}</span>
            {r.fresh ? null : <span className="text-sm text-muted">Older report</span>}
            {votes(r.confirmations, r.disputes) ? <span className="w-full text-sm text-muted">{votes(r.confirmations, r.disputes)}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
