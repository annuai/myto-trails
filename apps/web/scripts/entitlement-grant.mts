// Gives a rider Myto Organiser for a number of months (founding clubs, support). Writes to DATABASE_URL, so point it at the right database.
// Run: npm run entitlement:grant -w @moto-trails/web -- <email> organiser <months> [--dry-run]
import { createSql } from "../src/server/db/client";
import { addMonths } from "../src/server/entitlements/decide";
import { grantEntitlement } from "../src/server/entitlements/entitlements";

const args = process.argv.slice(2).filter((a) => a !== "--");
const dryRun = args.includes("--dry-run");
const [email, kind, monthsArg] = args.filter((a) => !a.startsWith("--"));
const months = Number(monthsArg);
if (!email || kind !== "organiser" || !Number.isInteger(months) || months < 1 || months > 60) {
  console.error("usage: entitlement:grant <email> organiser <months 1-60> [--dry-run]");
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = createSql(url);
try {
  const [u] = await sql`select id from app_user where email = ${email.toLowerCase()}`;
  if (!u) throw new Error(`no rider with email ${email}`);
  const now = new Date();
  const endsAt = addMonths(now, months);
  if (dryRun) console.log(`dry run: would grant organiser to ${email} until ${endsAt.toISOString()}; nothing written`);
  else {
    const r = await grantEntitlement(sql, { userId: u.id, kind: "organiser", endsAt, now });
    if (!r.ok) throw new Error(r.reason);
    console.log(`granted organiser to ${email} until ${endsAt.toISOString()} (${r.id})`);
  }
} catch (e) {
  console.error(`grant failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
