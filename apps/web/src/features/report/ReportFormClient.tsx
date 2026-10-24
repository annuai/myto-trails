"use client";

import { useActionState } from "react";
import { ReportForm, type ReportFormErrors } from "./ReportForm";

export type ReportState = { errors?: ReportFormErrors; values?: { type?: string; details?: string }; message?: string };

/** Keeps what was typed when validation fails. */
export function ReportFormClient({ slug, action }: { slug: string; action: (prev: ReportState, formData: FormData) => Promise<ReportState> }) {
  const [state, formAction] = useActionState(action, {} as ReportState);
  return <ReportForm action={formAction} slug={slug} errors={state.errors} values={state.values} message={state.message} />;
}
