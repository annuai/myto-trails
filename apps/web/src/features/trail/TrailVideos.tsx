import type { VideoDto } from "@/server/queries/types";

export const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Short clips from the trail. They never autoplay, load only when played, and always come with a text description. */
export function TrailVideos({ videos }: { videos: VideoDto[] }) {
  if (videos.length === 0) return null;
  return (
    <section aria-labelledby="videos">
      <h2 id="videos" className="text-xl font-semibold">Videos</h2>
      <ul className="mt-4 grid gap-8 sm:grid-cols-2">
        {[...videos].sort((a, b) => a.position - b.position).map((v) => (
          <li key={v.mp4Url}>
            <figure>
              <video
                controls
                preload="none"
                playsInline
                poster={v.posterUrl}
                width={v.width}
                height={v.height}
                className="h-auto max-h-[70vh] w-full rounded-3xl bg-card-stone object-contain"
              >
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
          </li>
        ))}
      </ul>
    </section>
  );
}
