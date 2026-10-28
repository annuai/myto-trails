import { resolveBikeImage, type BikeImageVariants } from "@moto-trails/domain";

type Source = string | BikeImageVariants | null | undefined;

/**
 * One image per bike: the rider's own photo, else the catalogue picture, else a placeholder. `want` is the width in
 * pixels the picture is shown at, so the smallest sufficient catalogue variant is loaded. Size it with `className`.
 */
export function BikeImage({ own, preset, want, alt, className = "" }: { own?: Source; preset?: Source; want: number; alt: string; className?: string }) {
  const { url, own: isOwn } = resolveBikeImage(own, preset, want);
  // Catalogue pictures are transparent cut-outs: no fill behind them. Only the placeholder has a background; a rider's photo covers the frame.
  const frame = `aspect-[3/2] overflow-hidden rounded-lg ${className}`;
  return url ? (
    <div className={frame}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} loading="lazy" className={`size-full ${isOwn ? "object-cover" : "object-contain"}`} />
    </div>
  ) : (
    <div role="img" aria-label={`${alt}, no picture yet`} className={`${frame} flex items-center justify-center bg-card-cream text-muted`}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-8 fill-none stroke-current stroke-[1.75]"><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="18.5" cy="17.5" r="3.5" /><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2" /></svg>
    </div>
  );
}
