import Link from "next/link";
import { STEPS, STEP_FIELDS, type Step } from "@/server/submissions/schema";

/** Progress through the form. Reached steps are links, so a rider can go back or jump ahead to ones already done. */
export function Stepper({ id, current, furthest }: { id: string; current: Step; furthest: number }) {
  return (
    <nav aria-label="Submission steps">
      <ol className="flex flex-wrap gap-x-6 gap-y-1">
        {STEPS.map((s) => {
          const reachable = s <= furthest;
          const label = `${s}. ${STEP_FIELDS[s]}`;
          return (
            <li key={s}>
              {s === current ? (
                <span aria-current="step" className="inline-flex min-h-11 items-center border-b-2 border-accent font-medium">{label}</span>
              ) : reachable ? (
                <Link href={`/submit/${id}/${s}`} className="inline-flex min-h-11 items-center underline underline-offset-4">{label}</Link>
              ) : (
                <span className="inline-flex min-h-11 items-center text-muted">{label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
