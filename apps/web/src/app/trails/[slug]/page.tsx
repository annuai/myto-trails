import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrailDetail } from "@/features/trail/TrailDetail";
import { serializeJsonLd, trailJsonLd, trailMetadata } from "@/features/trail/seo";
import { SaveButton } from "@/features/saved/SaveButton";
import { getSiteUrl } from "@/lib/site";
import { getCurrentUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { isSaved, markSavedSeen } from "@/server/queries/saved";
import { saveTrailAction, unsaveTrailAction } from "@/app/saved/actions";
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
  // Viewing a saved trail counts as having seen its current state.
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    // Signed-out experience if the account database is unavailable.
  }
  const saved = user ? await isSaved(getSql(), user.id, slug) : false;
  if (user && saved) await markSavedSeen(getSql(), user.id, slug, new Date());
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(trailJsonLd(trail, getSiteUrl(process.env))) }} />
      <TrailDetail
        trail={trail}
        media={media}
        actions={
          <>
            <SaveButton slug={slug} signedIn={Boolean(user)} initialSaved={saved} save={saveTrailAction} unsave={unsaveTrailAction} />
            <Link href={`/trails/${slug}/report`} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">
              Report an issue
            </Link>
          </>
        }
      />
    </>
  );
}
