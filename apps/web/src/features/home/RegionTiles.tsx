import Link from "next/link";
import type { RegionDto } from "@/server/queries/types";

/** The states with published trails, as tiles with their trail count. */
export function RegionTiles({ regions }: { regions: RegionDto[] }) {
  const states = regions.filter((r) => r.kind === "state" && r.publishedTrailCount > 0).sort((a, b) => b.publishedTrailCount - a.publishedTrailCount).slice(0, 8);
  if (states.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {states.map((s) => (
        <li key={s.slug}>
          <Link href={`/regions/${s.slug}`} className="flex h-full min-h-24 flex-col justify-between rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-md">
            <span className="text-lg font-semibold">{s.name}</span>
            <span className="text-sm text-muted">{s.publishedTrailCount} {s.publishedTrailCount === 1 ? "trail" : "trails"}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
