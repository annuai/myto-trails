"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * A submit button that shows a spinner and disables itself while its form is being sent, so people see that something
 * is happening and cannot send twice. With a name and value (several buttons in one form) only the clicked one spins.
 */
export function SubmitButton({ children, className, name, value }: { children: ReactNode; className?: string; name?: string; value?: string }) {
  const { pending, data } = useFormStatus();
  const spinning = pending && (name === undefined || data?.get(name) === value);
  return (
    <button type="submit" name={name} value={value} disabled={pending} aria-busy={pending || undefined} className={`${className ?? ""} ${pending ? "cursor-wait opacity-80" : ""}`.trim()}>
      {spinning ? (
        <svg data-testid="button-spinner" aria-hidden="true" viewBox="0 0 24 24" className="mr-2 inline-block size-4 animate-spin align-[-2px]">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : null}
      {children}
    </button>
  );
}
