import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RouteMap } from "@/features/map/RouteMap";
import { getSql } from "@/server/db/client";
import { getSharedRoute, isPublicId } from "@/server/rides/shared-routes";

export const instant = false;
export const metadata: Metadata = { title: "Shared route", robots: { index: false, follow: false } };

export default async function SharedRoutePage({ params }: PageProps<"/route/[id]">) {
  await connection();
  const { id } = await params;
  const route = isPublicId(id) ? await getSharedRoute(getSql(), id) : null;
  if (!route) notFound();
  const line = route.points.map(([lat, lng]) => [lng, lat] as [number, number]);
  const button = "inline-flex min-h-12 items-center rounded-lg px-5 text-sm font-medium";
  return (
    <section className="flex max-w-3xl flex-col gap-6 py-(--space-section)">
      <h1 className="display-md break-words">{route.name}</h1>
      <p className="text-muted">
        {route.distanceKm} km{route.elevationGainM !== null ? `, ${route.elevationGainM} m of climb` : ""}
        {route.waypoints.length ? `, ${route.waypoints.length} waypoint${route.waypoints.length === 1 ? "" : "s"}` : ""}
      </p>
      <RouteMap line={line} />
      <div className="flex flex-wrap gap-3">
        <a href={`myto://route/${id}`} className={`${button} bg-accent text-white hover:bg-accent-hover`}>Open in Myto</a>
        <a href={`/route/${id}/gpx`} className={`${button} border border-foreground/40`}>Download GPX</a>
      </div>
      <p className="max-w-prose text-sm text-muted">A rider shared this route. The start and end may have been trimmed for their privacy. Check access and conditions on the ground before you ride.</p>
    </section>
  );
}
