import type { MediaDto } from "@/server/queries/types";

/** Variants are produced at ingest (doc 05 §9), so plain <img> with srcset is used instead of next/image. */
export function TrailGallery({ media }: { media: MediaDto[] }) {
  if (media.length === 0) return null;
  return (
    <section aria-labelledby="photos">
      <h2 id="photos" className="text-xl font-semibold">Photos</h2>
      <ul className="mt-4 grid gap-8 sm:grid-cols-2">
        {[...media].sort((a, b) => a.position - b.position).map((m) => {
          const widths = Object.keys(m.variants).map(Number).sort((a, b) => a - b);
          const first = widths[0];
          if (first === undefined) return null;
          const srcSet = widths.map((w) => `${m.variants[String(w)]} ${w}w`).join(", ");
          return (
            <li key={`${m.role}-${m.position}`}>
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.variants[String(first)]}
                  srcSet={srcSet}
                  sizes="(min-width: 640px) 50vw, 100vw"
                  alt={m.altText}
                  width={m.width ?? undefined}
                  height={m.height ?? undefined}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full rounded-lg"
                />
                {m.caption || m.credit ? (
                  <figcaption className="mt-2 font-mono text-xs text-muted">
                    {m.caption ? <span>{m.caption}</span> : null}
                    {m.caption && m.credit ? " · " : null}
                    {m.credit ? <span>Photo: {m.credit}</span> : null}
                  </figcaption>
                ) : null}
              </figure>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
