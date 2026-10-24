import { Breadcrumbs, type Crumb } from "@/ui/Breadcrumbs/Breadcrumbs";
import { formatDate } from "@/lib/format";
import type { MediaDto, TrailDetailDto } from "@/server/queries/types";
import { AccessDetails } from "./AccessDetails";
import { GoNoGoStrip } from "./GoNoGoStrip";
import { SafetyInformation } from "./SafetyInformation";
import { SeasonStrip } from "./SeasonStrip";
import { TrailGallery } from "./TrailGallery";
import { TrailNotices } from "./TrailNotices";
import { routeShapeLabel, suitabilityLabel, terrainLabel } from "./labels";

/** Composition of the public trail page, in the order a rider needs it (docs/07 §4). */
export function TrailDetail({ trail, media }: { trail: TrailDetailDto; media: MediaDto[] }) {
  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Regions", href: "/regions" },
    { label: trail.state.name, href: `/regions/${trail.state.slug}` },
    ...(trail.district ? [{ label: trail.district.name, href: `/regions/${trail.state.slug}/${trail.district.slug}` }] : []),
    { label: trail.name },
  ];
  const place = [trail.district?.name, trail.state.name].filter(Boolean).join(", ");

  return (
    <article className="flex flex-col gap-12 py-8">
      <header className="flex flex-col gap-3">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-3xl font-semibold leading-tight">{trail.name}</h1>
        <p className="text-muted">Near {trail.nearestTown} · {place}</p>
      </header>

      <div className="flex flex-col gap-6">
        <GoNoGoStrip trail={trail} />
        <TrailNotices trail={trail} />
      </div>

      <section aria-labelledby="about">
        <h2 id="about" className="text-xl font-semibold">About this trail</h2>
        <p className="mt-4 max-w-prose">{trail.summary}</p>
        {trail.description ? <p className="mt-4 max-w-prose">{trail.description}</p> : null}
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">Terrain</dt>
            <dd className="mt-1">
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {trail.terrain.map((t) => (
                  <li key={t}>{terrainLabel(t)}</li>
                ))}
              </ul>
            </dd>
          </div>
          {trail.suitableFor.length > 0 ? (
            <div>
              <dt className="text-sm text-muted">Suitable for</dt>
              <dd className="mt-1">
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                  {trail.suitableFor.map((s) => (
                    <li key={s}>{suitabilityLabel(s)}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
          {trail.routeShape ? (
            <div>
              <dt className="text-sm text-muted">Route</dt>
              <dd className="mt-1">{routeShapeLabel(trail.routeShape)}</dd>
            </div>
          ) : null}
          {trail.surfaceNotes ? (
            <div>
              <dt className="text-sm text-muted">Surface</dt>
              <dd className="mt-1">{trail.surfaceNotes}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <SeasonStrip bestMonths={trail.bestMonths} />
      <SafetyInformation hazards={trail.hazards} safetyNotes={trail.safetyNotes} />
      <TrailGallery media={media} />
      <AccessDetails trail={trail} />

      <footer className="border-t border-border pt-4 text-sm text-muted">
        <p>
          Updated {formatDate(trail.updatedAt)} · Version {trail.version}
        </p>
        {trail.contributorCredit ? <p>Contributed by {trail.contributorCredit}</p> : null}
      </footer>
    </article>
  );
}
