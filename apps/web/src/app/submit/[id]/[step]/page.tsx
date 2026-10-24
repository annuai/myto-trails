import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Stepper } from "@/features/submit/Stepper";
import { WizardForm } from "@/features/submit/WizardForm";
import type { PhotoRow } from "@/features/submit/PhotoUpload";
import { STEPS, STEP_FIELDS, MAX_PHOTOS, type Step } from "@/server/submissions/schema";
import { requireUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { getMine, listStates, photoPreviews } from "@/server/submissions/service";
import { attachRouteAction, autosaveStepAction, saveStepAction } from "../../actions";

export const instant = false;
export const metadata: Metadata = { title: "Submit a trail", robots: { index: false, follow: false } };

const KEYS = { 1: "basics", 2: "route", 3: "details", 4: "access", 5: "photos", 6: "review" } as const;

export default async function StepPage({ params }: PageProps<"/submit/[id]/[step]">) {
  const { id, step: stepParam } = await params;
  const step = Number(stepParam);
  if (!(STEPS as readonly number[]).includes(step)) notFound();
  const user = await requireUser(`/submit/${id}/${step}`);
  const sql = getSql();
  const submission = await getMine(sql, user.id, id);
  if (!submission) notFound();
  if (!["draft", "changes_requested"].includes(submission.status)) redirect(`/account/contributions/${id}`);

  const key = KEYS[step as Step];
  const saved = (submission.drafts[key] ?? submission.data[key] ?? (key === "photos" ? [] : {})) as Record<string, unknown> | Record<string, unknown>[];
  const values = Array.isArray(saved) ? {} : saved;
  const photoRows = Array.isArray(saved) ? saved : [];
  const previews = await photoPreviews(sql, user.id, photoRows.map((p) => String(p.mediaId)));
  const photos: PhotoRow[] = photoRows.map((p) => ({
    mediaId: String(p.mediaId), thumbUrl: previews[String(p.mediaId)] ?? "", altText: String(p.altText ?? ""), caption: String(p.caption ?? ""), credit: String(p.credit ?? ""),
  }));
  const states = step === 1 ? await listStates(sql) : [];

  return (
    <section className="flex flex-col gap-8 py-8">
      <h1 className="text-3xl font-semibold leading-tight">{STEP_FIELDS[step as Step]}</h1>
      <Stepper id={id} current={step as Step} furthest={Math.max(submission.step, step)} />
      {submission.moderatorFeedback ? (
        <div role="status" className="max-w-prose border-l-4 border-status-caution py-1 pl-4">
          <p className="font-medium">A moderator asked for changes</p>
          <p className="mt-1 whitespace-pre-line">{submission.moderatorFeedback}</p>
        </div>
      ) : null}
      <WizardForm
        id={id}
        step={step}
        values={values}
        ctx={{
          states,
          route: submission.route,
          duplicates: submission.duplicates,
          photos,
          maxPhotos: MAX_PHOTOS,
          attachRoute: attachRouteAction.bind(null, id),
        }}
        action={saveStepAction}
        autosave={autosaveStepAction}
      />
    </section>
  );
}
