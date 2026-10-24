import type { MediaDto, VideoDto } from "@/server/queries/types";

export const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

type Item = { kind: "photo"; photo: MediaDto } | { kind: "video"; video: VideoDto };

/** Photos and videos alternate, so clips are spread through the page instead of piling up at the end. */
function interleave(photos: MediaDto[], videos: VideoDto[]): Item[] {
  const p = [...photos].sort((a, b) => a.position - b.position);
  const v = [...videos].sort((a, b) => a.position - b.position);
  const out: Item[] = [];
  for (let i = 0; i < Math.max(p.length, v.length); i++) {
    if (p[i]) out.push({ kind: "photo", photo: p[i]! });
    if (v[i]) out.push({ kind: "video", video: v[i]! });
  }
  return out;
}

/** Variants are produced at ingest (doc 05 §9), so plain <img> with srcset is used instead of next/image. */
function PhotoFigure({ m }: { m: MediaDto }) {
  const widths = Object.keys(m.variants).map(Number).sort((a, b) => a - b);
  const first = widths[0];
  if (first === undefined) return null;
  const srcSet = widths.map((w) => `${m.variants[String(w)]} ${w}w`).join(", ");
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={m.variants[String(first)]}
        srcSet={srcSet}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        alt={m.altText}
        width={m.width ?? undefined}
        height={m.height ?? undefined}
        loading="lazy"
        decoding="async"
        className="h-auto w-full rounded-3xl"
      />
      {m.caption || m.credit ? (
        <figcaption className="mt-2 font-mono text-xs text-muted">
          {m.caption ? <span>{m.caption}</span> : null}
          {m.caption && m.credit ? " · " : null}
          {m.credit ? <span>Photo: {m.credit}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** Videos never autoplay, load only when played, and always come with a text description. */
function VideoFigure({ v }: { v: VideoDto }) {
  return (
    <figure>
      <video controls preload="none" playsInline poster={v.posterUrl} width={v.width} height={v.height} className="h-auto w-full rounded-3xl bg-card-stone">
        <source src={v.mp4Url} type="video/mp4" />
        Your browser can&apos;t play this video.
      </video>
      <figcaption className="mt-2 text-sm">
        <span>{v.description}</span>
        <span className="block font-mono text-xs text-muted">
          {formatSeconds(v.durationS)}{v.credit ? ` · Video: ${v.credit}` : ""}
        </span>
        <a href={v.mp4Url} download className="inline-flex min-h-11 items-center text-xs underline underline-offset-4">Download the video</a>
      </figcaption>
    </figure>
  );
}

/** The trail's photos and videos in one masonry layout: columns of different-height tiles, in reading order. */
export function TrailMedia({ photos, videos = [] }: { photos: MediaDto[]; videos?: VideoDto[] }) {
  const items = interleave(photos, videos);
  if (items.length === 0) return null;
  const title = photos.length > 0 && videos.length > 0 ? "Photos and videos" : videos.length > 0 ? "Videos" : "Photos";
  return (
    <section aria-labelledby="media">
      <h2 id="media" className="text-xl font-semibold">{title}</h2>
      <ul className="mt-4 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {items.map((item) => (
          <li key={item.kind === "photo" ? `p-${item.photo.role}-${item.photo.position}` : `v-${item.video.mp4Url}`} className="mb-4 break-inside-avoid">
            {item.kind === "photo" ? <PhotoFigure m={item.photo} /> : <VideoFigure v={item.video} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
