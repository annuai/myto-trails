import Link from "next/link";
import type { ReactNode } from "react";
import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { Chip } from "@/ui/Chip/Chip";
import { PlaceholderArt } from "@/ui/PlaceholderArt/PlaceholderArt";
import { formatDate } from "@/lib/format";
import type { TrailSummaryDto } from "@/server/queries/types";
import { difficultyLabel, formatDuration, formatKm, terrainLabel } from "../trail/labels";

const LEVEL = { easy: 1, moderate: 2, hard: 3, expert: 4 } as const;

/** Four bars, filled up to the level: the difficulty is readable without colour. */
function Bars({ level }: { level: number }) {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true" className="shrink-0">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 3.6} y={9 - i * 3} width="2.4" height={3 + i * 3} fill={i < level ? "currentColor" : "none"} stroke="currentColor" strokeWidth="0.8" />
      ))}
    </svg>
  );
}

function CoverImage({ trail }: { trail: TrailSummaryDto }) {
  const cover = trail.cover;
  const widths = cover ? Object.keys(cover.variants).map(Number).sort((a, b) => a - b) : [];
  if (!cover || widths.length === 0) return <PlaceholderArt slug={trail.slug} className="h-full w-full" />;
  const pick = widths.find((w) => w >= 800) ?? widths[widths.length - 1]!;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cover.variants[String(pick)]}
      srcSet={widths.map((w) => `${cover.variants[String(w)]} ${w}w`).join(", ")}
      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      alt={cover.altText}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03]"
    />
  );
}

/** One trail as a card: photo, the facts a rider scans first as badges, and access and condition in words. */
export function TrailCard({ trail, children }: { trail: TrailSummaryDto; children?: ReactNode }) {
  const place = [trail.district?.name, trail.state.name].filter(Boolean).join(", ");
  return (
    <article className="group flex h-full flex-col">
      <Link href={`/trails/${trail.slug}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-[4/3] overflow-hidden rounded-3xl bg-card-stone">
        <CoverImage trail={trail} />
        {trail.isSample ? <span className="absolute left-3 top-3 rounded-full bg-foreground/80 px-2 py-0.5 font-mono text-[11px] text-white">Sample</span> : null}
      </Link>
      <div className="flex flex-1 flex-col gap-3 pt-5">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted">{place}</p>
          <h3 className="text-lg font-medium leading-snug">
            <Link href={`/trails/${trail.slug}`} className="underline-offset-4 hover:underline">{trail.name}</Link>
          </h3>
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label="Key facts">
          {trail.distanceKm !== null ? <li><Chip title="Trail length">{formatKm(trail.distanceKm)}</Chip></li> : null}
          {trail.estDurationMin !== null ? <li><Chip title="Estimated riding time">{formatDuration(trail.estDurationMin)}</Chip></li> : null}
          <li><Chip title="Difficulty"><Bars level={LEVEL[trail.difficulty]} />{difficultyLabel(trail.difficulty)}</Chip></li>
          {trail.terrain[0] ? <li><Chip title="Main terrain">{terrainLabel(trail.terrain[0])}</Chip></li> : null}
        </ul>
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge kind="access" value={trail.accessClass} chip />
          <StatusBadge kind="condition" value={trail.condition} chip />
        </div>
        <p className="text-xs text-muted">
          {trail.verification.needsRecheck
            ? "Needs re-check"
            : trail.verifiedAt && trail.verification.level !== "unverified"
              ? `Verified ${formatDate(trail.verifiedAt)}`
              : "Not verified"}
        </p>
        {children ? <div className="mt-auto flex flex-col gap-2 pt-2">{children}</div> : null}
      </div>
    </article>
  );
}
