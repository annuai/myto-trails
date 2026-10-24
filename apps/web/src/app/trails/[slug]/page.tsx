import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrailDetail } from "@/features/trail/TrailDetail";
import { serializeJsonLd, trailJsonLd, trailMetadata } from "@/features/trail/seo";
import { getSiteUrl } from "@/lib/site";
import { getTrail, getTrailMedia } from "@/server/queries/trails";

// Trail data is cached with "use cache"; awaiting params here makes the route render on demand (and a real 404 for unknown slugs).
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/trails/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const trail = await getTrail(slug);
  return trail ? trailMetadata(trail, getSiteUrl(process.env)) : {};
}

export default async function TrailPage({ params }: PageProps<"/trails/[slug]">) {
  const { slug } = await params;
  const trail = await getTrail(slug);
  if (!trail) notFound();
  const media = await getTrailMedia(slug);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(trailJsonLd(trail, getSiteUrl(process.env))) }} />
      <TrailDetail trail={trail} media={media} />
    </>
  );
}
