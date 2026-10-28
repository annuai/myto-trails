import type { Sql } from "postgres";
import type { BikeMake, BikeMakeList, BikeModel, BikeModelPage } from "@moto-trails/domain";
import { isBikeCategory } from "./bike-catalogue";

export const BIKE_PAGE_SIZE = 48;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type BikeQuery = { q?: string; make?: string; category?: string; page?: number; all?: boolean };

/** Escapes % _ and \ so a search term is matched literally by like. */
const likeTerm = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

/** The picker's list. Only models with an image unless `all`; inactive models and makes never appear. */
export async function listBikeModels(sql: Sql, o: BikeQuery): Promise<BikeModelPage> {
  const q = (o.q ?? "").trim().slice(0, 60);
  const make = o.make && SLUG.test(o.make) ? o.make : null;
  const category = isBikeCategory(o.category) ? o.category : null;
  const page = Number.isInteger(o.page) && o.page! >= 1 ? Math.min(o.page!, 1000) : 1;
  const where = sql`m.active and mk.active
    ${o.all ? sql`` : sql`and m.image_variants <> '{}'::jsonb`}
    ${make ? sql`and mk.slug = ${make}` : sql``}
    ${category ? sql`and m.category = ${category}` : sql``}
    ${q ? sql`and (mk.name || ' ' || m.model || ' ' || coalesce(m.variant, '')) ilike ${"%" + likeTerm(q) + "%"}` : sql``}`;
  const [{ total }] = await sql`select count(*)::int as total from bike_model m join bike_make mk on mk.id = m.make_id where ${where}`;
  const rows = await sql`
    select m.id, m.slug, mk.name as make, mk.slug as make_slug, m.model, m.variant, m.category, m.engine_cc, m.year_from, m.year_to, m.image_variants
    from bike_model m join bike_make mk on mk.id = m.make_id where ${where}
    order by m.sort, mk.name, m.model, m.slug limit ${BIKE_PAGE_SIZE} offset ${(page - 1) * BIKE_PAGE_SIZE}`;
  const items: BikeModel[] = rows.map((r) => ({
    id: r.id, slug: r.slug, make: r.make, makeSlug: r.make_slug, model: r.model, variant: r.variant, category: r.category,
    engineCc: r.engine_cc, yearFrom: r.year_from, yearTo: r.year_to,
    image: Object.keys(r.image_variants ?? {}).length ? r.image_variants : null,
  }));
  return { items, page, pageSize: BIKE_PAGE_SIZE, total };
}

/** Makes with their model counts: models with an image unless `all`. Makes without any such model are left out. */
export async function listBikeMakes(sql: Sql, o: { all?: boolean } = {}): Promise<BikeMakeList> {
  const rows = await sql`
    select mk.slug, mk.name, count(m.id)::int as models
    from bike_make mk join bike_model m on m.make_id = mk.id and m.active ${o.all ? sql`` : sql`and m.image_variants <> '{}'::jsonb`}
    where mk.active group by mk.id order by mk.name`;
  return { items: rows.map((r): BikeMake => ({ slug: r.slug, name: r.name, models: r.models })) };
}
