import Link from "next/link";
import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { formatDate } from "@/lib/format";
import type { TrailSummaryDto } from "@/server/queries/types";
import { formatKm } from "../trail/labels";
import { difficultyLabel } from "../trail/labels";

/** One trail in a list: a single link plus the facts a rider scans first. No card. */
export function TrailRow({ trail }: { trail: TrailSummaryDto }) {
  const place = [trail.district?.name, trail.state.name].filter(Boolean).join(", ");
  const facts = [place, trail.distanceKm !== null ? formatKm(trail.distanceKm) : null, difficultyLabel(trail.difficulty)].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col gap-2 border-b border-border py-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Link href={`/trails/${trail.slug}`} className="inline-flex min-h-11 items-center text-lg font-semibold underline-offset-4 hover:underline">
          {trail.name}
        </Link>
        {trail.isSample ? <span className="font-mono text-xs text-muted">Sample</span> : null}
      </div>
      <p className="text-sm text-muted">{facts}</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <StatusBadge kind="access" value={trail.accessClass} />
        <StatusBadge kind="condition" value={trail.condition} />
        <span className="text-sm text-muted">
          {trail.verification.needsRecheck
            ? "Needs re-check"
            : trail.verifiedAt && trail.verification.level !== "unverified"
              ? `Verified ${formatDate(trail.verifiedAt)}`
              : "Not verified"}
        </span>
      </div>
    </div>
  );
}
