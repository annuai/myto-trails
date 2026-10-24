import { formatDate } from "@/lib/format";
import type { TrailDetailDto } from "@/server/queries/types";
import { restrictionLabel } from "./labels";

export function AccessDetails({ trail }: { trail: TrailDetailDto }) {
  const sources =
    trail.evidenceCount === 0 ? "No sources recorded" : `${trail.evidenceCount} ${trail.evidenceCount === 1 ? "source" : "sources"}`;
  return (
    <section aria-labelledby="access-details">
      <h2 id="access-details" className="text-xl font-semibold">Access</h2>
      <div className="mt-4 flex flex-col gap-3">
        {trail.permissionInstructions ? <p className="max-w-prose">{trail.permissionInstructions}</p> : null}
        {trail.restrictions.length > 0 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Restrictions">
            {trail.restrictions.map((r) => (
              <li key={r}>{restrictionLabel(r)}</li>
            ))}
          </ul>
        ) : null}
        <p className="text-sm text-muted">{sources}</p>
        {trail.verifiedAt ? <p className="text-sm text-muted">Last verified {formatDate(trail.verifiedAt)}</p> : null}
      </div>
    </section>
  );
}
