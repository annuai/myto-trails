import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RouteMap } from "@/features/map/RouteMap";
import { ElevationProfile } from "@/features/trail/ElevationProfile";
import { getSql } from "@/server/db/client";
import { getReview, REASON_CODES } from "@/server/moderation/decisions";
import { requireModerator } from "@/server/moderation/session";
import { decideAction } from "../actions";

export const instant = false;
export const metadata: Metadata = { title: "Review", robots: { index: false, follow: false } };

const label = (v: string) => v.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
const btn = "min-h-12 rounded-md px-5 text-sm font-medium";
const input = "min-h-12 w-full rounded-sm border border-foreground/40 bg-background px-3";

export default async function ReviewPage({ params, searchParams }: PageProps<"/moderate/[id]">) {
  const { id } = await params;
  const actor = await requireModerator(`/moderate/${id}`);
  const r = await getReview(getSql(), actor.id, id);
  if (!r.ok) notFound();
  const v = r.review;
  const sp = await searchParams;
  const b = v.data.basics;
  const d = v.data.details;
  const canDecide = v.status === "submitted";

  return (
    <article className="flex max-w-3xl flex-col gap-8 py-8">
      <header className="flex flex-col gap-2">
        <Link href="/moderate" className="text-sm underline underline-offset-4">Back to the queue</Link>
        <h1 className="text-3xl font-semibold leading-tight">{v.title}</h1>
        <p className="text-muted">By {v.contributorName} · version {v.version} · {v.status.replaceAll("_", " ")}{v.submittedAt ? ` · submitted ${new Date(v.submittedAt).toLocaleDateString("en-GB")}` : ""}</p>
      </header>
      {typeof sp.result === "string" ? <p role="alert" className="border-l-4 border-status-stop py-1 pl-4 font-medium">That did not go through: {sp.result.replaceAll("_", " ")}.</p> : null}
      {v.needsSecondApproval ? <p role="status" className="border-l-4 border-status-caution py-1 pl-4 font-medium">Restricted or protected-area trail: two different moderators must approve.{v.firstApproverName ? ` First approval: ${v.firstApproverName}.` : ""}</p> : null}
      {v.duplicates.length > 0 ? <p role="status" className="border-l-4 border-status-caution py-1 pl-4">The contributor was warned about {v.duplicates.length} possible duplicate(s): {JSON.stringify(v.duplicates.map((x) => (x as { name: string }).name))}.</p> : null}

      <section aria-labelledby="content" className="flex flex-col gap-3">
        <h2 id="content" className="text-xl font-semibold">Content</h2>
        <p>{b?.summary}</p>
        <p className="text-sm text-muted">{b?.nearestTown}, {b?.district}, {b?.state} · start {v.data.route?.startPoint.lat}, {v.data.route?.startPoint.lon} · {v.data.route?.routeShape?.replaceAll("_", " ")}</p>
        <p className="text-sm">Difficulty {d?.difficulty} · terrain {d?.terrain.join(", ")} · hazards {d?.hazards.join(", ") || "none listed"}</p>
        {d?.description ? <p className="whitespace-pre-line">{d.description}</p> : null}
        {v.data.review?.safetyNotes ? <p><span className="font-medium">Safety notes: </span>{v.data.review.safetyNotes}</p> : null}
        {v.contributorNote ? <p><span className="font-medium">Note to moderator: </span>{v.contributorNote}</p> : null}
      </section>

      <section aria-labelledby="access" className="flex flex-col gap-3">
        <h2 id="access" className="text-xl font-semibold">Access claim</h2>
        <p>{label(v.access.accessClass)} · basis: {label(v.access.basis)} · level: {label(v.access.level)}{v.access.restrictions.length ? ` · ${v.access.restrictions.map(label).join(", ")}` : ""}</p>
        {v.access.permissionInstructions ? <p>Public instructions: {v.access.permissionInstructions}</p> : null}
        {v.access.permissionContact ? <p>Contact (moderators only): {v.access.permissionContact}</p> : null}
        <ul className="list-disc pl-5">
          {v.access.evidence.map((e, i) => <li key={i}>{label(e.kind)}: {e.description}{e.url ? <> (<a href={e.url} target="_blank" rel="noreferrer noopener" className="underline underline-offset-4">link</a>)</> : null}</li>)}
          {v.access.evidence.length === 0 ? <li>No sources given.</li> : null}
        </ul>
      </section>

      {v.route ? (
        <section aria-labelledby="route" className="flex flex-col gap-3">
          <h2 id="route" className="text-xl font-semibold">Route</h2>
          <p>{v.route.distanceKm} km · {v.route.pointCount} points{v.route.elevGainM !== null ? ` · +${v.route.elevGainM} m` : ""}</p>
          <RouteMap line={v.route.line} />
          <ElevationProfile profile={v.route.profile} />
        </section>
      ) : null}

      {v.photos.length > 0 ? (
        <section aria-labelledby="photos" className="flex flex-col gap-3">
          <h2 id="photos" className="text-xl font-semibold">Photos</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {v.photos.map((p, i) => (
              <li key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.altText} className="h-auto w-full" loading="lazy" />
                <p className="text-sm text-muted">{p.role} · {p.altText}{p.credit ? ` · ${p.credit}` : ""}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {v.history.length > 0 ? (
        <section aria-labelledby="history">
          <h2 id="history" className="text-xl font-semibold">History</h2>
          <ul className="mt-2 list-disc pl-5">{v.history.map((h, i) => <li key={i}>{new Date(h.createdAt).toLocaleString("en-GB")}: {label(h.action)}{h.reasonCode ? ` (${label(h.reasonCode)})` : ""}{h.comment ? `: ${h.comment}` : ""}</li>)}</ul>
        </section>
      ) : null}

      {canDecide ? (
        <section aria-labelledby="decide" className="flex flex-col gap-8">
          <h2 id="decide" className="text-xl font-semibold">Decision</h2>
          <form action={decideAction} className="flex flex-col gap-3 border border-border p-4">
            <input type="hidden" name="id" value={v.submissionId} />
            <h3 className="font-medium">Approve</h3>
            <label className="text-sm font-medium" htmlFor="sensitivity">Sensitivity</label>
            <select id="sensitivity" name="sensitivity" defaultValue="standard" className={input}>
              <option value="standard">Standard</option><option value="sensitive">Sensitive (public point only)</option><option value="restricted_geometry">Restricted geometry</option>
            </select>
            <p className="text-sm text-muted">For a sensitive trail, give the public point shown on maps (not the real start).</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="text-sm font-medium" htmlFor="lat">Public latitude</label><input id="lat" name="lat" inputMode="decimal" className={input} /></div>
              <div><label className="text-sm font-medium" htmlFor="lon">Public longitude</label><input id="lon" name="lon" inputMode="decimal" className={input} /></div>
            </div>
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="publishGpx" defaultChecked className="size-5" /> Offer the GPX download</label>
            <button type="submit" name="intent" value="approve" className={`${btn} self-start bg-accent text-white hover:bg-accent-hover`}>{v.needsSecondApproval ? "Approve (counts as one of two)" : "Approve and publish"}</button>
          </form>

          <form action={decideAction} className="flex flex-col gap-3 border border-border p-4">
            <input type="hidden" name="id" value={v.submissionId} />
            <h3 className="font-medium">Request changes</h3>
            <label className="text-sm font-medium" htmlFor="comment-changes">What needs to change (the contributor sees this)</label>
            <textarea id="comment-changes" name="comment" rows={4} minLength={10} maxLength={4000} className={`${input} py-2`} />
            {(["basics", "route", "details", "access", "photos", "review"] as const).map((k) => (
              <div key={k}><label className="text-sm" htmlFor={`field_${k}`}>Note for step: {label(k)} (optional)</label><input id={`field_${k}`} name={`field_${k}`} maxLength={500} className={input} /></div>
            ))}
            <button type="submit" name="intent" value="changes" className={`${btn} self-start border border-foreground`}>Send back for changes</button>
          </form>

          <form action={decideAction} className="flex flex-col gap-3 border border-border p-4">
            <input type="hidden" name="id" value={v.submissionId} />
            <h3 className="font-medium">Reject</h3>
            <label className="text-sm font-medium" htmlFor="reasonCode">Reason</label>
            <select id="reasonCode" name="reasonCode" className={input} required>
              <option value="">Choose…</option>
              {REASON_CODES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
            </select>
            <label className="text-sm font-medium" htmlFor="comment-reject">Note to the contributor (optional)</label>
            <textarea id="comment-reject" name="comment" rows={3} maxLength={4000} className={`${input} py-2`} />
            <button type="submit" name="intent" value="reject" className={`${btn} self-start border border-status-stop text-status-stop`}>Reject</button>
          </form>
        </section>
      ) : <p className="text-muted">This submission is {v.status.replaceAll("_", " ")}; no decision is pending.</p>}
      <p><Link href={`/moderate/trails/${v.trailSlug}`} className="underline underline-offset-4">Trail controls (verify access, condition, unpublish)</Link></p>
    </article>
  );
}
