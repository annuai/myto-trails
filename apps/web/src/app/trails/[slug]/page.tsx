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
import { CommentsSection } from "@/features/community/CommentsSection";
import { RiddenPanel } from "@/features/community/RiddenPanel";
import { deleteCommentAction, editCommentAction, markRiddenAction, postCommentAction, reportCommentAction, unmarkRiddenAction } from "@/features/community/actions";
import { listComments } from "@/server/community/comments";
import { getRiddenSummary } from "@/server/community/ridden";
import { getTrail, getTrailMedia, getTrailRoute, getTrailVideos } from "@/server/queries/trails";

// Trail data is cached with "use cache"; awaiting params here makes the route render on demand (and a real 404 for unknown slugs).
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/trails/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const trail = await getTrail(slug);
  return trail ? trailMetadata(trail, getSiteUrl(process.env)) : {};
}

export default async function TrailPage({ params, searchParams }: PageProps<"/trails/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const code = typeof sp.c === "string" ? sp.c.slice(0, 40) : undefined;
  const trail = await getTrail(slug);
  if (!trail) notFound();
  const [media, route, videos] = await Promise.all([getTrailMedia(slug), getTrailRoute(slug), getTrailVideos(slug)]);
  // Viewing a saved trail counts as having seen its current state.
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    // Signed-out experience if the account database is unavailable.
  }
  const saved = user ? await isSaved(getSql(), user.id, slug) : false;
  if (user && saved) await markSavedSeen(getSql(), user.id, slug, new Date());
  const [riddenSummary, comments] = await Promise.all([getRiddenSummary(getSql(), slug, user?.id ?? null), listComments(getSql(), slug, user?.id ?? null)]);
  const maxMonth = new Date().toISOString().slice(0, 7);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(trailJsonLd(trail, getSiteUrl(process.env))) }} />
      <TrailDetail
        trail={trail}
        media={media}
        videos={videos}
        route={route}
        community={
          <>
            <RiddenPanel slug={slug} summary={riddenSummary} signedIn={Boolean(user)} code={code} maxMonth={maxMonth} actions={{ mark: markRiddenAction, unmark: unmarkRiddenAction }} />
            <CommentsSection slug={slug} comments={comments} signedIn={Boolean(user)} code={code} actions={{ post: postCommentAction, edit: editCommentAction, remove: deleteCommentAction, report: reportCommentAction }} />
          </>
        }
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
