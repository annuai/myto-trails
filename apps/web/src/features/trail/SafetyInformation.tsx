import type { Hazard } from "@moto-trails/domain";
import { hazardLabel } from "./labels";

export function SafetyInformation({ hazards, safetyNotes }: { hazards: Hazard[] | string[]; safetyNotes: string | null }) {
  if (hazards.length === 0 && !safetyNotes) return null;
  return (
    <section aria-labelledby="safety">
      <h2 id="safety" className="text-xl font-semibold">Hazards and safety</h2>
      {hazards.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
          {hazards.map((h) => (
            <li key={h}>{hazardLabel(h)}</li>
          ))}
        </ul>
      ) : null}
      {safetyNotes ? <p className="mt-4 max-w-prose">{safetyNotes}</p> : null}
    </section>
  );
}
