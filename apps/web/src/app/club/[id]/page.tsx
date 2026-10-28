import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BikeImage } from "@/features/bikes/BikeImage";
import { connection } from "next/server";
import {
  decideJoinAction, hidePostAction, leaveClubAction, postAction, removeMemberAction, requestJoinAction, respondAction, setCoverAction, setRoleAction, withdrawJoinAction,
} from "@/features/club/actions";
import { CLUB_NOTES } from "@/features/club/messages";
import { requireUser } from "@/server/auth/session";
import { getClub, listFeed, listJoinRequests, listMembers, type FeedPost } from "@/server/community/clubs";
import { getSql } from "@/server/db/client";
import { ImagePicker } from "@/features/media/ImagePicker";
import { Avatar } from "@/ui/Avatar/Avatar";
import { ClubCover } from "@/ui/ClubCover/ClubCover";
import { SubmitButton } from "@/ui/SubmitButton/SubmitButton";

export const instant = false;
export const metadata: Metadata = { title: "Club", robots: { index: false, follow: false } };

const input = "w-full rounded-lg border border-foreground/40 bg-background px-3 py-2";
const btn = "min-h-11 rounded-lg px-4 text-sm font-medium";
const primary = `${btn} bg-accent text-white hover:bg-accent-hover`;
const outline = `${btn} border border-foreground`;
const when = (d: Date) => d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export default async function ClubDetailPage({ params, searchParams }: PageProps<"/club/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/club/${id}`);
  const sp = await searchParams;
  await connection();
  const sql = getSql();
  const club = await getClub(sql, { userId: user.id, clubId: id });
  if (!club) notFound();
  const isMember = club.role !== null;
  const isAdmin = club.role === "admin";
  const [feed, members, requests] = await Promise.all([
    isMember ? listFeed(sql, { userId: user.id, clubId: id }) : null,
    isMember ? listMembers(sql, { userId: user.id, clubId: id }) : null,
    isAdmin ? listJoinRequests(sql, { userId: user.id, clubId: id }) : null,
  ]);
  const note = typeof sp.n === "string" ? CLUB_NOTES[sp.n] : undefined;
  return (
    <section className="flex max-w-3xl flex-col gap-8 py-(--space-section)">
      <Link href="/club" className="text-sm underline underline-offset-4">All clubs</Link>
      <ClubCover name={club.name} url={club.coverUrl} />
      {isAdmin ? (
        <details className="-mt-4">
          <summary className="cursor-pointer text-sm font-medium underline underline-offset-4">Change cover image</summary>
          <form action={setCoverAction} className="mt-3 flex max-w-md flex-col gap-3 rounded-3xl bg-card-cream p-5">
            <input type="hidden" name="clubId" value={id} />
            <ImagePicker name="mediaId" label="Cover image" hint="A wide photo works best. JPEG, PNG, WebP or AVIF, up to 10 MB." />
            <div className="flex flex-wrap gap-3">
              <SubmitButton className={primary}>Save cover</SubmitButton>
              {club.coverUrl ? <SubmitButton name="remove" value="1" className={outline}>Remove cover</SubmitButton> : null}
            </div>
          </form>
        </details>
      ) : null}
      <div className="flex flex-col gap-2">
        <h1 className="display-md break-words">{club.name}</h1>
        <p className="text-sm text-muted">{club.memberCount} {club.memberCount === 1 ? "member" : "members"}{club.womenOnly ? " · Women only" : ""}</p>
        {club.description ? <p className="max-w-prose whitespace-pre-line break-words">{club.description}</p> : null}
      </div>
      {note ? <p role="status" className={`border-l-4 py-1 pl-4 font-medium ${note.tone === "good" ? "border-status-good" : "border-status-stop"}`}>{note.text}</p> : null}

      {!isMember ? (
        club.requested ? (
          <form action={withdrawJoinAction} className="flex flex-col gap-3 rounded-3xl bg-card-cream p-6">
            <input type="hidden" name="clubId" value={id} />
            <p className="font-medium">Your request is waiting for the club&apos;s admins.</p>
            <SubmitButton className={`${outline} self-start`}>Withdraw request and delete my number</SubmitButton>
          </form>
        ) : (
          <form action={requestJoinAction} className="flex max-w-xl flex-col gap-3 rounded-3xl bg-card-cream p-6">
            <input type="hidden" name="clubId" value={id} />
            <h2 className="text-xl font-semibold">Ask to join</h2>
            <label htmlFor="phone" className="text-sm font-medium">Your phone number</label>
            <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required className={input} />
            <p className="text-sm text-muted">Only this club&apos;s admins can see your number, so they know who they are letting in. It is deleted a week after they decide, or straight away if you withdraw.</p>
            <label htmlFor="message" className="text-sm font-medium">A line about you <span className="text-muted">(optional)</span></label>
            <textarea id="message" name="message" rows={2} maxLength={300} className={input} />
            <SubmitButton className={`${primary} self-start`}>Send request</SubmitButton>
          </form>
        )
      ) : null}

      {isAdmin && requests ? (
        <div id="requests" className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Join requests</h2>
          {requests.length === 0 ? <p className="text-muted">No requests.</p> : (
            <ul className="flex flex-col gap-3">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 rounded-3xl bg-card-cream p-5">
                  <p className="font-medium">{r.name} <span className="text-sm font-normal text-muted">· {day(r.createdAt)} · {r.status}</span></p>
                  {r.message ? <p className="whitespace-pre-line break-words">{r.message}</p> : null}
                  {r.phone ? <p className="font-mono">{r.phone}</p> : <p className="text-sm text-muted">Phone number deleted.</p>}
                  {r.status === "pending" ? (
                    <form action={decideJoinAction} className="flex gap-2">
                      <input type="hidden" name="clubId" value={id} />
                      <input type="hidden" name="requestId" value={r.id} />
                      <SubmitButton name="decision" value="accept" className={primary}>Accept</SubmitButton>
                      <SubmitButton name="decision" value="decline" className={outline}>Decline</SubmitButton>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted">Phone numbers are for deciding who joins. Please do not share them. They are deleted 7 days after you decide.</p>
        </div>
      ) : null}

      {isMember && feed ? (
        <div id="feed" className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Posts and rides</h2>
          <form action={postAction} className="flex flex-col gap-3 rounded-3xl bg-card-cream p-5">
            <input type="hidden" name="clubId" value={id} />
            <label htmlFor="body" className="text-sm font-medium">Post something, or plan a ride</label>
            <textarea id="body" name="body" required rows={3} maxLength={1000} className={input} />
            <details>
              <summary className="cursor-pointer text-sm font-medium">Make it a ride plan</summary>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">Date and time (India time)<input type="datetime-local" name="rideAt" className={input} /></label>
                <label className="flex flex-col gap-1 text-sm">Meeting place<input name="place" maxLength={120} className={input} /></label>
              </div>
            </details>
            <SubmitButton className={`${primary} self-start`}>Post</SubmitButton>
          </form>
          {feed.posts.length === 0 ? <p className="text-muted">Nothing here yet.</p> : (
            <ul className="flex flex-col gap-4">{feed.posts.map((p) => <Post key={p.id} p={p} clubId={id} canModerate={isAdmin} />)}</ul>
          )}
        </div>
      ) : null}

      {isMember && members ? (
        <div id="members" className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Members</h2>
          <ul className="flex flex-col gap-2">
            {members.map((m) => (
              <li key={m.handle} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-card-cream px-4 py-3">
                <span className="flex items-center gap-3">
                  <Avatar name={m.name} url={m.avatarUrl} size={44} />
                  <span className="flex flex-col">
                    <span>{m.name}{m.role === "admin" ? <span className="ml-2 text-sm text-muted">Admin</span> : null}</span>
                    {m.bike ? <span className="text-sm text-muted">{m.bike.name}{m.bike.modelYear ? ` · ${m.bike.modelYear}` : ""}</span> : null}
                  </span>
                  {m.bike?.photoUrl ? <BikeImage own={m.bike.ownPhoto ? m.bike.photoUrl : null} preset={m.bike.ownPhoto ? null : m.bike.photoUrl} want={400} alt={`${m.name}'s ${m.bike.name}`} className="w-20 shrink-0" /> : null}
                </span>
                {isAdmin && m.handle !== club.myHandle ? (
                  <span className="flex gap-2">
                    <form action={setRoleAction}>
                      <input type="hidden" name="clubId" value={id} /><input type="hidden" name="memberId" value={m.handle} />
                      <input type="hidden" name="role" value={m.role === "admin" ? "member" : "admin"} />
                      <SubmitButton className={outline}>{m.role === "admin" ? "Make member" : "Make admin"}</SubmitButton>
                    </form>
                    <form action={removeMemberAction}>
                      <input type="hidden" name="clubId" value={id} /><input type="hidden" name="memberId" value={m.handle} />
                      <SubmitButton className={outline}>Remove</SubmitButton>
                    </form>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <form action={leaveClubAction}>
            <input type="hidden" name="clubId" value={id} />
            <SubmitButton className={outline}>Leave club</SubmitButton>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function Post({ p, clubId, canModerate }: { p: FeedPost; clubId: string; canModerate: boolean }) {
  return (
    <li className="flex flex-col gap-3 rounded-3xl bg-card-cream p-5">
      <p className="text-sm text-muted">{p.authorName} · {day(p.createdAt)}{p.kind === "ride_plan" ? " · Ride plan" : ""}</p>
      {p.kind === "ride_plan" && p.at ? <p className="font-semibold">{when(p.at)} · {p.place}</p> : null}
      <p className="whitespace-pre-line break-words">{p.body}</p>
      {p.kind === "ride_plan" ? (
        <form action={respondAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="clubId" value={clubId} /><input type="hidden" name="postId" value={p.id} />
          <SubmitButton name="response" value="going" aria-pressed={p.myResponse === "going"} className={p.myResponse === "going" ? primary : outline}>Going ({p.going})</SubmitButton>
          <SubmitButton name="response" value="maybe" aria-pressed={p.myResponse === "maybe"} className={p.myResponse === "maybe" ? primary : outline}>Maybe ({p.maybe})</SubmitButton>
          {p.myResponse ? <SubmitButton name="response" value="" className="text-sm underline underline-offset-4">Clear</SubmitButton> : null}
        </form>
      ) : null}
      {p.replies.length ? (
        <ul className="flex flex-col gap-2 border-l-2 border-foreground/20 pl-4">
          {p.replies.map((r) => <li key={r.id}><span className="text-sm text-muted">{r.authorName}: </span><span className="whitespace-pre-line break-words">{r.body}</span></li>)}
        </ul>
      ) : null}
      <form action={postAction} className="flex gap-2">
        <input type="hidden" name="clubId" value={clubId} /><input type="hidden" name="parentId" value={p.id} />
        <label className="sr-only" htmlFor={`reply-${p.id}`}>Reply</label>
        <input id={`reply-${p.id}`} name="body" required maxLength={1000} placeholder="Reply" className={input} />
        <SubmitButton className={outline}>Reply</SubmitButton>
      </form>
      {p.mine || canModerate ? (
        <form action={hidePostAction}>
          <input type="hidden" name="clubId" value={clubId} /><input type="hidden" name="postId" value={p.id} />
          <SubmitButton className="text-sm underline underline-offset-4">Remove post</SubmitButton>
        </form>
      ) : null}
    </li>
  );
}
