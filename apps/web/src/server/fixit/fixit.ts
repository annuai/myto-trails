import type { Sql } from "postgres";
import { fixitProblems, type FixitContent, type FixitGuide, type FixitSection } from "@moto-trails/domain";
import { FIXIT_ART_ALT } from "@moto-trails/domain/fixit-seed";

/** The widths a Fix it picture is stored at, in R2 under public/fixit/<guide>/<slot>-<width>.webp. */
export const FIXIT_ART_WIDTHS = [400, 800, 1200] as const;

const day = (d: unknown): string | null => (d instanceof Date ? d.toISOString().slice(0, 10) : typeof d === "string" ? d.slice(0, 10) : null);

/** Everything the app needs, in one document: published guides with their steps and terms, the tools, the check items and the pictures that have been uploaded. */
export async function getFixitContent(sql: Sql): Promise<FixitContent> {
  // One query, one connection: seven queries at once opened up to five pooler connections per request, and the Supabase pooler closed them.
  const [r] = await sql`
    select
      (select coalesce(json_agg(x order by x.sort, x.id), '[]'::json) from (select id, name, why, kit, sort from fixit_tool) x) as tools,
      (select coalesce(json_agg(x order by x.sort, x.id), '[]'::json) from (
        select id, title, summary, difficulty, minutes, hero, section, tools, stop_if, reviewed_by, reviewed_on::text as reviewed_on, sort from fixit_guide where published) x) as guides,
      (select coalesce(json_agg(x order by x.sort, x.id), '[]'::json) from (select id, title, cover, sort from fixit_section) x) as sections,
      (select coalesce(json_agg(x order by x.guide_id, x.position), '[]'::json) from (
        select s.guide_id, s.position, s.text, s.warn, s.expect, s.art from fixit_step s join fixit_guide g on g.id = s.guide_id where g.published) x) as steps,
      (select coalesce(json_agg(x order by x.guide_id, x.position), '[]'::json) from (
        select t.guide_id, t.position, t.term, t.meaning from fixit_term t join fixit_guide g on g.id = t.guide_id where g.published) x) as terms,
      (select coalesce(json_agg(x order by x.sort, x.id), '[]'::json) from (select id, label, how, guides, route, sort from fixit_check_item) x) as checks,
      (select coalesce(json_agg(x order by x.id), '[]'::json) from (
        select a.id, a.alt, a.variants from fixit_art a join fixit_guide g on g.id = a.guide_id where g.published and a.variants <> '{}'::jsonb) x) as art,
      greatest(
        (select max(updated_at) from fixit_tool), (select max(updated_at) from fixit_guide), (select max(updated_at) from fixit_step),
        (select max(updated_at) from fixit_term), (select max(updated_at) from fixit_check_item), (select max(updated_at) from fixit_art), (select max(updated_at) from fixit_section)) as at`;
  type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const tools = (r?.tools ?? []) as Row[];
  const guides = (r?.guides ?? []) as Row[];
  const sections = (r?.sections ?? []) as Row[];
  const steps = (r?.steps ?? []) as Row[];
  const terms = (r?.terms ?? []) as Row[];
  const checks = (r?.checks ?? []) as Row[];
  const art = (r?.art ?? []) as Row[];
  const publishedIds = new Set(guides.map((g) => g.id as string));
  return {
    updatedAt: (r?.at as Date | null)?.toISOString() ?? new Date(0).toISOString(),
    tools: tools.map((t) => ({ id: t.id, name: t.name, why: t.why, kit: t.kit })),
    sections: sections.map((s): FixitSection => ({ id: s.id, title: s.title, cover: s.cover ?? null })),
    checks: checks.map((c) => ({ id: c.id, label: c.label, how: c.how, guides: ((c.guides ?? []) as string[]).filter((g) => publishedIds.has(g)), ...(c.route ? { route: c.route } : {}) })),
    guides: guides.map((g): FixitGuide => ({
      id: g.id, title: g.title, summary: g.summary, difficulty: g.difficulty, minutes: g.minutes,
      ...(g.section ? { section: g.section } : {}), ...(g.hero ? { hero: g.hero } : {}), tools: g.tools ?? [], stopIf: g.stop_if ?? [],
      steps: steps.filter((s) => s.guide_id === g.id).map((s) => ({ text: s.text, ...(s.warn ? { warn: s.warn } : {}), ...(s.expect ? { expect: s.expect } : {}), ...(s.art ? { art: s.art } : {}) })),
      terms: terms.filter((t) => t.guide_id === g.id).map((t) => ({ term: t.term, meaning: t.meaning })),
      review: g.reviewed_by ? { by: g.reviewed_by, on: day(g.reviewed_on) ?? "" } : null,
    })),
    art: Object.fromEntries(art.map((a) => [a.id, { alt: a.alt, variants: a.variants }])),
  };
}

export type ImportResult = { sections: number; guides: number; steps: number; tools: number; checks: number; art: number; problems: string[] };

/**
 * Loads content into the database. Without `overwrite` it only adds what is missing and never touches a row that is already there, so
 * a re-run cannot undo an edit made in the database. `overwrite` replaces the guides, steps and terms named in `content`, but keeps a
 * guide's review, its published flag and its uploaded pictures.
 */
export async function importFixit(sql: Sql, content: Pick<FixitContent, "tools" | "checks" | "guides" | "sections">, opts: { overwrite?: boolean; dryRun?: boolean } = {}): Promise<ImportResult> {
  const problems = fixitProblems(content);
  const result: ImportResult = { sections: content.sections?.length ?? 0, guides: content.guides.length, steps: content.guides.reduce((n, g) => n + g.steps.length, 0), tools: content.tools.length, checks: content.checks.length, art: Object.keys(FIXIT_ART_ALT).length, problems };
  if (problems.length || opts.dryRun) return result;
  await sql.begin(async (tx) => {
    for (const [i, t] of content.tools.entries()) {
      await tx`insert into fixit_tool (id, name, why, kit, sort) values (${t.id}, ${t.name}, ${t.why}, ${t.kit}, ${i})
        on conflict (id) do ${opts.overwrite ? tx`update set name = excluded.name, why = excluded.why, kit = excluded.kit, sort = excluded.sort` : tx`nothing`}`;
    }
    for (const [i, s] of (content.sections ?? []).entries()) {
      await tx`insert into fixit_section (id, title, cover, sort) values (${s.id}, ${s.title}, ${s.cover}, ${i})
        on conflict (id) do ${opts.overwrite ? tx`update set title = excluded.title, cover = excluded.cover, sort = excluded.sort` : tx`nothing`}`;
    }
    for (const [i, g] of content.guides.entries()) {
      const [had] = await tx`select 1 as ok from fixit_guide where id = ${g.id}`;
      await tx`insert into fixit_guide (id, title, summary, difficulty, minutes, hero, section, tools, stop_if, sort)
        values (${g.id}, ${g.title}, ${g.summary}, ${g.difficulty}, ${g.minutes}, ${g.hero ?? null}, ${g.section ?? null}, ${g.tools}, ${g.stopIf}, ${i})
        on conflict (id) do ${opts.overwrite ? tx`update set title = excluded.title, summary = excluded.summary, difficulty = excluded.difficulty, minutes = excluded.minutes, hero = excluded.hero, section = excluded.section, tools = excluded.tools, stop_if = excluded.stop_if, sort = excluded.sort` : tx`nothing`}`;
      if (had && !opts.overwrite) {
        // A guide that is already there keeps its text, but is placed in a section and given a cover picture if it had none, so adding sections later never needs an overwrite.
        await tx`update fixit_guide set section = ${g.section ?? null} where id = ${g.id} and section is null`;
        await tx`update fixit_guide set hero = ${g.hero ?? null} where id = ${g.id} and hero is null`;
        continue;
      }
      await tx`delete from fixit_step where guide_id = ${g.id}`;
      await tx`delete from fixit_term where guide_id = ${g.id}`;
      for (const [n, s] of g.steps.entries()) await tx`insert into fixit_step (guide_id, position, text, warn, expect, art) values (${g.id}, ${n}, ${s.text}, ${s.warn ?? null}, ${s.expect ?? null}, ${s.art ?? null})`;
      for (const [n, t] of g.terms.entries()) await tx`insert into fixit_term (guide_id, position, term, meaning) values (${g.id}, ${n}, ${t.term}, ${t.meaning})`;
    }
    for (const [i, c] of content.checks.entries()) {
      await tx`insert into fixit_check_item (id, label, how, guides, route, sort) values (${c.id}, ${c.label}, ${c.how}, ${c.guides}, ${c.route ?? null}, ${i})
        on conflict (id) do ${opts.overwrite ? tx`update set label = excluded.label, how = excluded.how, guides = excluded.guides, route = excluded.route, sort = excluded.sort` : tx`nothing`}`;
    }
    for (const [id, alt] of Object.entries(FIXIT_ART_ALT)) {
      const guideId = id.split("/")[0]!;
      await tx`insert into fixit_art (id, guide_id, alt) values (${id}, ${guideId}, ${alt})
        on conflict (id) do ${opts.overwrite ? tx`update set alt = excluded.alt` : tx`nothing`}`;
    }
  });
  return result;
}
