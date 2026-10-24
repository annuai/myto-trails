"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { deleteComment, editComment, postComment, reportContent } from "@/server/community/comments";
import { markRidden, unmarkRidden } from "@/server/community/ridden";

const text = (f: FormData, k: string) => String(f.get(k) ?? "");

async function signedIn(slug: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/trails/${slug}`)}`);
  if (!user.confirmed) redirect(`/welcome?next=${encodeURIComponent(`/trails/${slug}`)}`);
  return user;
}

const back = (slug: string, result: string, anchor: string): never => redirect(`/trails/${encodeURIComponent(slug)}?c=${encodeURIComponent(result)}#${anchor}`);

export async function markRiddenAction(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const user = await signedIn(slug);
  const r = await markRidden(getSql(), { userId: user.id, slug, month: text(formData, "month") || null, bike: text(formData, "bike"), note: text(formData, "note"), now: new Date() });
  back(slug, r.ok ? "ridden" : `ridden_${r.reason}`, "riders");
}

export async function unmarkRiddenAction(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const user = await signedIn(slug);
  await unmarkRidden(getSql(), { userId: user.id, slug });
  back(slug, "unridden", "riders");
}

export async function postCommentAction(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const user = await signedIn(slug);
  const r = await postComment(getSql(), { userId: user.id, slug, body: text(formData, "body"), tag: text(formData, "tag") || null, parentId: text(formData, "parentId") || null });
  back(slug, r.ok ? (r.status === "pending" ? "comment_pending" : "comment_posted") : `comment_${r.reason}`, "comments");
}

export async function editCommentAction(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const user = await signedIn(slug);
  const r = await editComment(getSql(), { userId: user.id, commentId: text(formData, "commentId"), body: text(formData, "body"), now: new Date() });
  back(slug, r.ok ? "comment_edited" : `comment_${r.reason}`, "comments");
}

export async function deleteCommentAction(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const user = await signedIn(slug);
  await deleteComment(getSql(), { userId: user.id, commentId: text(formData, "commentId") });
  back(slug, "comment_deleted", "comments");
}

export async function reportCommentAction(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const user = await signedIn(slug);
  const r = await reportContent(getSql(), { userId: user.id, subjectType: "comment", subjectId: text(formData, "commentId"), reason: text(formData, "reason") });
  back(slug, r.ok ? "comment_reported" : `comment_${r.reason}`, "comments");
}
