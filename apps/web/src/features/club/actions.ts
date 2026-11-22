"use server";
// Server actions of the club pages. Each one needs a declared member, runs the matching club function and redirects back with a short note
// (see messages.ts).

import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/site";
import { getCurrentUser, getEmailSender } from "@/server/auth/session";
import { clubAdminIds, createClub, decideJoinRequest, hidePost, leaveClub, postToClub, removeMember, requestJoin, respondToRide, setClubCover, setMemberRole, withdrawJoinRequest } from "@/server/community/clubs";
import { joinDecisionEmail, joinRequestEmail } from "@/server/community/emails";
import { getSql } from "@/server/db/client";
import { sendToUser } from "@/server/moderation/notify";

const text = (f: FormData, k: string) => String(f.get(k) ?? "");
const site = () => getSiteUrl(process.env);

async function member(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (!user.confirmed) redirect(`/welcome?next=${encodeURIComponent(next)}`);
  return user;
}
const clubPath = (id: string) => `/club/${encodeURIComponent(id)}`;
const to = (id: string, code: string, hash = ""): never => redirect(`${clubPath(id)}?n=${encodeURIComponent(code)}${hash}`);

/** Starts a club. */
export async function createClubAction(formData: FormData): Promise<void> {
  const user = await member("/club");
  const r = await createClub(getSql(), { userId: user.id, name: text(formData, "name"), description: text(formData, "description"), womenOnly: formData.get("womenOnly") === "on", now: new Date() });
  if (r.ok) redirect(`${clubPath(r.clubId)}?n=created`);
  redirect(`/club?n=create_${r.reason}`);
}

/** Asks to join a club. */
export async function requestJoinAction(formData: FormData): Promise<void> {
  const id = text(formData, "clubId");
  const user = await member(clubPath(id));
  const sql = getSql();
  const r = await requestJoin(sql, { userId: user.id, clubId: id, phone: text(formData, "phone"), message: text(formData, "message"), now: new Date() });
  if (r.ok) {
    const [{ name }] = await sql`select name from club where public_id = ${id}`;
    for (const adminId of await clubAdminIds(sql, id)) await sendToUser(sql, getEmailSender(), adminId, joinRequestEmail(user.displayName, String(name), `${site()}${clubPath(id)}`));
  }
  to(id, r.ok ? "requested" : `join_${r.reason}`);
}

/** Takes back a request to join. */
export async function withdrawJoinAction(formData: FormData): Promise<void> {
  const id = text(formData, "clubId");
  const user = await member(clubPath(id));
  await withdrawJoinRequest(getSql(), { userId: user.id, clubId: id });
  to(id, "withdrawn");
}

/** An admin accepts or declines a join request. */
export async function decideJoinAction(formData: FormData): Promise<void> {
  const id = text(formData, "clubId");
  const user = await member(clubPath(id));
  const sql = getSql();
  const accept = text(formData, "decision") === "accept";
  const r = await decideJoinRequest(sql, { userId: user.id, requestId: text(formData, "requestId"), accept, now: new Date() });
  if (r.ok) await sendToUser(sql, getEmailSender(), r.applicantId, joinDecisionEmail(r.clubName, accept, `${site()}${clubPath(id)}`));
  to(id, r.ok ? (accept ? "accepted" : "declined") : `err_${r.reason}`, "#requests");
}

/** Leaves a club. */
export async function leaveClubAction(formData: FormData): Promise<void> {
  const id = text(formData, "clubId");
  const user = await member(clubPath(id));
  const r = await leaveClub(getSql(), { userId: user.id, clubId: id });
  if (r.ok) redirect("/club?n=left");
  to(id, `err_${r.reason}`);
}

/** An admin removes a member. */
export async function removeMemberAction(formData: FormData): Promise<void> {
  const id = text(formData, "clubId");
  const user = await member(clubPath(id));
  const r = await removeMember(getSql(), { userId: user.id, clubId: id, memberId: text(formData, "memberId") });
  to(id, r.ok ? "removed" : `err_${r.reason}`, "#members");
}

/** An admin changes a member's role. */
export async function setRoleAction(formData: FormData): Promise<void> {
  const id = text(formData, "clubId");
  const user = await member(clubPath(id));
  const r = await setMemberRole(getSql(), { userId: user.id, clubId: id, memberId: text(formData, "memberId"), role: text(formData, "role") === "admin" ? "admin" : "member" });
  to(id, r.ok ? "role_changed" : `err_${r.reason}`, "#members");
}

/** Ride times are typed as India time (IST, +05:30) in a date and time field. */
const IST = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;

/** Posts to a club's feed, or replies to a post. */
export async function postAction(formData: FormData): Promise<void> {
  const id = text(formData, "clubId");
  const user = await member(clubPath(id));
  const when = text(formData, "rideAt");
  const m = IST.exec(when);
  const at = m ? new Date(`${m[1]}T${m[2]}:00+05:30`) : null;
  if (when && (!at || Number.isNaN(at.getTime()))) to(id, "post_invalid", "#feed");
  const r = await postToClub(getSql(), {
    userId: user.id, clubId: id, body: text(formData, "body"), parentId: text(formData, "parentId") || null,
    ridePlan: at ? { at, place: text(formData, "place") } : null, now: new Date(),
  });
  to(id, r.ok ? "posted" : `post_${r.reason}`, "#feed");
}

/** Answers a ride plan with going or maybe. */
export async function respondAction(formData: FormData): Promise<void> {
  const id = text(formData, "clubId");
  const user = await member(clubPath(id));
  const v = text(formData, "response");
  const r = await respondToRide(getSql(), { userId: user.id, postId: text(formData, "postId"), response: v === "going" || v === "maybe" ? v : null });
  to(id, r.ok ? "responded" : `err_${r.reason}`, "#feed");
}

/** Hides a club post. */
export async function hidePostAction(formData: FormData): Promise<void> {
  const id = text(formData, "clubId");
  const user = await member(clubPath(id));
  const r = await hidePost(getSql(), { userId: user.id, postId: text(formData, "postId") });
  to(id, r.ok ? "hidden" : `err_${r.reason}`, "#feed");
}

/** Sets a club's cover picture. */
export async function setCoverAction(formData: FormData): Promise<void> {
  const id = text(formData, "clubId");
  const user = await member(clubPath(id));
  const mediaId = text(formData, "mediaId");
  const remove = formData.get("remove") === "1";
  if (!remove && !mediaId) to(id, "cover_invalid");
  const r = await setClubCover(getSql(), { userId: user.id, clubId: id, mediaId: remove ? null : mediaId });
  to(id, r.ok ? "cover_saved" : r.reason === "not_admin" ? "err_not_admin" : "cover_invalid");
}
