import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/ui/Breadcrumbs/Breadcrumbs";
import { formatDate } from "@/lib/format";
import type { MediaDto, RouteDto, TrailDetailDto, VideoDto } from "@/server/queries/types";
import { PlaceholderArt } from "@/ui/PlaceholderArt/PlaceholderArt";
import { AccessDetails } from "./AccessDetails";
import { GoNoGoStrip } from "./GoNoGoStrip";
import { LocationSection } from "./LocationSection";
import { RouteSection } from "./RouteSection";
import { SafetyInformation } from "./SafetyInformation";
import { SeasonStrip } from "./SeasonStrip";
import { TrailGallery } from "./TrailGallery";
import { TrailVideos } from "./TrailVideos";
import { TrailNotices } from "./TrailNotices";
import { routeShapeLabel, suitabilityLabel, terrainLabel } from "./labels";

/** Composition of the public trail page, in the order a rider needs it (docs/07 §4). */
export function TrailDetail({ trail, media, videos = [], route = null, actions }: { trail: TrailDetailDto; media: MediaDto[]; videos?: VideoDto[]; route?: RouteDto | null; actions?: ReactNode }) {
  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Regions", href: "/regions" },
    { label: trail.state.name, href: `/regions/${trail.state.slug}` },
    ...(trail.district ? [{ label: trail.district.name, href: `/regions/${trail.state.slug}/${trail.district.slug}` }] : []),
    { label: trail.name },
  ];
  const place = [trail.district?.name, trail.state.name].filter(Boolean).join(", ");
  const cover = media.find((m) => m.role === "cover") ?? media[0];
  const widths = cover ? Object.keys(cover.variants).map(Number).sort((a, b) => a - b) : [];

  return (
    <article className="flex flex-col gap-12 py-8">
      <header className="flex flex-col gap-3">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-3xl font-semibold leading-tight">{trail.name}</h1>
        <p className="text-muted">Near {trail.nearestTown} · {place}</p>
        {actions ? <div className="flex flex-wrap items-center gap-4">{actions}</div> : null}
      </header>

      <div className="aspect-[21/9] w-full overflow-hidden rounded-lg bg-stone">
        {cover && widths.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.variants[String(widths.find((w) => w >= 1200) ?? widths[widths.length - 1])]}
            srcSet={widths.map((w) => `${cover.variants[String(w)]} ${w}w`).join(", ")}
            sizes="(min-width: 1152px) 1120px, 100vw"
            alt={cover.altText}
            className="h-full w-full object-cover"
            fetchPriority="high"
          />
        ) : (
          <PlaceholderArt slug={trail.slug} className="h-full w-full" />
        )}
      </div>

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

      <RouteSection trail={trail} route={route} />
      <LocationSection trail={trail} showMap={!route} />
      <SeasonStrip bestMonths={trail.bestMonths} />
      <SafetyInformation hazards={trail.hazards} safetyNotes={trail.safetyNotes} />
      <TrailGallery media={media.filter((m) => m !== cover)} />
      <TrailVideos videos={videos} />
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
