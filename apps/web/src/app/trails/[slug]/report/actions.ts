"use server";

import { validateReport } from "@moto-trails/domain";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { ReportState } from "@/features/report/ReportFormClient";
import { getCurrentUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { createReport } from "@/server/queries/reports";

export async function reportAction(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const slug = String(formData.get("slug") ?? "");
  const type = String(formData.get("type") ?? "");
  const details = String(formData.get("details") ?? "");
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/trails/${slug}/report`)}`);

  const checked = validateReport({ type, details });
  if (!checked.ok) return { errors: checked.errors, values: { type, details } };

  const result = await createReport(getSql(), { userId: user.id, slug, type: checked.value.type, details: checked.value.details });
  if (!result.ok) {
    const message =
      result.reason === "rate_limited" ? "You've sent a lot of reports today. Please try again tomorrow."
      : result.reason === "not_found" ? "That trail is no longer available."
      : "We couldn't send your report. Please check it and try again.";
    return { message, values: { type, details } };
  }
  updateTag(`trail:${slug}`); // show a reported closure on the trail page straight away
  redirect(`/trails/${encodeURIComponent(slug)}/report?ref=${result.ref}`);
}
