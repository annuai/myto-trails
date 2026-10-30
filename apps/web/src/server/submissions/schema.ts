import { ACCESS_BASES, ACCESS_CLASSES, DIFFICULTIES, EVIDENCE_KINDS, HAZARDS, RESTRICTIONS, ROUTE_SHAPES, SUITABILITIES, TERRAINS, isValidSlug } from "@moto-trails/domain";
import { z } from "zod";

export const MAX_PHOTOS = 8;
const MAX_EVIDENCE = 10;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

const clean = (max: number, min = 0) => z.string().transform((s) => s.replace(CONTROL, "").trim()).pipe(z.string().min(min).max(max));
const optional = (max: number) => z.string().optional().transform((s) => s?.replace(CONTROL, "").trim() || undefined).pipe(z.string().max(max).optional());
const NO_URLS = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|in|org|net|co|io|info|app|dev)\b)/i;

const basics = z.object({
  name: clean(80, 3),
  summary: clean(400, 40).refine((s) => !NO_URLS.test(s), "Describe the trail in words, without web addresses."),
  state: z.string().refine(isValidSlug, "Choose a state."),
  /** ISO code of the state's country; absent means India, the only open country when this was added. */
  country: z.string().regex(/^[A-Za-z]{2}$/).optional(),
  district: clean(120, 1),
  nearestTown: clean(120, 1),
});

const route = z.object({
  startPoint: z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }),
  routeShape: z.enum(ROUTE_SHAPES),
});

const details = z.object({
  difficulty: z.enum(DIFFICULTIES),
  terrain: z.array(z.enum(TERRAINS)).min(1).max(TERRAINS.length),
  suitableFor: z.array(z.enum(SUITABILITIES)).max(SUITABILITIES.length).default([]),
  bestMonths: z.array(z.number().int().min(1).max(12)).max(12).default([]),
  hazards: z.array(z.enum(HAZARDS)).max(HAZARDS.length).default([]),
  seasonNotes: optional(1000),
  surfaceNotes: optional(1000),
  description: optional(5000),
});

const evidenceItem = z.object({
  kind: z.enum(EVIDENCE_KINDS),
  description: clean(500, 1),
  url: z
    .string()
    .optional()
    .transform((s) => s?.trim() || undefined)
    .pipe(z.string().max(500).refine((u) => /^https?:\/\//i.test(u) && URL.canParse(u), "Use a web address starting with http:// or https://").optional()),
});

const access = z
  .object({
    accessClass: z.enum(ACCESS_CLASSES),
    restrictions: z.array(z.enum(RESTRICTIONS)).max(RESTRICTIONS.length).default([]),
    permissionInstructions: optional(500),
    permissionContact: optional(200),
    basis: z.enum(ACCESS_BASES),
    evidence: z.array(evidenceItem).max(MAX_EVIDENCE).default([]),
  })
  .superRefine((a, ctx) => {
    if (a.accessClass !== "unknown" && a.basis === "none") ctx.addIssue({ code: "custom", path: ["basis"], message: "Say how you know this." });
    if (a.accessClass !== "unknown" && a.evidence.length === 0) ctx.addIssue({ code: "custom", path: ["evidence"], message: "Add at least one source for your access claim." });
    if (a.accessClass === "permission_required" && (a.permissionInstructions?.length ?? 0) < 10) {
      ctx.addIssue({ code: "custom", path: ["permissionInstructions"], message: "Explain how a rider gets permission." });
    }
  })
  // A contributor can only assert; verification is a moderator's decision.
  .transform((a) => ({ ...a, level: a.accessClass === "unknown" && a.basis === "none" ? ("unverified" as const) : ("community_reported" as const) }));

const photo = z.object({
  mediaId: z.uuid(),
  altText: clean(300, 1),
  caption: optional(160),
  credit: optional(120),
});
const photos = z
  .array(photo)
  .max(MAX_PHOTOS)
  .refine((p) => new Set(p.map((x) => x.mediaId)).size === p.length, "Each photo can be added once.");

const review = z.object({
  safetyNotes: optional(2000),
  contributorNote: optional(1000),
  licenceAccepted: z.literal(true, { error: "Accept the licence to submit." }),
});

const SCHEMAS = { 1: basics, 2: route, 3: details, 4: access, 5: photos, 6: review } as const;
export const STEP_KEYS = { 1: "basics", 2: "route", 3: "details", 4: "access", 5: "photos", 6: "review" } as const;
export type Step = keyof typeof SCHEMAS;
export const STEPS = [1, 2, 3, 4, 5, 6] as const;
export const STEP_FIELDS: Record<Step, string> = { 1: "Basics", 2: "Route", 3: "Terrain and difficulty", 4: "Access", 5: "Photos", 6: "Safety and review" };

export type SubmissionData = {
  basics: z.output<typeof basics>;
  route: z.output<typeof route>;
  details: z.output<typeof details>;
  access: z.output<typeof access>;
  photos: z.output<typeof photos>;
  review: z.output<typeof review>;
};

export type StepResult<S extends Step> = { ok: true; value: z.output<(typeof SCHEMAS)[S]> } | { ok: false; errors: Record<string, string> };

/** Validates one step's input. Unknown keys are dropped; errors are keyed by field and written for the rider. */
export function validateStep<S extends Step>(step: S, input: unknown): StepResult<S> {
  const parsed = SCHEMAS[step].safeParse(input ?? undefined);
  if (parsed.success) return { ok: true, value: parsed.data as z.output<(typeof SCHEMAS)[S]> };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = step === 5 ? "photos" : String(issue.path[0] ?? "form");
    errors[key] ??= issue.message === "Invalid input" || /^Invalid|^Too (small|big)|^Expected/.test(issue.message) ? "Check this field." : issue.message;
  }
  return { ok: false, errors };
}

export type ValidateAllResult = { ok: true; value: SubmissionData } | { ok: false; steps: Step[] };

/** Re-validates every step from stored draft data; nothing stored is trusted. */
export function validateAll(data: Partial<Record<keyof SubmissionData, unknown>>): ValidateAllResult {
  const value: Record<string, unknown> = {};
  const bad: Step[] = [];
  for (const step of STEPS) {
    const key = STEP_KEYS[step];
    const input = key === "photos" ? (data.photos ?? []) : data[key];
    const r = validateStep(step, input);
    if (r.ok) value[key] = r.value;
    else bad.push(step);
  }
  return bad.length === 0 ? { ok: true, value: value as SubmissionData } : { ok: false, steps: bad };
}
