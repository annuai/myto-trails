import Link from "next/link";
import { canDownloadGpx } from "@moto-trails/domain";
import { RouteMap } from "@/features/map/RouteMap";
import type { RouteDto, TrailDetailDto } from "@/server/queries/types";
import { ElevationProfile } from "./ElevationProfile";
import { formatKm } from "./labels";

/** The route of a trail: numbers, line on the map, elevation profile and, where allowed, the GPX download. */
export function RouteSection({ trail, route }: { trail: TrailDetailDto; route: RouteDto | null }) {
  if (!route) return null;
  const download = canDownloadGpx({
    lifecycle: "published",
    accessClass: trail.accessClass,
    sensitivity: trail.sensitivity,
    hasGpx: trail.hasGpx,
    condition: trail.condition,
  }).allowed;
  const stats: { label: string; value: string }[] = [
    { label: "Distance", value: formatKm(route.distanceKm) },
    ...(route.elevGainM !== null ? [{ label: "Climb", value: `+${route.elevGainM} m` }] : []),
    ...(route.elevLossM !== null ? [{ label: "Descent", value: `−${route.elevLossM} m` }] : []),
    ...(route.minElevM !== null && route.maxElevM !== null ? [{ label: "Elevation range", value: `${route.minElevM}–${route.maxElevM} m` }] : []),
  ];

  return (
    <section aria-labelledby="route" className="flex flex-col gap-6">
      <h2 id="route" className="text-xl font-semibold">Route</h2>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="mt-1">{s.value}</dd>
          </div>
        ))}
      </dl>
      <RouteMap line={route.line} />
      <ElevationProfile profile={route.profile} />
      {download ? (
        <Link href={`/trails/${trail.slug}/download`} className="inline-flex min-h-11 w-fit items-center border border-ink px-4 underline-offset-4 hover:underline">
          Download GPX
        </Link>
      ) : null}
    </section>
  );
}
