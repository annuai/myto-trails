import type { Sql } from "postgres";

export type CountryDto = { iso2: string; name: string; slug: string; enabled: boolean; comingSoon: boolean };

const EMAIL = /^[^@\s]+@[^@\s]+$/;
const INTEREST_PER_DAY = 10;

/** Open countries first, then the ones coming soon, each alphabetical. */
export async function listCountries(sql: Sql): Promise<CountryDto[]> {
  const rows = await sql`select iso2, name, slug, enabled from public_countries order by enabled desc, name`;
  return rows.map((r) => ({ iso2: r.iso2 as string, name: r.name as string, slug: r.slug as string, enabled: r.enabled as boolean, comingSoon: !r.enabled }));
}

export type InterestResult = { ok: true } | { ok: false; reason: "invalid" | "not_found" | "already_open" | "rate_limited" };

/**
 * "Tell me when Moto Trails opens in my country." Stores the email once per country, and only to send that one message.
 * Asking twice is fine and looks the same as asking once, so nobody can probe who has signed up.
 */
export async function registerInterest(sql: Sql, i: { iso2: string; email: unknown; userId?: string | null; ipHash: string }): Promise<InterestResult> {
  const email = typeof i.email === "string" ? i.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254 || !/^[A-Za-z]{2}$/.test(i.iso2)) return { ok: false, reason: "invalid" };
  const [limit] = await sql`select rate_limit_hit(${`interest:${i.ipHash}`}, ${INTEREST_PER_DAY}, 86400) as ok`;
  if (!limit!.ok) return { ok: false, reason: "rate_limited" };
  const [country] = await sql`select id, enabled from region where kind = 'country' and iso2 = ${i.iso2.toUpperCase()}`;
  if (!country) return { ok: false, reason: "not_found" };
  if (country.enabled) return { ok: false, reason: "already_open" };
  await sql`
    insert into country_interest (country_id, email, user_id) values (${country.id}, ${email}, ${i.userId ?? null})
    on conflict (country_id, email) do nothing`;
  return { ok: true };
}
