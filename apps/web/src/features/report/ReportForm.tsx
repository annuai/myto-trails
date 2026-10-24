import type { ReportType } from "@moto-trails/domain";
import { SubmitButton } from "@/ui/SubmitButton/SubmitButton";

const TYPES: { value: ReportType; label: string }[] = [
  { value: "closure", label: "The trail is closed" },
  { value: "wrong_access", label: "The access information is wrong" },
  { value: "wrong_location", label: "The location or start point is wrong" },
  { value: "unsafe_info", label: "The safety information is unsafe or wrong" },
  { value: "duplicate", label: "This trail is a duplicate" },
  { value: "inaccurate_gpx", label: "The GPX route is inaccurate" },
  { value: "environmental", label: "An environmental or land-use concern" },
  { value: "other", label: "Something else" },
];

export type ReportFormErrors = { type?: string; details?: string };

export function ReportForm({
  action, slug, errors, values, message,
}: {
  action: (formData: FormData) => void | Promise<void>;
  slug: string;
  errors?: ReportFormErrors;
  values?: { type?: string; details?: string };
  message?: string;
}) {
  return (
    <form action={action} className="flex max-w-xl flex-col gap-8">
      <input type="hidden" name="slug" value={slug} />
      <fieldset aria-describedby={errors?.type ? "type-error" : undefined}>
        <legend className="text-sm font-medium">What kind of problem is it?</legend>
        <div className="mt-2 flex flex-col">
          {TYPES.map((t) => (
            <label key={t.value} className="inline-flex min-h-11 items-center gap-3">
              <input type="radio" name="type" value={t.value} defaultChecked={values?.type === t.value} className="h-5 w-5 accent-accent" />
              {t.label}
            </label>
          ))}
        </div>
        {errors?.type ? <p id="type-error" className="mt-2 text-sm font-medium text-status-stop">{errors.type}</p> : null}
      </fieldset>

      <div>
        <label htmlFor="details" className="block text-sm font-medium">What did you find?</label>
        <p id="details-hint" className="mt-1 text-sm text-muted">Say what you saw, where and when. Between 20 and 2,000 characters. Reports are reviewed by moderators.</p>
        <textarea
          id="details"
          name="details"
          required
          minLength={20}
          maxLength={2000}
          rows={6}
          defaultValue={values?.details}
          aria-invalid={errors?.details ? true : undefined}
          aria-describedby={errors?.details ? "details-hint details-error" : "details-hint"}
          className="mt-2 w-full rounded-lg border border-foreground/40 bg-background p-3"
        />
        {errors?.details ? <p id="details-error" className="mt-2 text-sm font-medium text-status-stop">{errors.details}</p> : null}
      </div>

      {message ? <p role="status" className="text-sm font-medium text-status-stop">{message}</p> : null}
      <SubmitButton className="min-h-12 self-start rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Send report</SubmitButton>
    </form>
  );
}
