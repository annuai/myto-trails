import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
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
import { askRiderAction } from "@/features/community/question-actions";
import { getMemberState } from "@/server/community/members";
import { listComments } from "@/server/community/comments";
import { RiderReports } from "@/features/trail/RiderReports";
import { listConditionReports } from "@/server/rides/condition-reports";
import { getRiddenSummary } from "@/server/community/ridden";
import { Skeleton } from "@/ui/Skeleton/Skeleton";
import { getTrail, getTrailMedia, getTrailRoute, getTrailVideos } from "@/server/queries/trails";

// Trail data is cached with "use cache"; awaiting params here makes the route render on demand (and a real 404 for unknown slugs).
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/trails/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const trail = await getTrail(slug);
  return trail ? trailMetadata(trail, getSiteUrl(process.env)) : {};
}

async function currentUserOrNull() {
  try {
    return await getCurrentUser();
  } catch {
    return null; // signed-out experience if the account database is unavailable
  }
}

/** Save and report: depends on who is looking, so it streams in after the cached trail content. */
async function TrailActions({ slug }: { slug: string }) {
  const user = await currentUserOrNull();
  const saved = user ? await isSaved(getSql(), user.id, slug) : false;
  // Viewing a saved trail counts as having seen its current state.
  if (user && saved) await markSavedSeen(getSql(), user.id, slug, new Date());
  return (
    <>
      <SaveButton slug={slug} signedIn={Boolean(user)} initialSaved={saved} save={saveTrailAction} unsave={unsaveTrailAction} />
      <Link href={`/trails/${slug}/report`} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">
        Report an issue
      </Link>
    </>
  );
}

/** Riders and comments: per-viewer, so it streams in (queries run side by side) after the cached trail content. */
/** Reports from riders in the last two months, shown apart from the moderator-set condition. Nothing is shown when there are none. */
async function TrailRiderReports({ slug }: { slug: string }) {
  await connection();
  const now = new Date();
  const reports = await listConditionReports(getSql(), slug, now);
  return reports ? <RiderReports reports={reports} now={now} /> : null;
}

async function TrailCommunity({ slug, searchParams }: { slug: string; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const code = typeof sp.c === "string" ? sp.c.slice(0, 40) : undefined;
  await connection();
  const user = await currentUserOrNull();
  const [riddenSummary, comments, member] = await Promise.all([
    getRiddenSummary(getSql(), slug, user?.id ?? null),
    listComments(getSql(), slug, user?.id ?? null),
    user ? getMemberState(getSql(), user.id) : null,
  ]);
  const maxMonth = new Date().toISOString().slice(0, 7);
  return (
    <>
      <RiddenPanel slug={slug} summary={riddenSummary} signedIn={Boolean(user)} code={code} maxMonth={maxMonth} ownRiderId={member?.publicId ?? null} actions={{ mark: markRiddenAction, unmark: unmarkRiddenAction, ask: askRiderAction }} />
      <CommentsSection slug={slug} comments={comments} signedIn={Boolean(user)} code={code} actions={{ post: postCommentAction, edit: editCommentAction, remove: deleteCommentAction, report: reportCommentAction }} />
    </>
  );
}

export default async function TrailPage({ params, searchParams }: PageProps<"/trails/[slug]">) {
  const { slug } = await params;
  const trail = await getTrail(slug);
  if (!trail) notFound();
  const [media, route, videos] = await Promise.all([getTrailMedia(slug), getTrailRoute(slug), getTrailVideos(slug)]);
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
            <Suspense fallback={null}>
              <TrailRiderReports slug={slug} />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-64 rounded-3xl" />}>
              <TrailCommunity slug={slug} searchParams={searchParams} />
            </Suspense>
          </>
        }
        actions={
          <>
            <Suspense fallback={<Skeleton className="h-11 w-44" />}>
              <TrailActions slug={slug} />
            </Suspense>
            {/* Phones only. The app opens at this trail; where it is not installed nothing happens, so the link is a plain extra, never the only way in. */}
            <a href={`myto://trail/${slug}`} className="inline-flex min-h-11 items-center rounded-lg border border-ink px-4 text-sm md:hidden">Open in the Myto Moto app</a>
          </>
        }
      />
    </>
  );
}
