/** How hard a repair is for someone who has not done it before. */
export type FixitDifficulty = "easy" | "moderate" | "hard";

/** A word a first-timer may not know, said in plain words. Shown on the guide that uses it. */
export type FixitTerm = { term: string; meaning: string };

export type FixitStep = {
  /** One action, in one short sentence. */
  text: string;
  /** A hazard on this step. Shown with the step. */
  warn?: string;
  /** What the rider should see or feel when the step has worked. */
  expect?: string;
  /** The picture for this step, by art id (see FixitArt). */
  art?: string;
};

/** A major part of the bike that guides are grouped under: Tyres, Brakes, Drivetrain. `cover` is the art id of its picture, or null. */
export type FixitSection = { id: string; title: string; cover: string | null };

export type FixitGuide = {
  id: string;
  /** Id of the FixitSection this guide sits under. */
  section?: string;
  /** The symptom as a rider would say it. */
  title: string;
  summary: string;
  difficulty: FixitDifficulty;
  minutes: number;
  /** Ids of FixitTool. */
  tools: string[];
  /** When to stop and get help instead. Every guide has at least two. */
  stopIf: string[];
  steps: FixitStep[];
  terms: FixitTerm[];
  /** Art id of the picture at the top of the guide. */
  hero?: string;
  /** Who checked it. null until a mechanic has really checked it: never fill this in on someone's behalf. */
  review: { by: string; on: string } | null;
};

export type FixitTool = { id: string; name: string; why: string; /** Carried on every ride, or only far from a workshop. */ kit: "base" | "remote" };

export type FixitCheckItem = { id: string; label: string; how: string; /** Guide ids to offer when it needs fixing. */ guides: string[]; /** For a check that is not a repair (papers): where to go instead. */ route?: string };

/** A picture: its widths in R2, by pixel width (as bike pictures are), and what it shows for people who cannot see it. */
export type FixitArt = { alt: string; variants: Record<string, string> };

/** Everything the app needs, in one document. `updatedAt` changes whenever any row does, so the app can tell if its copy is old. */
export type FixitContent = {
  updatedAt: string;
  tools: FixitTool[];
  checks: FixitCheckItem[];
  /** In the order to show them. Absent on a copy made before sections existed: show the guides as one list. */
  sections?: FixitSection[];
  guides: FixitGuide[];
  /** By art id, only for pictures that have been uploaded. */
  art: Record<string, FixitArt>;
};

export const FIXIT_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** An art id is the guide id, a slash, and a slot: "flat-tyre-tubeless/plug". */
/** The picture on the "What to carry" card. It belongs to no guide. */
export const FIXIT_CARRY_ART = "carry/kit";
export const FIXIT_ART_ID = /^[a-z0-9]+(-[a-z0-9]+)*\/[a-z0-9]+(-[a-z0-9]+)*$/;
/** The R2 key of one width of one picture, under the public bucket: organised by guide. */
export const fixitArtKey = (artId: string, width: number) => `fixit/${artId}-${width}.webp`;

export const guideById = (c: Pick<FixitContent, "guides">, id: string): FixitGuide | undefined => c.guides.find((g) => g.id === id);

export const guidesForCheck = (c: Pick<FixitContent, "guides">, item: FixitCheckItem): FixitGuide[] => item.guides.map((id) => guideById(c, id)).filter((g): g is FixitGuide => !!g);

/** The kit for a ride: the base kit, plus the remote extras when the ride is far from help. */
export const kitFor = (c: Pick<FixitContent, "tools">, remote: boolean): FixitTool[] => c.tools.filter((t) => remote || t.kit === "base");

export const toolsOf = (c: Pick<FixitContent, "tools">, g: FixitGuide): FixitTool[] => g.tools.map((id) => c.tools.find((t) => t.id === id)).filter((t): t is FixitTool => !!t);

/** Every art id a guide names, in reading order. */
export const artIdsOf = (c: Pick<FixitContent, "guides">): string[] => c.guides.flatMap((g) => [g.hero, ...g.steps.map((s) => s.art)]).filter((a): a is string => !!a);

/** The words of a step that a reader has to take in at once: the action, any warning and the result to look for. */
export const stepWords = (s: FixitStep): number => [s.text, s.warn, s.expect].filter(Boolean).join(" ").trim().split(/\s+/).length;

/** The longest a step's own sentence may be, so it can be read at a glance with gloves on. */
export const MAX_STEP_WORDS = 22;

/** Problems that would make a guide unsafe or hard to follow: empty when it is fine. Used by the tests and by the importer, so nothing bad reaches the database. */
export function fixitProblems(c: Pick<FixitContent, "guides" | "tools" | "checks"> & { sections?: FixitSection[] }): string[] {
  const out: string[] = [];
  const toolIds = new Set(c.tools.map((t) => t.id));
  const guideIds = new Set(c.guides.map((g) => g.id));
  if (guideIds.size !== c.guides.length) out.push("duplicate guide id");
  if (toolIds.size !== c.tools.length) out.push("duplicate tool id");
  for (const g of c.guides) {
    if (!FIXIT_ID.test(g.id)) out.push(`${g.id}: bad id`);
    if (g.stopIf.length < 2) out.push(`${g.id}: needs at least two "stop and get help" lines`);
    if (g.steps.length < 4) out.push(`${g.id}: fewer than four steps`);
    for (const t of g.tools) if (!toolIds.has(t)) out.push(`${g.id}: unknown tool ${t}`);
    g.steps.forEach((s, i) => {
      const words = s.text.trim().split(/\s+/).length;
      if (words > MAX_STEP_WORDS) out.push(`${g.id} step ${i + 1}: ${words} words, over ${MAX_STEP_WORDS}`);
      if (s.text.trim().length < 8) out.push(`${g.id} step ${i + 1}: too short`);
      if (s.art && !FIXIT_ART_ID.test(s.art)) out.push(`${g.id} step ${i + 1}: bad art id ${s.art}`);
    });
    if (g.hero && !FIXIT_ART_ID.test(g.hero)) out.push(`${g.id}: bad hero id`);
  }
  if (c.sections) {
    const sectionIds = new Set(c.sections.map((s) => s.id));
    if (sectionIds.size !== c.sections.length) out.push("duplicate section id");
    for (const s of c.sections) {
      if (!FIXIT_ID.test(s.id)) out.push(`section ${s.id}: bad id`);
      if (s.cover && !FIXIT_ART_ID.test(s.cover)) out.push(`section ${s.id}: bad cover id`);
      if (!c.guides.some((g) => g.section === s.id)) out.push(`section ${s.id}: has no guides`);
    }
    for (const g of c.guides) if (!g.section || !sectionIds.has(g.section)) out.push(`${g.id}: not in a known section`);
  }
  for (const i of c.checks) for (const id of i.guides) if (!guideIds.has(id)) out.push(`check ${i.id}: unknown guide ${id}`);
  return out;
}

/** How a check went, for the home screen. A check counts for the day it was made. */
export function fixitCheckStatus(last: { at: number; flagged: string[] } | null, now: number): "none" | "old" | "clear" | "flagged" {
  if (!last) return "none";
  const day = (t: number) => new Date(t).toDateString();
  if (day(last.at) !== day(now)) return "old";
  return last.flagged.length ? "flagged" : "clear";
}

/** A cheap shape check for content fetched from the server, so a bad edit in the database cannot break the app: it keeps the copy it has. */
export function isFixitContent(x: unknown): x is FixitContent {
  const c = x as Partial<FixitContent> | null;
  if (!c || typeof c !== "object" || !Array.isArray(c.guides) || !Array.isArray(c.tools) || !Array.isArray(c.checks) || typeof c.art !== "object" || c.art === null) return false;
  return c.guides.length > 0 && c.guides.every((g) => g && typeof g.id === "string" && typeof g.title === "string" && Array.isArray(g.steps) && g.steps.length > 0 && g.steps.every((s) => typeof s?.text === "string") && Array.isArray(g.stopIf) && g.stopIf.length > 0 && Array.isArray(g.tools) && Array.isArray(g.terms));
}

export type FixitSectionGroup = { section: FixitSection; guides: FixitGuide[] };

/**
 * The guides grouped by section, in the sections' order. A guide with no section, or one the copy does not list, goes in a last "More" group,
 * so nothing is ever hidden. Empty when the copy has no sections at all: the caller shows one flat list.
 */
export function fixitSections(c: Pick<FixitContent, "guides" | "sections">): FixitSectionGroup[] {
  if (!c.sections?.length) return [];
  const known = new Set(c.sections.map((s) => s.id));
  const groups = c.sections.map((section) => ({ section, guides: c.guides.filter((g) => g.section === section.id) })).filter((g) => g.guides.length);
  const rest = c.guides.filter((g) => !g.section || !known.has(g.section));
  return rest.length ? [...groups, { section: { id: "more", title: "More", cover: null }, guides: rest }] : groups;
}
