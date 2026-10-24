import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { DataPair } from "@/ui/DataPair/DataPair";
import type { TrailDetailDto } from "@/server/queries/types";
import { DifficultyIndicator } from "./DifficultyIndicator";
import { formatDuration, formatKm } from "./labels";

/** The first thing a rider reads: may I ride it, can I ride it now, and how do we know. */
export function GoNoGoStrip({ trail }: { trail: TrailDetailDto }) {
  return (
    <section aria-labelledby="at-a-glance" className="border-y border-border py-6">
      <h2 id="at-a-glance" className="sr-only">At a glance</h2>
      <dl className="grid gap-6 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">Access</dt>
          <dd className="mt-1"><StatusBadge size="lg" kind="access" value={trail.accessClass} /></dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Condition</dt>
          <dd className="mt-1"><StatusBadge size="lg" kind="condition" value={trail.condition} /></dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Verification</dt>
          <dd className="mt-1">
            <StatusBadge size="lg" kind="verification" value={trail.verification.level} date={trail.verifiedAt ?? undefined} />
            {trail.verification.needsRecheck ? <p className="mt-1 text-sm font-medium text-status-caution">Needs re-check</p> : null}
          </dd>
        </div>
      </dl>
      <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
        {trail.distanceKm !== null ? <DataPair label="Distance">{formatKm(trail.distanceKm)}</DataPair> : null}
        {trail.estDurationMin !== null ? <DataPair label="Ride time">{formatDuration(trail.estDurationMin)}</DataPair> : null}
        {trail.elevationGainM !== null ? <DataPair label="Climb">{`+${trail.elevationGainM} m`}</DataPair> : null}
        <div>
          <dt className="text-xs text-muted">Difficulty</dt>
          <dd className="mt-0.5 text-sm font-medium"><DifficultyIndicator difficulty={trail.difficulty} /></dd>
        </div>
      </dl>
    </section>
  );
}
