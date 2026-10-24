"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getEmailSender, getCurrentUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { getSiteUrl } from "@/lib/site";
import { release, verifyAccess, setCondition, unpublish } from "@/server/moderation/access";
import { approve, rejectSubmission, requestChanges, REASON_CODES, type ReasonCode } from "@/server/moderation/decisions";
import { decisionEmail, reportOutcomeEmail, sendToUser } from "@/server/moderation/notify";
import { resolveReport, type ReportOutcome } from "@/server/moderation/reports";
import { moderateComment, type CommentAction } from "@/server/moderation/comments";
import { grantRole, revokeRole, setSuspended } from "@/server/moderation/users";

const text = (f: FormData, k: string) => String(f.get(k) ?? "");
const num = (f: FormData, k: string) => {
  const raw = text(f, k).trim();
  const n = raw === "" ? NaN : Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

async function actorId(next: string): Promise<string> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return user.id;
}

const refresh = (slug?: string) => {
  updateTag("trails");
  if (slug) updateTag(`trail:${slug}`);
};

function back(path: string, status: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}result=${encodeURIComponent(status)}`);
}

export async function decideAction(formData: FormData): Promise<void> {
  const id = text(formData, "id");
  const path = `/moderate/${encodeURIComponent(id)}`;
  const actor = await actorId(path);
  const intent = text(formData, "intent");
  const sql = getSql();
  let result;
  if (intent === "changes") {
    result = await requestChanges(sql, { actorId: actor, submissionId: id, comment: text(formData, "comment"), fieldComments: Object.fromEntries(["basics", "route", "details", "access", "photos", "review"].map((k) => [k, text(formData, `field_${k}`)])) });
  } else if (intent === "reject") {
    const reasonCode = text(formData, "reasonCode") as ReasonCode;
    result = await rejectSubmission(sql, { actorId: actor, submissionId: id, reasonCode: (REASON_CODES as readonly string[]).includes(reasonCode) ? reasonCode : ("" as ReasonCode), comment: text(formData, "comment") });
  } else if (intent === "approve") {
    const lat = num(formData, "lat");
    const lon = num(formData, "lon");
    const sensitivity = text(formData, "sensitivity") as "standard" | "sensitive" | "restricted_geometry";
    result = await approve(sql, { actorId: actor, submissionId: id, sensitivity, publicPoint: lat !== undefined && lon !== undefined ? { lat, lon } : undefined, publishGpx: text(formData, "publishGpx") === "yes" });
  } else {
    back(path, "invalid");
  }
  if (!result.ok) back(path, result.reason);
  // A first approval of two is not news for the contributor: only a published trail or a real decision is.
  if (result.published !== false) await sendToUser(sql, getEmailSender(), result.notify.contributorId, decisionEmail(result.notify, getSiteUrl(process.env)));
  if (result.notify.slug) refresh(result.notify.slug);
  redirect(`/moderate?done=${intent}`);
}

export async function trailActionAction(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const trailId = text(formData, "trailId");
  const path = `/moderate/trails/${encodeURIComponent(slug)}`;
  const actor = await actorId(path);
  const intent = text(formData, "intent");
  const sql = getSql();
  const now = new Date();
  let ok = false;
  let reason = "invalid";
  let actedSlug = slug;
  if (intent === "verify") {
    const kind = text(formData, "evidenceKind") as "official_document";
    const r = await verifyAccess(sql, {
      actorId: actor, trailId, now, level: text(formData, "level") as "moderator_verified", authority: text(formData, "authority") || undefined,
      evidence: text(formData, "evidenceDescription").trim() ? [{ kind, description: text(formData, "evidenceDescription"), url: text(formData, "evidenceUrl") || undefined }] : [],
      validUntil: text(formData, "validUntil") || undefined, note: text(formData, "note") || undefined,
    });
    ok = r.ok;
    if (!r.ok) reason = r.reason;
  } else if (intent === "condition") {
    const r = await setCondition(sql, { actorId: actor, trailId, now, status: text(formData, "status") as "open", reason: (text(formData, "reason") || undefined) as undefined, expectedUntil: text(formData, "expectedUntil") || undefined, note: text(formData, "note") || undefined });
    ok = r.ok;
    if (r.ok) actedSlug = r.slug;
    if (!r.ok) reason = r.reason;
  } else if (intent === "unpublish") {
    const r = await unpublish(sql, { actorId: actor, trailId, reason: text(formData, "reason") });
    ok = r.ok;
    if (r.ok) actedSlug = r.slug;
    if (!r.ok) reason = r.reason;
  } else if (intent === "release") {
    const r = await release(sql, { actorId: actor, trailId, reason: text(formData, "reason") });
    ok = r.ok;
    if (r.ok) actedSlug = r.slug;
    if (!r.ok) reason = r.reason;
  }
  if (!ok) back(path, reason);
  refresh(actedSlug);
  back(path, "saved");
}

export async function resolveReportAction(formData: FormData): Promise<void> {
  const actor = await actorId("/moderate/reports");
  const sql = getSql();
  const status = text(formData, "conditionStatus");
  const r = await resolveReport(sql, {
    actorId: actor, reportId: text(formData, "reportId"), outcome: text(formData, "outcome") as ReportOutcome, note: text(formData, "note"), now: new Date(),
    condition: status ? { status: status as "open", expectedUntil: text(formData, "expectedUntil") || undefined, reason: (text(formData, "reason") || undefined) as undefined } : undefined,
  });
  if (!r.ok) back("/moderate/reports", r.reason);
  await sendToUser(sql, getEmailSender(), r.notify.reporterId, reportOutcomeEmail(r.notify, getSiteUrl(process.env)));
  refresh(r.trailSlug);
  back("/moderate/reports", "saved");
}

export async function roleAction(formData: FormData): Promise<void> {
  const actor = await actorId("/moderate/users");
  const sql = getSql();
  const intent = text(formData, "intent");
  let r: { ok: boolean; reason?: string };
  if (intent === "grant") r = await grantRole(sql, { actorId: actor, email: text(formData, "email"), role: text(formData, "role") as "moderator" });
  else if (intent === "revoke") r = await revokeRole(sql, { actorId: actor, userId: text(formData, "userId"), role: text(formData, "role") as "moderator" });
  else r = await setSuspended(sql, { actorId: actor, userId: text(formData, "userId"), suspended: intent === "suspend", reason: text(formData, "reason") });
  back("/moderate/users", r.ok ? "saved" : (r.reason ?? "invalid"));
}

export async function commentModerationAction(formData: FormData): Promise<void> {
  const actor = await actorId("/moderate/comments");
  const r = await moderateComment(getSql(), { actorId: actor, commentId: text(formData, "commentId"), action: text(formData, "action") as CommentAction, reason: text(formData, "reason") });
  if (!r.ok) back("/moderate/comments", r.reason);
  updateTag(`trail:${r.trailSlug}`);
  back("/moderate/comments", "saved");
}
