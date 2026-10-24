import { notFound } from "next/navigation";
import { TrailDetail } from "@/features/trail/TrailDetail";
import { getTrail, getTrailMedia } from "@/server/queries/trails";

// Trail data is cached with "use cache"; awaiting params here makes the route render on demand (and a real 404 for unknown slugs).
export const instant = false;

export default async function TrailPage({ params }: PageProps<"/trails/[slug]">) {
  const { slug } = await params;
  const trail = await getTrail(slug);
  if (!trail) notFound();
  const media = await getTrailMedia(slug);
  return <TrailDetail trail={trail} media={media} />;
}
