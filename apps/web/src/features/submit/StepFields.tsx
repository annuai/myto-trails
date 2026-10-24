import { ACCESS_BASES, ACCESS_CLASSES, DIFFICULTIES, EVIDENCE_KINDS, HAZARDS, RESTRICTIONS, ROUTE_SHAPES, SUITABILITIES, TERRAINS } from "@moto-trails/domain";
import { RouteMap } from "@/features/map/RouteMap";
import { ElevationProfile } from "@/features/trail/ElevationProfile";
import { formatKm, monthLabel } from "@/features/trail/labels";
import type { Duplicate, RoutePreview } from "@/server/submissions/service";
import { Choice, Choices, Field, inputClass } from "./Field";
import { GpxUpload } from "./GpxUpload";
import { PhotoUpload, type PhotoRow } from "./PhotoUpload";

type Values = Record<string, unknown>;
export type StepContext = {
  states: { slug: string; name: string }[];
  route: RoutePreview | null;
  duplicates: Duplicate[];
  photos: PhotoRow[];
  maxPhotos: number;
  attachRoute: (uploadId: string) => Promise<{ ok: boolean }>;
};

const label = (v: string) => {
  const t = v.replaceAll("_", " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const str = (v: Values, k: string) => (typeof v[k] === "string" ? (v[k] as string) : typeof v[k] === "number" ? String(v[k]) : "");
const list = (v: Values, k: string): string[] => (Array.isArray(v[k]) ? (v[k] as unknown[]).map(String) : []);

const ACCESS_HELP: Record<string, string> = {
  public: "Anyone can ride it: public land or a road open to all.",
  permission_required: "You need a permit, a pass or someone's permission.",
  private_no_access: "Private land, no public access. Recorded for completeness; never published for riding.",
  restricted: "Protected or controlled area with specific rules.",
  unknown: "You aren't sure who controls it.",
};

/** The fields of each step. Values come from what the rider typed last (kept even when invalid). */
export function StepFields({ step, values, errors, ctx }: { step: number; values: Values; errors: Record<string, string>; ctx: StepContext }) {
  const e = (k: string) => errors[k];
  switch (step) {
    case 1:
      return (
        <>
          <Field label="Trail name" name="name" error={e("name")} hint="3 to 80 characters.">
            <input id="name" name="name" defaultValue={str(values, "name")} maxLength={80} className={inputClass} required />
          </Field>
          <Field label="Summary" name="summary" error={e("summary")} hint="40 to 400 characters. Describe the ride in words, without web addresses.">
            <textarea id="summary" name="summary" defaultValue={str(values, "summary")} maxLength={400} rows={4} className={`${inputClass} py-2`} required />
          </Field>
          <Field label="State or union territory" name="state" error={e("state")}>
            <select id="state" name="state" defaultValue={str(values, "state")} className={inputClass} required>
              <option value="">Choose…</option>
              {ctx.states.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="District" name="district" error={e("district")}>
            <input id="district" name="district" defaultValue={str(values, "district")} maxLength={120} className={inputClass} required />
          </Field>
          <Field label="Nearest town" name="nearestTown" error={e("nearestTown")}>
            <input id="nearestTown" name="nearestTown" defaultValue={str(values, "nearestTown")} maxLength={120} className={inputClass} required />
          </Field>
          {ctx.duplicates.length > 0 ? <DuplicateNotice duplicates={ctx.duplicates} /> : null}
        </>
      );
    case 2: {
      const sp = (values.startPoint as { lat?: number; lon?: number } | undefined) ?? undefined;
      const lat = str(values, "lat") || (sp?.lat !== undefined ? String(sp.lat) : ctx.route ? String(ctx.route.start.lat) : "");
      const lon = str(values, "lon") || (sp?.lon !== undefined ? String(sp.lon) : ctx.route ? String(ctx.route.start.lon) : "");
      return (
        <>
          <GpxUpload attach={ctx.attachRoute} attached={ctx.route !== null} />
          {ctx.route ? (
            <div className="flex flex-col gap-4">
              <p>{formatKm(ctx.route.distanceKm)}{ctx.route.elevGainM !== null ? ` · +${ctx.route.elevGainM} m climb` : ""} · {ctx.route.pointCount} points</p>
              <RouteMap line={ctx.route.line} />
              <ElevationProfile profile={ctx.route.profile} />
            </div>
          ) : null}
          {ctx.duplicates.length > 0 ? <DuplicateNotice duplicates={ctx.duplicates} /> : null}
          <Field label="Start latitude" name="lat" error={e("startPoint")} hint="Decimal degrees, for example 11.6054. Filled in from your GPX when you upload one.">
            <input id="lat" name="lat" defaultValue={lat} inputMode="decimal" className={inputClass} required />
          </Field>
          <Field label="Start longitude" name="lon" hint="For example 76.1043.">
            <input id="lon" name="lon" defaultValue={lon} inputMode="decimal" className={inputClass} required />
          </Field>
          <Field label="Route shape" name="routeShape" error={e("routeShape")}>
            <select id="routeShape" name="routeShape" defaultValue={str(values, "routeShape")} className={inputClass} required>
              <option value="">Choose…</option>
              {ROUTE_SHAPES.map((r) => <option key={r} value={r}>{label(r)}</option>)}
            </select>
          </Field>
        </>
      );
    }
    case 3:
      return (
        <>
          <Field label="Difficulty" name="difficulty" error={e("difficulty")}>
            <select id="difficulty" name="difficulty" defaultValue={str(values, "difficulty")} className={inputClass} required>
              <option value="">Choose…</option>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{label(d)}</option>)}
            </select>
          </Field>
          <Choices legend="Terrain" error={e("terrain")} hint="Choose at least one.">
            {TERRAINS.map((t) => <Choice key={t} type="checkbox" name="terrain" value={t} label={label(t)} defaultChecked={list(values, "terrain").includes(t)} />)}
          </Choices>
          <Choices legend="Suitable for" error={e("suitableFor")}>
            {SUITABILITIES.map((t) => <Choice key={t} type="checkbox" name="suitableFor" value={t} label={label(t)} defaultChecked={list(values, "suitableFor").includes(t)} />)}
          </Choices>
          <Choices legend="Best months" error={e("bestMonths")}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <Choice key={m} type="checkbox" name="bestMonths" value={String(m)} label={monthLabel(m)} defaultChecked={list(values, "bestMonths").includes(String(m))} />)}
          </Choices>
          <Choices legend="Hazards" error={e("hazards")}>
            {HAZARDS.map((h) => <Choice key={h} type="checkbox" name="hazards" value={h} label={label(h)} defaultChecked={list(values, "hazards").includes(h)} />)}
          </Choices>
          <Field label="Surface notes (optional)" name="surfaceNotes" error={e("surfaceNotes")}>
            <textarea id="surfaceNotes" name="surfaceNotes" defaultValue={str(values, "surfaceNotes")} maxLength={1000} rows={3} className={`${inputClass} py-2`} />
          </Field>
          <Field label="Season notes (optional)" name="seasonNotes" error={e("seasonNotes")}>
            <textarea id="seasonNotes" name="seasonNotes" defaultValue={str(values, "seasonNotes")} maxLength={1000} rows={3} className={`${inputClass} py-2`} />
          </Field>
          <Field label="Longer description (optional)" name="description" error={e("description")}>
            <textarea id="description" name="description" defaultValue={str(values, "description")} maxLength={5000} rows={6} className={`${inputClass} py-2`} />
          </Field>
        </>
      );
    case 4: {
      const evidence = (Array.isArray(values.evidence) ? values.evidence : []) as { kind?: string; description?: string; url?: string }[];
      return (
        <>
          <p className="max-w-prose text-muted">Who is allowed to ride here, and how do you know? A moderator checks this before anything is published. You can only share what you know; verification is theirs.</p>
          <Choices legend="Access" error={e("accessClass")}>
            <div className="flex flex-col gap-2">
              {ACCESS_CLASSES.map((c) => (
                <label key={c} className="flex min-h-11 items-start gap-2">
                  <input type="radio" name="accessClass" value={c} defaultChecked={str(values, "accessClass") === c} className="mt-1 size-5" required />
                  <span><span className="font-medium">{label(c)}</span><span className="block text-sm text-muted">{ACCESS_HELP[c]}</span></span>
                </label>
              ))}
            </div>
          </Choices>
          <Choices legend="Restrictions that apply" error={e("restrictions")}>
            {RESTRICTIONS.map((r) => <Choice key={r} type="checkbox" name="restrictions" value={r} label={label(r)} defaultChecked={list(values, "restrictions").includes(r)} />)}
          </Choices>
          <Field label="How does a rider get permission? (if required)" name="permissionInstructions" error={e("permissionInstructions")} hint="Shown publicly. For example: pass from the range office, Monday to Saturday.">
            <textarea id="permissionInstructions" name="permissionInstructions" defaultValue={str(values, "permissionInstructions")} maxLength={500} rows={3} className={`${inputClass} py-2`} />
          </Field>
          <Field label="Contact for permission (optional)" name="permissionContact" hint="Only moderators see this.">
            <input id="permissionContact" name="permissionContact" defaultValue={str(values, "permissionContact")} maxLength={200} className={inputClass} />
          </Field>
          <Field label="How do you know?" name="basis" error={e("basis")}>
            <select id="basis" name="basis" defaultValue={str(values, "basis")} className={inputClass} required>
              <option value="">Choose…</option>
              {ACCESS_BASES.map((b) => <option key={b} value={b}>{label(b)}</option>)}
            </select>
          </Field>
          <fieldset className="flex flex-col gap-4">
            <legend className="text-sm font-medium">Sources</legend>
            <p className="text-sm text-muted">Add at least one: a notice you saw, a person you spoke to, a document link. Moderators see these; the public sees only how many there are.</p>
            {e("evidence") ? <p role="alert" className="text-sm font-medium text-status-stop">{e("evidence")}</p> : null}
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid gap-3 border border-border p-3 sm:grid-cols-3">
                <Field label={`Source ${i + 1} type`} name={`evidenceKind_${i}`}>
                  <select id={`evidenceKind_${i}`} name={`evidenceKind_${i}`} defaultValue={evidence[i]?.kind ?? "other"} className={inputClass}>
                    {EVIDENCE_KINDS.map((k) => <option key={k} value={k}>{label(k)}</option>)}
                  </select>
                </Field>
                <Field label="What it shows" name={`evidenceDescription_${i}`}>
                  <input id={`evidenceDescription_${i}`} name={`evidenceDescription_${i}`} defaultValue={evidence[i]?.description ?? ""} maxLength={500} className={inputClass} />
                </Field>
                <Field label="Web address (optional)" name={`evidenceUrl_${i}`}>
                  <input id={`evidenceUrl_${i}`} name={`evidenceUrl_${i}`} defaultValue={evidence[i]?.url ?? ""} maxLength={500} inputMode="url" className={inputClass} />
                </Field>
              </div>
            ))}
          </fieldset>
        </>
      );
    }
    case 5:
      return <PhotoUpload initial={ctx.photos} errors={e("photos")} max={ctx.maxPhotos} />;
    default:
      return (
        <>
          <Field label="Safety notes (optional)" name="safetyNotes" error={e("safetyNotes")} hint="Anything a rider should know before going: water crossings, no signal, fuel.">
            <textarea id="safetyNotes" name="safetyNotes" defaultValue={str(values, "safetyNotes")} maxLength={2000} rows={5} className={`${inputClass} py-2`} />
          </Field>
          <Field label="Note to the moderator (optional)" name="contributorNote" error={e("contributorNote")}>
            <textarea id="contributorNote" name="contributorNote" defaultValue={str(values, "contributorNote")} maxLength={1000} rows={3} className={`${inputClass} py-2`} />
          </Field>
          <div className="flex flex-col gap-1">
            <label className="flex min-h-11 items-start gap-2">
              <input type="checkbox" name="licenceAccepted" defaultChecked={values.licenceAccepted === true} className="mt-1 size-5" />
              <span>I rode or have first-hand knowledge of this trail, and I agree that Moto Trails may publish what I submit and let other riders use and share it.</span>
            </label>
            {e("licenceAccepted") ? <p role="alert" className="text-sm font-medium text-status-stop">{e("licenceAccepted")}</p> : null}
          </div>
        </>
      );
  }
}

function DuplicateNotice({ duplicates }: { duplicates: Duplicate[] }) {
  return (
    <div role="status" className="border-l-4 border-status-caution py-1 pl-4">
      <p className="font-medium">This may already be on Moto Trails</p>
      <ul className="mt-1 list-disc pl-5">
        {duplicates.map((d) => (
          <li key={d.slug}>
            <a href={`/trails/${d.slug}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">{d.name}</a>
            {d.reason === "route" ? " follows the same route" : " has a similar name"}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-sm text-muted">If it is the same trail, report an update on its page instead. You can still submit yours if it is different.</p>
    </div>
  );
}
