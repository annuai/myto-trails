import type { Sql } from "postgres";

/** The published pull-down quotes in the order they are kept (ride_quote.sort, then insertion). Plain strings: the app only needs the lines. */
export async function listQuotes(sql: Sql): Promise<{ quotes: string[] }> {
  const rows = await sql`select text from ride_quote where published order by sort, id`;
  return { quotes: rows.map((r) => r.text as string) };
}
