import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

export const inputClass = "min-h-12 w-full rounded-lg border border-foreground/40 bg-background px-3";

/** A labelled field with an optional hint and error, wired together for screen readers. */
export function Field({ label, name, hint, error, children }: { label: string; name: string; hint?: string; error?: string; children: ReactNode }) {
  const describedBy = [hint ? `${name}-hint` : null, error ? `${name}-error` : null].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, { "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })
    : children;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium">{label}</label>
      {control}
      {hint ? <p id={`${name}-hint`} className="text-sm text-muted">{hint}</p> : null}
      {error ? <p id={`${name}-error`} role="alert" className="text-sm font-medium text-status-stop">{error}</p> : null}
    </div>
  );
}

/** A group of checkboxes or radios in a fieldset. */
export function Choices({ legend, hint, error, children }: { legend: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{legend}</legend>
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      <div className="flex flex-wrap gap-x-6 gap-y-1">{children}</div>
      {error ? <p role="alert" className="text-sm font-medium text-status-stop">{error}</p> : null}
    </fieldset>
  );
}

export function Choice({ type, name, value, label, defaultChecked }: { type: "checkbox" | "radio"; name: string; value: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="inline-flex min-h-11 items-center gap-2">
      <input type={type} name={name} value={value} defaultChecked={defaultChecked} className="size-5" />
      <span>{label}</span>
    </label>
  );
}
