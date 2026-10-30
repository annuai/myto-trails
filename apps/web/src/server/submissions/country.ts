import type { Sql, TransactionSql } from "postgres";
import { countryAt, type LatLon } from "../db/boundaries";

export type OpenCountryResult =
  | { ok: true; countryId: string; iso2: string }
  | { ok: false; error: "country_not_open"; iso2: string; countryName: string; message: string }
  | { ok: false; error: "country_unknown"; message: string };

/**
 * Whether a trail starting here can be listed. A country that is not open yet is turned away with a friendly message;
 * a point in no country outline (open sea, a gap) is let through but flagged, so a moderator places it.
 */
export async function checkOpenCountry(sql: Sql | TransactionSql, start: LatLon): Promise<OpenCountryResult> {
  const hit = await countryAt(sql, start);
  if (!hit) return { ok: false, error: "country_unknown", message: "We couldn't tell which country this start point is in. A moderator will place it." };
  if (hit.enabled) return { ok: true, countryId: hit.countryId, iso2: hit.iso2 };
  const [row] = await sql`select name from region where id = ${hit.countryId}`;
  const name = (row?.name as string | undefined) ?? hit.iso2;
  return { ok: false, error: "country_not_open", iso2: hit.iso2, countryName: name, message: `Moto Trails isn't open in ${name} yet, but we plan to open there soon. You can ask to be told when it does.` };
}
